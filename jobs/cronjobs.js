const express = require('express');
// const Pool = require('pg-pool');
const pool = require('../config/config').pool
const moment = require('moment');
let type = require('type-of');
let fcm = require('../modules/firebase.js');
const format = require('pg-format');
let sendnotification = require('../modules/notification');
let send_mail = require('../modules/email')

const app = express();
app.set("view engine", "ejs");


async function getarray(data) {
  let data1 = `'`;
  for (let i = 0; i < data.length; i++) {
    data1 += data[i] + `','`

  }
  return data1.substring(0, data1.length - 2);
}
async function getarray2(data) {
  let data1 = [];
  for (let i = 0; i < data.length; i++) {
    data1.push(data[i]);
  }
  return data1;
}

async function recursivejob(req, res) {
  const client = await pool.connect();
  let date = new Date()
  try {
    let reccurssiveTaskResult = await client.query(`select * from  public.task_template where  is_active=true and is_delete = false and task_type='reccurssive' and next_trigger_time <= '${date.toISOString()}' and next_trigger_time IS NOT NULL`);
    if (reccurssiveTaskResult.rowCount > 0) {
      for (let i = 0; i < reccurssiveTaskResult.rows.length; i++) {
        if (reccurssiveTaskResult.rows[i].org_id == null) {

        }
        else {
          let recurring_task = reccurssiveTaskResult.rows[i]
          const dueDateDuation = moment(recurring_task.due_date_duration);
          const startDate = recurring_task.next_trigger_time.toISOString();
          const dueDate = moment(startDate).add(dueDateDuation).toISOString();
          // let due_date = new Date(recurring_task.next_trigger_time)
          // due_date.setMilliseconds(recurring_task.due_date_duration);
          let taskobj = {};
          taskobj.name = recurring_task.name;
          taskobj.description = recurring_task.description;
          taskobj.assignee_type = recurring_task.assignee_type;
          taskobj.assignee = `[${recurring_task.assignee.join(',')}]`;
          taskobj.start_date = startDate
          taskobj.due_date = dueDate
          taskobj.status = recurring_task.internal_status;
          taskobj.priority = recurring_task.internal_priority;
          taskobj.internal_status = recurring_task.internal_status;
          taskobj.internal_priority = recurring_task.internal_priority;
          taskobj.is_active = recurring_task.is_active;
          taskobj.task_type = "Live";
          taskobj.createdby = recurring_task.created_by
          taskobj.org_id = recurring_task.org_id;
          taskobj.remainder_interval = recurring_task.remainder_interval
          taskobj.next_notification = recurring_task.next_notification.toISOString()
          taskobj.created_at = recurring_task.next_trigger_time.toISOString()
          const insertTaskqueryText = `INSERT INTO public."tasks"(${Object.keys(taskobj)}) VALUES(${await getarray(Object.values(taskobj))}) RETURNING id`
          let task_result = await client.query(insertTaskqueryText);
          let data = {
            title: taskobj.name,
            assignee: recurring_task.assignee,
            message: `Reccurssive Task Created`,
            org_id: taskobj.org_id,
            target_id: task_result.rows[0].id,
            type: "task"
          }
          await sendnotification.sendGraphqlUsermessage(data);
          let updaterecurrsive = {};
          let ruleSet = recurring_task.rule_set;
          if (Array.isArray(ruleSet) && updaterecurrsive.next_trigger_time != null && updaterecurrsive.next_trigger_time != "null") {
            if (ruleSet.length == 0) {
              updaterecurrsive.next_trigger_time = null;
            }
            if (ruleSet.length > 0) {
              // console.log("updaterecurrsive----->>>>",new Date(ruleSet[0]))
              updaterecurrsive.next_trigger_time = new Date(ruleSet[0])

              ruleSet.shift();

            }
            updaterecurrsive.rule_set = ruleSet
            console.log("==-=-=--=", updaterecurrsive)
            let updatedReccurTask = updaterecurrsive.next_trigger_time.toISOString()
            console.log("updatedReccurTask", updatedReccurTask)
            let rule = `{${updaterecurrsive.rule_set.join(',')}}`;
            let task_updateRuleset = await client.query(`update  public."task_template" set next_trigger_time='${updatedReccurTask}',rule_set='${rule}' where id=${recurring_task.id}`)
          } else {
            await client.query(`update  public."task_template" set next_trigger_time=null,rule_set=null where id=${recurring_task.id}`)
          }

        }
      }
      //client.release()
      return res.json({ status: true, message: "Reccurssive job run Successfully" })
    } else {
      return res.json({ status: false, message: "No records" })
    }

  } catch (error) {
    console.log(error);
  } finally {
    client.release()
  }
}

//recursivejob()
async function scheduleLaterCronJob(req, res) {

  const client = await pool.connect();
  let date = new Date()
  let scheduleResponse = `select * from  public.tasks where task_type='Schedule' and is_delete=false and schedule_time <='${date.toISOString()}' `;
  let scheduleTaskResult = await client.query(scheduleResponse);
  try {
    if (scheduleTaskResult.rowCount > 0) {
      for (let i = 0; i < scheduleTaskResult.rowCount; i++) {
        // console.log(scheduleTaskResult.rows[i].id);
        let data = {
          title: scheduleTaskResult.rows[i].name,
          assignee: scheduleTaskResult.rows[i].assignee,
          message: `Schedule task updated to Live`,
          org_id: scheduleTaskResult.rows[i].org_id,
          target_id: scheduleTaskResult.rows[i].id,
          type: "task"
        }

        let taskTypeUpdateResult = await client.query(`update tasks set task_type='Live' where id='${scheduleTaskResult.rows[i].id}'`);
        await sendnotification.sendGraphqlUsermessage(data);
      }

    } else {
      return res.json({ message: "no scheduled tasks" })
    }
    return res.json({ status: true, message: "Schedule job run Successfully" })
  }
  catch (error) {
    console.log(error);
    //client.release()
  } finally {
    client.release()
  }

}
//scheduleLaterCronJob()
async function remaindercronjob(req, res) {
  try {
    //const pool = new Pool(config.dbconnection)
    const client = await pool.connect();

    let date = new Date();
    var tasks_list_response = await client.query(`SELECT *  FROM public."tasks" WHERE  status='open' and is_delete = false and start_date <='${date.toISOString()}' and next_notification <='${date.toISOString()}'`);
    for (let i = 0; i < tasks_list_response.rowCount; i++) {
      let data = tasks_list_response.rows[i];
      let ass = data.assignee.filter(assignee => (assignee != "null" && assignee != null));
      let remainderObj = {}
      remainderObj.task_name = data.name,
        remainderObj.task_desc = data.description,
        remainderObj.created_date = data.created_at,
        remainderObj.org_id = data.org_id,
        remainderObj.assignee = data.assignee
      if (data.assignee.length != 0 && data.assignee != null && ass.length > 0) {
        for (var j = 0; j < remainderObj.assignee.length; j++) {
          let assignee = remainderObj.assignee[j];
          // console.log("assignee*********",assignee)
          let org_id = remainderObj.org_id;
          //console.log("org_id*********",org_id)
          let users_org_response = await client.query(`SELECT *  FROM public."user_org" WHERE org_id='${org_id}' and user_id=${assignee} and is_delete=false`);
          // console.log("users_org_response[i]----", users_org_response.rows);
          if (users_org_response.rows.length > 0) {
            let userDetails = await client.query(`SELECT * FROM public."users" where id=${users_org_response.rows[0].user_id}`);
            //console.log("userDetails----------", userDetails.rows);
            let fcmtoken = await client.query(`SELECT fcm_token FROM public."fcmtoken" where user_id=${userDetails.rows[0].id}`);
            // console.log("fcmtoken---", fcmtoken.rows);
            let user_mail = null;
            let fcm_token = fcmtoken;

            user_mail = userDetails.rows[0].email
            if (user_mail != null && user_mail != "null" && user_mail != '') {

              let message = {
                'data1': remainderObj.task_name,
                'data2': data.due_date
              }
              send_mail.send_templates_mails(user_mail, "Remainder", '/templates/remainder.ejs', message, data.id)

            }
            if (fcm_token != null && fcm_token != 'undefined' && fcm_token != undefined) {
              var body2 = {
                "title": `Remainder from ${remainderObj.task_name}`,
                "message": `Remainder from ${remainderObj.task_name}`
              }
              fcm.send_fcm(body2, fcm_token, function (err, response) {
                console.log(err, response);
              });

            }
          }
          //----------------mail sending and pushnotification sending-----------------
        }
      }
      //insert remainderObj in remainderTable
      // const remainderTextQuery = `INSERT INTO public."remainders"(${Object.keys(remainderObj)}) VALUES(${await getarray(Object.values(remainderObj))}) RETURNING id`;
      // var  insertRemainderData = await client.query(remainderTextQuery);
      let reminder_interval = data.reminder_interval;
      let date = new Date();
      let update_notification = reminder_interval + date.getTime();
      update_notification = new Date(update_notification)
      //update next_notification in tasktable for particular task
      const updateTextQuery = `UPDATE public."tasks" set next_notification='${update_notification}'  where id='${data.id}'`
    }
    //client.release()
    return res.json({ status: true, message: "remainders job completed" })
  }
  catch (error) {
    console.log(error);
    //client.release()
  } finally {
    client.release()
  }
}
//remaindercronjob();

async function announcmentNotificationJob(req, res) {
  const client = await pool.connect();
  try {
    let notificationArray = [];
    let singleobj = {};
    let announcments = await client.query(`select * from public.announcement where cast(start_date as date) = cast(Now() as date) and notification_status='pending' and org_id=294`)
    //console.log("announcments--->",announcments.rows)
    if (announcments.rowCount > 0) {
      for (let i = 0; i < announcments.rowCount; i++) {
        let users = await client.query(`select us.id from public."users" us,public."user_org" ur where ur.org_id=${announcments.rows[i].org_id} and us.id=ur.user_id and ur.is_delete=false`)
        if (users.rowCount > 0) {
          for (let j = 0; j < users.rowCount; j++) {
            let notification = {
              title: announcments.rows[i].title,
              user_id: users.rows[j].id,
              message: `New Announcment ${announcments.rows[i].title}`,
              org_id: announcments.rows[i].org_id,
              target_id: announcments.rows[i].id,
              is_email: false,
              type: "announcements"
            }
            singleobj = notification;
            notificationArray.push(await getarray2(Object.values(notification)))
          }
        }
        await client.query(`update public.announcement set notification_status='done' where id=${announcments.rows[i].id}`)
      }
      if (notificationArray.length > 0) {
        const queryText = format(`INSERT INTO public."notification"(${Object.keys(singleobj)}) VALUES %L`, notificationArray)
         await client.query(queryText);
      }
      client.release()
      return res.json({ status: true, message: "announcments job completed" })

    } else {
      return res.json({ message: "No New Announments" })
    }

  } catch (error) {
    console.log(error)
    return res.json({ status: false, message: error })
  } finally {
    client.release()
  }
}

async function rewardPointsCalculationJob() {
  const client = await pool.connect();

  try {
    // Getting main tsks for 177 organization.
    const { rowCount: task_rowCount, rows: task_rows } = await client.query(`SELECT * FROM public.tasks WHERE org_id = 177 AND status = 'closed' AND parent = 0 AND is_delete = false`);

    for (let i = 0; i < task_rowCount; i++) {
      // storing assignees of main task in assignees variable.
      const assignees = task_rows[i].assignee;
      // Getting sub tasks for main task.
      const { rowCount: subtask_rowCount, rows: subtask_rows } = await client.query(`SELECT * FROM public.tasks WHERE parent = ${task_rows[i].id} AND is_delete = false AND org_id = 177`);
      if (subtask_rowCount > 0) {
        // pushing assignees of sub taks to assignees array.
        for (let j = 0; j < subtask_rowCount; j++) {
          for (const assignee of subtask_rows[j].assignee) assignees.push(assignee);

        }
      }
      // Removing duplicates from asignees array.
      const uniqueAssignees = [...new Set(assignees)];

      let category;
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const { due_date, priority, org_id, assignee_type } = task_rows[i];
      const diffInDays = moment().diff(moment(due_date), "d");

      if (diffInDays < 1) category = "beforeduedate";
      if (diffInDays === 1) category = "afterduedate";
      if (diffInDays === 2) category = "overduedate1";
      if (diffInDays === 3) category = "overduedate2";
      if (diffInDays === 4) category = "overduedate3";
      if (diffInDays === 5) category = "overduedate4";
      if (diffInDays === 6) category = "overduedate5";
      if (diffInDays >= 7) category = "overduedate6";

      for (let k = 0; k < uniqueAssignees.length; k++) {
        const { rows, rowCount } = await client.query(`SELECT * FROM public.rewards_configuration WHERE category = '${category}' AND is_enable = true AND org_id = ${org_id} AND priority = '${priority}' AND  assignee_type = '${assignee_type}'`);

        if (rowCount > 0) {
          if (uniqueAssignees[k] === task_rows[i].createdby) {
            const obj = {
              user_id: uniqueAssignees[k],
              org_id: task_rows[i].org_id,
              points: rows[0].created_by_rewards,
              task_id: task_rows[i].id,
              month,
              year,
              rewards_for: 'created_by'
            };

            await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
          }

          if (task_rows[i].assignee.includes(uniqueAssignees[k])) {
            const obj = {
              user_id: uniqueAssignees[k],
              org_id: task_rows[i].org_id,
              points: rows[0].assigneed_to_rewards,
              task_id: task_rows[i].id,
              month,
              year,
              rewards_for: 'assigneee'
            };

            await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
          }

          const query = await client.query(`select * from public.task_approvals WHERE task_id=${task_rows[i].id}`);

          if (query.rowCount > 0) {
            const list = query.rows.map((item) => item.current_user_id);
            const uniqUsers = [...new Set(list)];
            const reviewer = uniqUsers.some((item) => item === uniqueAssignees[k]);

            if (reviewer) {
              const obj = {
                user_id: uniqueAssignees[k],
                org_id: task_rows[i].org_id,
                points: rows[0].reviewed_by_rewards,
                task_id: task_rows[i].id,
                month,
                year,
                rewards_for: 'reviewer'
              };

              await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    client.release();
  }
}


module.exports.recursivejob = recursivejob;
module.exports.remaindercronjob = remaindercronjob;
module.exports.scheduleLaterCronJob = scheduleLaterCronJob;
module.exports.announcmentNotificationJob = announcmentNotificationJob;
