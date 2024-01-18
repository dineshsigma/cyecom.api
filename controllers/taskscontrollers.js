const pool = require('../config/config').pool
const type = require('type-of');
const awsmodule = require('../modules/aws')
const { getDiff } = require('json-difference');
const moment = require('moment');
const email_module = require('../modules/email')
const fs = require("fs");
const axios = require('axios');
let configuration = require('../controllers/configuration');
const format = require('pg-format');
const json2xls = require('json2xls');
let fcm = require('../modules/firebase.js');
const AWS = require('aws-sdk');
let logsService = require('../config/logservice.js')
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

function isObjectEmpty(object) {
  let isEmpty = true;
  for (keys in object) {
    isEmpty = false;
    break; // exiting since we found that the object is not empty
  }
  return isEmpty;
}

async function taskNotification(req, res) {
  const client = await pool.connect();
  try {
    let task = req.body.event.data;
    let taskObj = req.body.event.data.new;
    let taskObj_old = req.body.event.data.old;
    let user_id = task.new.createdby ? task.new.createdby : task.new.created_by//get created user of the task
    let userData = await client.query(`SELECT * from public."users" where id = ${user_id} and is_delete = false`);//getting created user data
    let org_id = taskObj.org_id;
    let notificationArray = [];
    let singleobj = {};
    let notification
    let title = taskObj.name
    let target_id = taskObj.id
    let assignee = taskObj.assignee
    let type = "task"
    if (taskObj.task_type == "Live" || taskObj_old.task_type == "Live") {
      if (task.old == null) {///if the task have no old data then it taken has a new task
        //general task creation notification------------
        for (let i = 0; i < taskObj.assignee.length; i++) {
          notification = {
            title: title,
            user_id: assignee[i],
            message: taskObj.parent ? `${userData.rows[0].name} Created a SubTask for you` : `${userData.rows[0].name} Created a Task for you`,////
            org_id: org_id,
            target_id: target_id,
            is_email: true,
            type: type
          }
          singleobj = notification;
          notificationArray.push(await getarray2(Object.values(notification)))
        }
      } else {
        //update of task
        let editedField = getDiff(req.body.event.data.old, req.body.event.data.new)
        let context;
        //finding added and removed users
        if (editedField.added.length > 0 || editedField.removed.length > 0) {
          if (editedField.added.length > 0 && editedField.added[0].length > 0 && type(editedField.added[0][1]) != 'array') {
            context = {
              "field_name": "assignee",
              "from": task.old.assignee,
              "to": task.new.assignee
            }
            //added users notification saving
            let addedUser = editedField.added[0][1]
            notification = {
              title: title,
              user_id: addedUser,
              message: taskObj.parent ? `${userData.rows[0].name} Created a SubTask for you` : `${userData.rows[0].name} Created a Task for you`,/////
              org_id: org_id,
              target_id: target_id,
              context: context,
              is_email: true,
              type: type
            }
            singleobj = notification;
            notificationArray.push(await getarray2(Object.values(notification)))
            //added message for remaining assignees notification saving
            let userDetail = await client.query(`SELECT * from public."users" where id = '${addedUser}' and is_delete = false`);
            for (let i = 0; i < taskObj.assignee.length; i++) {
              if (taskObj.assignee[i] != addedUser) {
                notification = {
                  title: title,
                  user_id: assignee[i],
                  message: `${userDetail.rows[0].name} added in the task`,
                  org_id: org_id,
                  target_id: target_id,
                  context: context,
                  is_email: false,
                  type: type
                }
                singleobj = notification;
                notificationArray.push(await getarray2(Object.values(notification)))
              }
            }
          } else if (editedField.removed.length > 0 && editedField.removed[0].length > 0 && type(editedField.removed[0][1]) != 'array') {
            //finding removed users------
            let context = {
              "field_name": "assignee",
              "from": task.old.assignee,
              "to": task.new.assignee
            }
            //removedUsers notification saving-----
            let removedUser = editedField.removed[0][1]
            notification = {
              title: title,
              user_id: editedField.removed[0][1],
              message: `${userData.rows[0].name} Removed you from the task`,
              org_id: org_id,
              target_id: target_id,
              context: context,
              is_email: true,
              type: type
            }
            singleobj = notification;
            notificationArray.push(await getarray2(Object.values(notification)))
            //removed message for remaining assignees notification saving--------
            let userDetail = await client.query(`SELECT * from public."users" where id = '${removedUser}' and is_delete = false`);
            for (let i = 0; i < taskObj_old.assignee.length; i++) {
              if (taskObj_old.assignee[i] != removedUser) {
                notification = {
                  title: taskObj_old.name,
                  user_id: assignee[i],
                  message: `${userDetail.rows[0].name} removed from task`,
                  org_id: org_id,
                  target_id: taskObj_old.id,
                  context: context,
                  is_email: false,
                  type: type
                }
                singleobj = notification;
                notificationArray.push(await getarray2(Object.values(notification)))
              }
            }

          }
          //general field update notification saving
        } else {
          context = {
            "field_name": editedField.edited[0][0],
            "from": editedField.edited[0][1],
            "to": editedField.edited[0][2]
          }
          let fieldname = context.field_name.toString()
          let fields = ["updated_on", "remainder_interval", "updated_by", "deleted_on",
            "deleted_by", "alias_user", "checklistprogress", "description", "task_code",
            "current_level", "approval_template_master_id", "rejected_users", "pending_for_acceptance", "review_attempts",
            "last_escalation3", "last_escalation2", "last_escalation1", "last_self_remainder_time",
            "current_level", "closed_date"]
          let fname = fields.some(element => fieldname.includes(element))
          if (!fname) {
            if (fieldname.includes('start_date') || fieldname.includes('due_date')) {
              context = {
                "field_name": editedField.edited[0][0],
                "from": new Date(context.from).toLocaleDateString(),
                "to": new Date(context.to).toLocaleDateString()
              }
            }
            if (fieldname.includes('assignee')) {
              let userfromData = await client.query(`SELECT * from public."users" where id = '${context.from}' and is_delete = false`);
              let usertoData = await client.query(`SELECT * from public."users" where id = '${context.to}' and is_delete = false`);
              for (let i = 0; i < taskObj.assignee.length; i++) {
                notification = {
                  title: title,
                  user_id: assignee[i],
                  message: `${userData.rows[0].name} Changed assignee from ${userfromData.rows[0].name} to ${usertoData.rows[0].name}`,
                  org_id: org_id,
                  target_id: target_id,
                  context: context,
                  is_email: true,
                  type: type
                }
                singleobj = notification;
                notificationArray.push(await getarray2(Object.values(notification)))
              }
            } else {
              if (fieldname.includes('internal_status') || fieldname.includes('status')) {
                if (context.to.includes('closed')) {
                  let taskUpdate = await client.query(`update public.tasks set closed_date='${new Date().toISOString()}' where org_id=${org_id} and id=${taskObj.id}`)
                }
              }
              if (fieldname.includes('internal_status')) {
                for (let i = 0; i < taskObj.assignee.length; i++) {
                  notification = {
                    title: title,
                    user_id: assignee[i],
                    message: `${userData.rows[0].name} Changed status from ${context.from} to ${context.to}`,
                    org_id: org_id,
                    target_id: target_id,
                    context: context,
                    is_email: true,
                    type: type
                  }
                  singleobj = notification;
                  notificationArray.push(await getarray2(Object.values(notification)))
                }
              }
              if (fieldname.includes('internal_priority')) {
                for (let i = 0; i < taskObj.assignee.length; i++) {
                  notification = {
                    title: title,
                    user_id: assignee[i],
                    message: `${userData.rows[0].name} Changed priority from ${context.from} to ${context.to}`,
                    org_id: org_id,
                    target_id: target_id,
                    context: context,
                    is_email: true,
                    type: type
                  }
                  singleobj = notification;
                  notificationArray.push(await getarray2(Object.values(notification)))
                }
              }
              for (let i = 0; i < taskObj.assignee.length; i++) {
                notification = {
                  title: title,
                  user_id: assignee[i],
                  message: `${userData.rows[0].name} Changed ${context.field_name} from ${context.from} to ${context.to}`,
                  org_id: org_id,
                  target_id: target_id,
                  context: context,
                  is_email: true,
                  type: type
                }
                singleobj = notification;
                notificationArray.push(await getarray2(Object.values(notification)))
              }
            }
          }
        }

      }
      if (notificationArray.length > 0) {
        const queryText = format(`INSERT INTO public."notification"(${Object.keys(singleobj)}) VALUES %L`, notificationArray)
        let notification_result = await client.query(queryText);
      }
    }

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function taskEmailNotification(req, res) {
  let body = req.body.event.data.new;
  let target_id = body.target_id == null ? 0 : body.target_id;
  const client = await pool.connect();
  try {
    let taskData = await client.query(`SELECT * from public."tasks" where id = ${target_id} and is_delete = false`);
    let assigneeData = await client.query(`select us.email from public."user_org" ur,public."users" us where  us.id=ur.user_id and ur.user_id = ${body.user_id} and us.is_email_valid=true and ur.is_delete = false and ur.org_id=${taskData.rows[0].org_id}`);
    let is_mail = await client.query(`SELECT * from public."notification" where user_id = ${body.user_id} and id=${body.id} and is_email = true`);
    if (assigneeData != undefined && assigneeData != "undefined" && assigneeData != null) {
      if (assigneeData.rows.length > 0 && is_mail) {
        let message = {
          'data1': taskData.rows[0].name,
          'data2': taskData.rows[0].due_date
        }
        await email_module.send_templates_mails(assigneeData.rows[0].email, "Task", "/templates/newTask.ejs", message, taskData.rows[0].id)

        return res.status(200).json({ status: true, message: "Email sent successfully" })

      }
    }
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}


async function taskPushNotification(req, res) {
  let users = req.body.event.data.new;
  let data = {
    "title": req.body.event.data.new.title,
    "message": req.body.event.data.new.message,
    "target_id": req.body.event.data.new.target_id,
    "type": req.body.event.data.new.type
  }
  let tokens = []

  const client = await pool.connect();
  try {
    let userTokendata = await client.query(`SELECT * from public."fcmtoken" where user_id ='${users.user_id}'`);

    for (let i = 0; i < userTokendata.rows.length; i++) {
      let fcmtoken = isObjectEmpty(userTokendata.rows) ? "undefined" : userTokendata.rows[i].fcm_token;
      tokens.push(fcmtoken)
    }

    let tokens2 = []

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] != "undefined") {
        tokens2.push(tokens[i])
      }
    }

    if (tokens2.length > 0) {
      fcm.send_fcm(data, tokens2, function (err, response) {
        console.log(err, response);
      });
    }

  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function assigneeTaskTransfer(req, res) {
  let tasks = req.body.input.arg1.tasks;
  let new_user_id = req.body.input.arg1.new_user_id;
  let old_user_id = req.body.input.arg1.old_user_id;
  let org_id = req.body.session_variables["x-hasura-orgid"];
  let user_id = req.body.session_variables["x-hasura-user-id"];
  const client = await pool.connect();

  try {
    for (var i = 0; i < tasks.length; i++) {
      let taskId = tasks[i]

      var TaskData = await client.query(`SELECT * from public."tasks" where id=${taskId} and status in ('open','in-progress') and is_delete=false and org_id = ${org_id}`);

      if (TaskData.rowCount > 0) {
        let Updatedarr = [new_user_id]
        if (TaskData.rowCount > 0) {
          var assigneeId = TaskData.rows[0].assignee.includes(old_user_id)
          if (assigneeId) {
            let remove = TaskData.rows[0].assignee

            let arr = remove.filter((item) => { item != old_user_id })

            if (arr.length > 0) {
              Updatedarr.push(arr)
            }
          }
        }
        let update = await client.query(`UPDATE public."tasks" SET assignee= '[${Updatedarr}]' where id=${taskId}`)

        ///////added user notification saving-------------------->>>
        ////getting userdata------->
        let userData = await client.query(`SELECT * from public."users" where id =${user_id} and is_delete = false`);
        let notificationArray = [];
        let singleobj = {};
        let title = TaskData.rows[0].name
        let target_id = TaskData.rows[0].id
        let type = "task"
        let notification
        notification = {
          title: title,
          user_id: new_user_id,
          message: TaskData.rows[0].parent ? `${userData.rows[0].name} Created a SubTask for you` : `${userData.rows[0].name} Created a Task for you`,
          org_id: org_id,
          target_id: target_id,
          context: {},
          is_email: true,
          type: type
        }
        singleobj = notification;
        notificationArray.push(await getarray2(Object.values(notification)))
        if (TaskData.rows[0].priority == 'high') {
          let removeduserData = await client.query(`SELECT * from public."users" where id = '${old_user_id}'`);
          for (let j = 0; j < TaskData.rows[0].assignee.length; j++) {
            if (TaskData.rows[0].assignee[j] != old_user_id) {
              notification = {
                title: title,
                user_id: TaskData.rows[0].assignee[j],
                message: `${removeduserData.rows[0].name} removed from task`,
                org_id: org_id,
                target_id: target_id,
                context: {},
                is_email: false,
                type: type
              }
              singleobj = notification;
              notificationArray.push(await getarray2(Object.values(notification)))
            }
          }
          //remaining users, user added notification sending------->>
          let addeduserData = await client.query(`SELECT * from public."users" where id = '${new_user_id}'`);

          for (let k = 0; k < TaskData.rows[0].assignee.length; k++) {
            if (TaskData.rows[0].assignee[k] != new_user_id) {
              notification = {
                title: title,
                user_id: TaskData.rows[0].assignee[k],
                message: `${addeduserData.rows[0].name} added in the task`,
                org_id: org_id,
                target_id: target_id,
                context: {},
                is_email: false,
                type: type
              }
              singleobj = notification;
              notificationArray.push(await getarray2(Object.values(notification)))
            }
          }

          const queryText = format(`INSERT INTO public."notification"(${Object.keys(singleobj)}) VALUES %L`, notificationArray)
          var notification_result = await client.query(queryText);

        }
      }


    }
    //client.release()
    return res.status(200).json({ status: true, message: "Tasks transfered successfully" })

  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

//task detail page approveal buttons enable and disable view-->
async function getApproveUsers(req, res) {
  let body = req.body.input.arg1
  const client = await pool.connect();
  try {
    let getData
    let taskData = await client.query(`select * from public.tasks tsk,public.approval_template_master apm where tsk.id=${body.task_id} and tsk.is_delete=false and apm.id=tsk.approval_template_master_id `)
    if (taskData.rowCount == 0) {
      return res.json({ status: false, message: "No approvals found for the task" })
    } else {
      if (taskData.rows[0].approval_category != 'parallel') {
        getData = await client.query(`select * from public.approval_template_master apm,public.approval_template apt where apm.id=${taskData.rows[0].approval_template_master_id} and apt.master_id=apm.id and apt.user_id=${body.user_id} and apt.level_in=${taskData.rows[0].current_level}`)

      } else {
        getData = await client.query(`select * from public.approval_template_master apm,public.approval_template apt where apm.id=${taskData.rows[0].approval_template_master_id} and apt.master_id=apm.id and apt.user_id=${body.user_id}`)
      }
    }

    return res.status(200).json({ data: getData.rows, response: { status: true, message: "successfully fetched" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function taskStatusUpdate(req, res) {
  let task_id = req.body.task_id;
  let approval_temp_master_id = req.body.approval_template_master_id;
  let status = req.body.status;

  const client = await pool.connect();
  try {
    if (status == 'in-review') {
      let task = await client.query(`select * from public."tasks" where id = ${task_id} and is_delete=false`)
      if (task.rowCount > 0) {
        let attempts = task.rows[0].review_attempts + 1
        let updateTask = await client.query(`update public."tasks" set status='${status}',approval_template_master_id=${approval_temp_master_id},current_level=1,review_attempts=${attempts} where id =${task_id}`)
      }
    } else {
      let updateTask = await client.query(`update public."tasks" set status='${status}' where id =${task_id}`)
    }
    return res.status(200).json({ status: true, message: "updated successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function approvalInsert(req, res) {
  let body = req.body.input.arg1[0];
  let org_id = req.body.session_variables["x-hasura-orgid"];
  const client = await pool.connect();
  let masterid = body.master_data.id
  let category = body.master_data.category
  let levels = body.master_data.levels
  let template_name = body.master_data.template_name
  let task_type = body.master_data.task_type
  let created_by = body.master_data.created_by
  let approval_type = body.master_data.approval_type
  let approval_category = body.master_data.approval_category
  try {
    await client.query('BEGIN')
    let approvalMasterObj = {}
    //if (approvalMasterObj.id && approvalMasterObj.id != 0) {
    approvalMasterObj.id = masterid
    approvalMasterObj.category = category
    approvalMasterObj.levels = levels
    approvalMasterObj.template_name = template_name
    approvalMasterObj.task_type = task_type
    approvalMasterObj.created_by = created_by
    approvalMasterObj.org_id = org_id
    approvalMasterObj.approval_type = approval_type
    approvalMasterObj.approval_category = approval_category
    // } 

    let queryText
    if (approvalMasterObj.id && approvalMasterObj.id != 0) {

      queryText = await client.query(`update public."approval_template_master" set template_name='${approvalMasterObj.template_name}',levels=${approvalMasterObj.levels} where id=${approvalMasterObj.id}`)

    } else {

      delete approvalMasterObj.id
      queryText = await client.query(`INSERT INTO public."approval_template_master"(${Object.keys(approvalMasterObj)}) VALUES(${await getarray(Object.values(approvalMasterObj))}) RETURNING id`);
    }

    for (let i = 0; i < body.levels.length; i++) {
      let approvalObj = {};
      //if (body.levels[i].id && body.levels[i].id != 0) {
      approvalObj.id = body.levels[i].id
      approvalObj.level_in = body.levels[i].level_in
      approvalObj.force_approval = body.levels[i].force_approval
      approvalObj.user_id = body.levels[i].user_id
      approvalObj.step_name = body.levels[i].step_name
      approvalObj.master_id = queryText.rows.length > 0 ? queryText.rows[0].id : approvalMasterObj.id
      //} 
      if (approvalObj.id && approvalObj.id != 0) {
        let queryText2 = await client.query(`update public."approval_template" set step_name='${approvalObj.step_name}',user_id=${approvalObj.user_id},level_in=${approvalObj.level_in},force_approval=${approvalObj.force_approval} where id=${approvalObj.id}`);
      } else {
        delete approvalObj.id
        let queryText2 = await client.query(`INSERT INTO public."approval_template"(${Object.keys(approvalObj)}) VALUES(${await getarray(Object.values(approvalObj))}) RETURNING id`);
      }

    }
    await client.query('COMMIT')
    return res.status(200).json({ data: body, response: { status: true, message: "Approval created successfully" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    await client.query('ROLLBACK')
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function myApprovedList(req, res) {
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"]
  let name = req.body.input.arg1.name
  const client = await pool.connect();
  try {
    let myApprovedTasks = await client.query(`select * from public.task_approvals tsa,public.tasks tsk where tsk.id=tsa.task_id and tsa.current_user_id=${user_id} and tsa.action_type='approve' and tsk.org_id=${orgid} and tsk.name LIKE '%${name}%' and tsk.is_delete=false order by tsk.id desc`)

    return res.status(200).json({ status: true, message: myApprovedTasks.rows })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function needtoApproveList(req, res) {
  let userid = req.body.session_variables["x-hasura-user-id"]
  let orgid = req.body.session_variables["x-hasura-orgid"]
  let name = req.body.input.arg1.name;
  const client = await pool.connect();
  try {
    let myNeedToApproveTasksseries = await client.query(`Select * from (select * from (select tsk.* from public.tasks as tsk,public.approval_template_master apm,public.approval_template apt where apm.id=tsk.approval_template_master_id 
      and apt.user_id=${userid} and tsk.name LIKE '%${name}%' and tsk.status='in-review' and tsk.is_delete=false and apt.master_id=apm.id and apm.approval_category='series' and tsk.org_id=${orgid} and tsk.current_level=apt.level_in) as tat Left join (Select tsk.id as tskid,tsk.review_attempts,tp.id as tpid from public.tasks tsk, public.task_approvals tp where tsk.status='in-review'
    and tp.review_attempts=tsk.review_attempts and tp.task_id=tsk.id and tp.current_user_id=${userid} and tsk.org_id=${orgid} and tsk.is_delete=false) as tpr ON tat.review_attempts=tpr.review_attempts and tat.id=tpr.tskid) cck where tpid is null`)

    let myNeedToApproveTasksparallel = await client.query(`select * from (select ch.*,tp.id as tpid from (select tsk.*,apt.user_id from public.tasks as tsk,public.approval_template_master apm,public.approval_template apt where apm.id=tsk.approval_template_master_id 
      and apt.user_id=${userid} and tsk.name LIKE '%${name}%' and tsk.status='in-review' and tsk.is_delete=false and apt.master_id=apm.id and apm.approval_category='parallel' and tsk.org_id=${orgid} 
      and tsk.current_level!=0 ) ch Left Join public.task_approvals tp ON tp.task_id=ch.id and tp.review_attempts=ch.review_attempts 
      and tp.current_user_id=ch.user_id) ck where tpid is null`)

    return res.status(200).json({ "data": [myNeedToApproveTasksseries.rows, myNeedToApproveTasksparallel.rows], "response": { status: true, message: "fetched successfully" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}
async function myRejectedList(req, res) {
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"]
  let name = req.body.input.arg1.name
  const client = await pool.connect();
  try {
    let myRejectedTasks = await client.query(`select * from public.task_approvals tsa,public.tasks tsk where tsk.id=tsa.task_id and  tsa.current_user_id=${user_id} and tsa.action_type='reject' and tsk.org_id=${parseInt(orgid)} and tsk.name LIKE '%${name}%' and tsk.is_delete=false order by tsk.id desc`)

    return res.status(200).json({ status: true, message: myRejectedTasks.rows })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function acceptTask(req, res) {
  let type = req.body.input.arg1.type;
  let taskid = req.body.input.arg1.taskid;
  let orgid = req.body.session_variables["x-hasura-orgid"]
  let userid = req.body.input.arg1.userid;

  const client = await pool.connect();
  try {
    let taskData = await client.query(`select * from public."tasks" where id=${taskid} and org_id=${orgid} and is_delete=false`)
    if (taskData.rowCount > 0) {
      let assignees = taskData.rows[0].assignee
      let pendingAssignees = taskData.rows[0].pending_for_acceptance;
      let rejectedusers = taskData.rows[0].rejected_users;
      let array = assignees
      let Updatedarr = []
      let update;
      let rejectedArray = rejectedusers == null || rejectedusers == 'null' ? [] : rejectedusers

      if (taskData.rowCount > 0) {
        let assigneeId = pendingAssignees.includes(userid)
        if (assigneeId) {
          let remove = pendingAssignees
          let arr = remove.filter((item) => { return item != userid })
          if (arr.length > 0) {
            Updatedarr.push(arr)
          }
        }
      }
      if (type == 'accept') {
        array.push(userid)

        update = await client.query(`update public."tasks" set assignee='[${array}]',pending_for_acceptance='[${Updatedarr}]' where id=${taskid}`)
        let updatedData = await client.query(`select * from public."tasks" where id=${taskid} and org_id=${orgid} and is_delete=false`)
        return res.status(200).json({ data: updatedData.rows, response: { status: true, message: "accepted successfully" } })
      }
      if (type == 'reject') {
        rejectedArray.push(userid)
        update = await client.query(`update public."tasks" set rejected_users='[${rejectedArray}]',pending_for_acceptance='[${Updatedarr}]' where id=${taskid}`)
        let updatedData = await client.query(`select * from public."tasks" where id=${taskid} and org_id=${orgid} and is_delete=false`)
        return res.status(200).json({ data: updatedData.rows, response: { status: true, message: "rejected successfully" } })
      }
    }
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function getApproverList(req, res) {
  let task_id = req.body.input.arg1.task_id
  const client = await pool.connect();
  try {
    let approvedListUser = await client.query(`select tsa.current_user_id,tsa.action_type,tsa.current_level,tsa.comment,tsa.created_at from public.task_approvals tsa,public.tasks tsk
      where tsk.id=tsa.task_id and tsk.id=${task_id} and tsa.review_attempts=tsk.review_attempts`)
    let readyToApproveUser = await client.query(`select apt.*,tsk.id as tskid,tsk.review_attempts from public.approval_template apt,public.tasks tsk
      where tsk.id=${task_id} and apt.master_id=tsk.approval_template_master_id  and apt.level_in not  in (select tsa.current_level from public.task_approvals tsa,public.tasks tsk
      where tsk.id=tsa.task_id and tsk.id=${task_id} and tsa.review_attempts=tsk.review_attempts)`)
    return res.status(200).json({ data: [{ "approvedListUser": approvedListUser.rows }, { "readyToApproveUser": readyToApproveUser.rows }], response: { status: true, message: "fetched successfully" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function taskApproval(req, res) {
  let task_id = req.body.input.arg1.task_id;
  let org_id = req.body.session_variables["x-hasura-orgid"];
  let userid = req.body.session_variables["x-hasura-user-id"]
  let approved_by = req.body.input.arg1.approved_by;
  let type = req.body.input.arg1.approve_type;
  let comment = req.body.input.arg1.comment;
  const client = await pool.connect();
  try {
    let category = await client.query(`select * from public."tasks" tsk,public."approval_template_master" apm where tsk.id=${task_id} and tsk.approval_template_master_id=apm.id and tsk.is_delete=false`)

    let approverData = await client.query(`select name from public."users" where id =${approved_by}`)
    //getting internalStatus
    let getInternalStatus = await client.query(`select * from public.status where org_id=${org_id}`)
    let orgid = getInternalStatus.rowCount > 0 ? org_id : 0
    let internal_status;
    let name = type == 'reject' ? 'in-progress' : 'closed'
    let status = await client.query(`select * from public.status where org_id=0 and name='${name}'`)
    if (status.rowCount > 0) {
      let internalStatus = await client.query(`select * from public.status where org_id=${orgid} and parent_id=${status.rows[0].id} and is_delete=false order by id asc`)
      internal_status = internalStatus.rows[0].name
    }
    //------------------------------------>
    if (category.rowCount > 0) {
      if (category.rows[0].approval_category != 'parallel') {
        let taskData = await client.query(`SELECT * from public."tasks" where id = ${task_id} and org_id = ${org_id} and is_delete=false`);
        let approval_temp_id = taskData.rows[0].approval_template_master_id;
        let current_level = taskData.rows[0].current_level
        let approvalData = await client.query(`SELECT * from public."approval_template_master" apm,public."approval_template" apt where apm.id = ${approval_temp_id} and apm.id=apt.master_id and apm.org_id=${org_id}`)

        for (var i = 0; i < approvalData.rowCount; i++) {
          if (approvalData.rows[i].level_in == current_level) {
            let user_ids = []
            approvalData.rows.forEach((item) => {
              user_ids.push(item.user_id)
            })
            var equalId = user_ids.includes(approved_by)
            if (equalId) {
              let approvalObj = {};
              approvalObj.task_id = taskData.rows[0].id
              approvalObj.approval_levels = approvalData.rows[i].levels
              approvalObj.current_level = current_level
              approvalObj.current_user_id = approved_by
              approvalObj.comment = comment
              approvalObj.force_approved = type == 'force' ? true : false
              approvalObj.action_type = type
              approvalObj.review_attempts = taskData.rows[0].review_attempts

              const queryText = await client.query(`INSERT INTO public."task_approvals"(${Object.keys(approvalObj)}) VALUES(${await getarray(Object.values(approvalObj))}) RETURNING id`);

              let Data = await client.query(`SELECT * from public."tasks" where id = ${task_id} and org_id = ${org_id}`);
              let update;
              let updated_level;
              if (Data.rows[0].current_level == approvalData.rows[i].levels && type == 'approve') {
                update = await client.query(`update public."tasks" set current_level=0,status='closed',internal_status='${internal_status}',closed_date='${new Date().toISOString()}' where id=${task_id}`);
              } else {
                if (type == 'reject') {
                  update = await client.query(`update public."tasks" set current_level=0,status='in-progress',internal_status='${internal_status}',approval_template_master_id=0 where id=${task_id}`);
                  return res.json({ status: false, message: "rejected successfully" })
                } else if (type == 'approve') {
                  updated_level = Data.rows[0].current_level + 1
                  let getTemplate = await client.query(`select * from public."approval_template_master" apm,public."approval_template" apt where apm.id='${approvalData.rows[i].master_id}' and apt.level_in=${updated_level} and apm.id=apt.master_id`)
                  update = await client.query(`update public."tasks" set current_level=${updated_level} where id=${task_id}`);
                }
                else if (type == 'force') {
                  update = await client.query(`update public."tasks" set current_level= 0,status='closed',internal_status='${internal_status}',closed_date='${new Date().toISOString()}' where id=${task_id}`);
                  return res.json({ status: false, message: "Force closed successfully" })
                }
              }
            } else {
              return res.status(204).json({ status: false, message: "no user found" })
            }
            return res.status(200).json({ status: true, message: "approved successfully" })

          }

        }
      }
      if (category.rows[0].approval_category != 'series') {
        let taskData = await client.query(`SELECT * from public."tasks" where id = ${task_id} and org_id = ${org_id}`);
        let approval_temp_master_id = taskData.rows[0].approval_template_master_id;
        let approvalData = await client.query(`SELECT * from public."approval_template" where master_id=${approval_temp_master_id}`)
        let Data = await client.query(`SELECT * from public."approval_template_master" where id = ${approval_temp_master_id} and org_id = ${org_id}`);
        let user_ids = []
        approvalData.rows.forEach((item) => {
          user_ids.push(item.user_id)
        })
        let userids = approvalData.rows[0].user_id
        let equalId = user_ids.includes(approved_by)
        if (equalId) {
          let approvalObj = {};
          approvalObj.task_id = taskData.rows[0].id
          approvalObj.approval_levels = Data.rows[0].levels
          approvalObj.current_level = taskData.rows[0].current_level
          approvalObj.current_user_id = approved_by
          approvalObj.comment = comment
          approvalObj.force_approved = type == 'force' ? true : false
          approvalObj.action_type = type
          approvalObj.review_attempts = taskData.rows[0].review_attempts
          const queryText = await client.query(`INSERT INTO public."task_approvals"(${Object.keys(approvalObj)}) VALUES(${await getarray(Object.values(approvalObj))}) RETURNING id`);
          let update;
          if (type == 'reject') {
            update = await client.query(`update public."tasks" set current_level=0,status='in-progress',internal_status='${internal_status}',approval_template_master_id=0 where id=${task_id}`);
            return res.json({ status: false, message: "rejected successfully" })
          } else if (type == 'approve') {
            let updated_level = taskData.rows[0].current_level + 1
            update = await client.query(`update public."tasks" set current_level=${updated_level} where id=${task_id}`);
            let getUser = await client.query(`select * from public."task_approvals" where action_type='approve' and task_id=${taskData.rows[0].id} and review_attempts=${taskData.rows[0].review_attempts}`)
            let count = getUser.rowCount
            if (count == Data.rows[0].levels) {
              update = await client.query(`update public."tasks" set current_level=0,status='closed',internal_status='${internal_status}',closed_date='${new Date().toISOString()}' where id=${task_id}`);
            }
          }
          else if (type == 'force') {
            update = await client.query(`update public."tasks" set current_level=0,status='closed',internal_status='${internal_status}',closed_date='${new Date().toISOString()}' where id=${task_id}`);
            return res.json({ status: false, message: "Force closed successfully" })
          }
        } else {
          return res.status(204).json({ status: false, message: "no user found" })
        }
        return res.status(200).json({ status: true, message: "approved successfully" })

      }
    } else {

      let approvalObj = {};
      approvalObj.task_id = task_id
      approvalObj.approval_levels = 0
      approvalObj.current_level = 0
      approvalObj.current_user_id = approved_by
      approvalObj.current_user_id = approved_by
      approvalObj.action_type = 'self'
      approvalObj.comment = comment
      const queryText = await client.query(`INSERT INTO public."task_approvals"(${Object.keys(approvalObj)}) VALUES(${await getarray(Object.values(approvalObj))}) RETURNING id`);
      if (type == 'reject') {
        update = await client.query(`update public."tasks" set status='in-progress',internal_status='${internal_status}' where id=${task_id}`);
        return res.status(200).json({ status: true, message: "rejected successfully" })

      } else if (type == 'approve') {
        update = await client.query(`update public."tasks" set status='closed',internal_status='${internal_status}',closed_date='${new Date().toISOString()}' where id=${task_id}`);
      }
      return res.status(200).json({ status: true, message: "approved successfully" })
    }


  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function taskLogs(req, res) {
  let task = req.body.event.data;
  let status = "";
  let logObj = {}
  let obj = {}
  let context;
  let userData;
  let operation = task.old ? "UPDATE" : "CREATE"
  let created_by = task.new.createdby ? task.new.createdby : task.new.created_by
  let ip_address = ""
  let taskid = task.new.id
  let orgid = task.new.org_id
  const client = await pool.connect();
  try {
    if (task.new.is_delete != true) {
      let editedField
      if (task.old != null) {
        editedField = getDiff(task.old, task.new)
        for (let k = 0; k < editedField.edited.length; k++) {
          if (editedField.edited[k][0] == 'status') {
            status = editedField.edited[k][2]
          }

        }
        if (editedField.edited.length > 0 && editedField.added.length == 0 && editedField.removed.length == 0) {
          context = {
            "field_name": editedField.edited[0][0],
            "from": editedField.edited[0][1],
            "to": editedField.edited[0][2]
          }

        }

        if (editedField.added.length > 0 || editedField.removed.length > 0) {
          if (editedField.added.length > 0) {
            if (editedField.added[0][0].includes('assignee')) {
              userData = await client.query(`SELECT * from public."users" where id = ${editedField.added[0][1]} and is_delete = false`);
              context = {
                "field_name": "assignee",
                "from": task.old.assignee,
                "to": `added ${userData.rows[0].name} in the task`
              }
            }
          } else {
            if (editedField.removed[0][0].includes('assignee')) {
              userData = await client.query(`SELECT * from public."users" where id = ${editedField.removed[0][1]} and is_delete = false`);
              context = {
                "field_name": "assignee",
                "from": task.old.assignee,
                "to": `removed ${userData.rows[0].name} from the task`
              }
            }
          }
        }
        let fieldname = context.field_name.toString()
        let fields = ["updated_on", "remainder_interval", "updated_by", "deleted_on",
          "deleted_by", "alias_user", "checklistprogress", "task_code",
          "current_level", "approval_template_master_id", "rejected_users", "pending_for_acceptance", "review_attempts",
          "last_escalation3", "last_escalation2", "last_escalation1", "last_self_remainder_time",
          "current_level"]
        let fname = fields.some(element => fieldname.includes(element))
        if (!fname) {
          if (fieldname.includes('start_date') || fieldname.includes('due_date')) {
            context = {
              "field_name": editedField.edited[0][0],
              "from": new Date(context.from).toLocaleDateString(),
              "to": new Date(context.to).toLocaleDateString()
            }
          }
          if (fieldname.includes('description')) {
            logObj = {
              operation: operation,
              created_by: created_by,
              json: task.old ? JSON.stringify([task.new, task.old]) : JSON.stringify(task.new),
              context: task.old ? JSON.stringify(context) : JSON.stringify({}),
              ip_address: ip_address,
              status: status,
              task_id: taskid,
              org_id: orgid,
              assignee: task.new ? JSON.stringify(task.new.assignee) : JSON.stringify(task.old.assignee)
            }
          }
          if (fieldname.includes('assignee')) {
            logObj = {
              operation: operation,
              created_by: created_by,
              json: task.old ? JSON.stringify([task.new, task.old]) : JSON.stringify(task.new),
              context: JSON.stringify(context),
              ip_address: ip_address,
              status: status,
              task_id: taskid,
              org_id: orgid,
              assignee: task.new ? JSON.stringify(task.new.assignee) : JSON.stringify(task.old.assignee)
            }
          }
          if (fieldname.includes('internal_status')) {
            logObj = {
              operation: operation,
              created_by: created_by,
              json: task.old ? JSON.stringify([task.new, task.old]) : JSON.stringify(task.new),
              context: JSON.stringify(context),
              ip_address: ip_address,
              status: status,
              task_id: taskid,
              org_id: orgid,
              assignee: task.new ? JSON.stringify(task.new.assignee) : JSON.stringify(task.old.assignee)
            }

          }
          if (fieldname.includes('internal_priority')) {
            logObj = {
              operation: operation,
              created_by: created_by,
              json: task.old ? JSON.stringify([task.new, task.old]) : JSON.stringify(task.new),
              context: JSON.stringify(context),
              ip_address: ip_address,
              status: status,
              task_id: taskid,
              org_id: orgid,
              assignee: task.new ? JSON.stringify(task.new.assignee) : JSON.stringify(task.old.assignee)
            }
          }
        }
      } else {
        logObj = {
          operation: operation,
          created_by: created_by,
          json: task.old ? JSON.stringify([task.new, task.old]) : JSON.stringify(task.new),
          context: task.old ? JSON.stringify(context) : JSON.stringify({}),
          ip_address: ip_address,
          status: task.new ? task.new.status : task.old.status,
          task_id: task.new ? task.new.id : task.old.id,
          org_id: task.new ? task.new.org_id : task.old.org_id,
          assignee: task.new ? JSON.stringify(task.new.assignee) : JSON.stringify(task.old.assignee)
        }
      }
      //---->>>
    } else {
      logObj = {
        operation: "DELETE",
        created_by: task.new.createdby ? task.new.createdby : task.new.created_by,
        json: JSON.stringify(task.new),
        ip_address: ip_address,
        task_id: taskid,
        org_id: orgid
      }
    }

    obj = logObj
    if (Object.keys(obj).length > 0) {
      const queryText = `INSERT INTO public."task_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
      let log_result = await client.query(queryText);
      return res.status(200).json({ status: true, message: "created successfully" })
    }

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function taskTemplateLogs(req, res) {
  let taskTemplate = req.body.event.data;
  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (taskTemplate.new.is_delete != true) {
      let context;
      if (taskTemplate.old) {
        let editedField = getDiff(taskTemplate.old, taskTemplate.new)
        if (editedField.edited.length == 0) {
          context = {
            "field_name": "assignee",
            "from": taskTemplate.old.assignee,
            "to": taskTemplate.new.assignee
          }
        } else {
          context = {
            "field_name": editedField.edited[0][0],
            "from": editedField.edited[0][1],
            "to": editedField.edited[0][2]
          }
        }

      }
      logObj = {
        operation: taskTemplate.old ? "UPDATE" : "CREATE",
        created_by: taskTemplate.new.created_by,
        json: taskTemplate.old ? JSON.stringify([taskTemplate.new, taskTemplate.old]) : JSON.stringify(taskTemplate.new),
        context: taskTemplate.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        task_id: taskTemplate.new.id,
        org_id: taskTemplate.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        created_by: taskTemplate.new.created_by,
        json: JSON.stringify(taskTemplate.new),
        ip_address: "",
        task_id: taskTemplate.new.id,
        org_id: taskTemplate.new.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."task_template_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "created successfully" })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function getChilds(locid, allids, org_id, client) {
  try {
    let getSinglelocRes = await client.query(`select id from public."locations" where parent=${locid} and org_id=${org_id} and is_delete=false`);
    if (getSinglelocRes.rowCount <= 0) {//if the manager dont have any childrens
      return locid
    } else {
      for (let i = 0; i < getSinglelocRes.rowCount; i++) {
        allids.push(getSinglelocRes.rows[i].id); //pushing the childrens in to an array
        await getChilds(getSinglelocRes.rows[i].id, allids, org_id, client);
      }
    }
  }
  catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}
async function statusCountFilter(req, res) {
  const org_id = req.body.session_variables["x-hasura-orgid"]
  const body = req.body.input.arg1;
  const assignees = body.assignee.length > 0 ? body.assignee : [parseInt(req.body.session_variables["x-hasura-user-id"])]
  let basequery = "";
  let statusData;

  const client = await pool.connect();

  if (body.locations.length > 0) {
    let locations = []
    for (let l = 0; l < body.locations.length; l++) {
      locations.push(body.locations[l])
      await getChilds(body.locations[l], locations, org_id, client)
    }
    locations = [...new Set(locations)]
    const { rows } = await client.query(`SELECT user_id FROM public.user_org WHERE location_id IN  (${locations}) AND org_id = ${org_id} AND is_delete = false`);
    rows.forEach((row) => assignees.push(row.user_id));
  }

  if (body.date != "empty" && body.date == "startdate") {
    basequery = basequery + `AND start_date BETWEEN DATE('${body.from_date}') AND DATE('${body.to_date}') `
  }
  if (body.date != "empty" && body.date == "duedate") {
    basequery = basequery + `AND due_date BETWEEN DATE('${body.from_date}') AND DATE('${body.to_date}') `
  }

  let openCount = 0;
  let closedCount = 0;
  let inprogressCount = 0;
  let inreviewCount = 0;
  let assigneeList = [...new Set(assignees)]
  try {
    if (basequery) {
      statusData = await client.query(`SELECT status, COUNT(*) FROM public.tasks WHERE org_id = ${org_id} AND assignee @> ANY ('{${assigneeList}}') AND assignee != '[]' AND is_delete = false AND is_active = true AND parent = 0 AND task_type = 'Live' ${basequery} GROUP BY status`);
    } else {
      statusData = await client.query(`SELECT status, COUNT(*) FROM public.tasks WHERE org_id =${org_id} AND assignee @> ANY('{${assigneeList}}') AND is_delete = false AND is_active = true AND parent = 0 AND task_type = 'Live' GROUP BY status`);
    }
    for (let i = 0; i < statusData.rows.length; i++) {
      if (statusData.rows[i].status == "open") {
        openCount = statusData.rows[i].count;
      }
      if (statusData.rows[i].status == "closed") {
        closedCount = statusData.rows[i].count;
      }
      if (statusData.rows[i].status == "in-progress") {
        inprogressCount = statusData.rows[i].count;
      }
      if (statusData.rows[i].status == "in-review") {
        inreviewCount = statusData.rows[i].count;
      }
    }

    res.status(200).json({ data: [{ "count": openCount, "status": "open" }, { "count": inprogressCount, "status": "in-progress" }, { "count": inreviewCount, "status": "in-review" }, { "count": closedCount, "status": "closed" }], response: { status: true, message: "fetched successfully", } });

  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  } finally {
    client.release()
  }
}
//   const client = await pool.connect()
//   try {
//     let input_id = req.body.input.arg1.input_id;
//     let org_id = req.body.session_variables["x-hasura-orgid"]
//     let allids = [input_id];
//     await getAssignees(input_id, allids, org_id, client);//getting all level childrens of the manager
//     let all = [...allids]
//     return res.json({ data: all, response: { status: true, message: "successfull" } })
//   } catch (error) {
//     logsService.log('error', req, error + "")
//   }
//   finally {
//     client.release()
//     //  client.end()
//   }


// }
async function getAllTeamIds2(req,res) {
  const client = await pool.connect()
  let orgid = req.body.session_variables["x-hasura-orgid"];
  try {
    let input_id = req.body.input.arg1.input_id;
    let org_id = orgid
    let allids = [input_id];
    await getAssignees(input_id, allids, org_id, client);//getting all level childrens of the manager
   
    let all = [...allids]
    return res.status(200).json({ data: all, response: { status: true, message: "users fetched successfully" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }

}
///DASHBOARD api Actions--->
//userdata------->
async function getAllTeamIds(id, orgid) {
  const client = await pool.connect()
  try {
    let input_id = id;
    let org_id = orgid
    let allids = [input_id];
    await getAssignees(input_id, allids, org_id, client);//getting all level childrens of the manager
    let all = [...allids]
   
    // client.release()
    return all
  } catch (error) {
    console.log(error)
    // logsService.log('error', req, error + "")
    // return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }

}

async function getAccesBasedUserData(req, res) {
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"];
  let body = req.body.input.arg1

  let name = body.name;
  let limit = body.limit
  let offset = body.offset;

  let query;
  const client = await pool.connect();
  try {
    let roleid = await client.query(`select role_id from public.user_org where user_id=${user_id} and org_id=${orgid} and is_delete=false`)
    let ids = await getAllTeamIds(parseInt(user_id), orgid)

    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : orgid

    let getPermissionsQuery = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`)
    let { rowCount, rows } = getPermissionsQuery

    let userData = []
    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == 'users') {
        userData.push(rows[i])
      }
    }

    let access = userData[0].role_access

    if (access == 'me') {
      query = await client.query(`select * from public.user_org ur,public.users us where (us.name LIKE '%${name}%' or us.lastname LIKE '%${name}%') and ur.user_id=${user_id} and ur.user_id=us.id and ur.is_delete=false limit ${limit} offset ${offset}`)
    }
    if (access == 'me+childs') {

      query = await client.query(`select * from public.users us,public.user_org ur where (us.name LIKE '%${name}%' or us.lastname LIKE '%${name}%') and us.id in (${ids}) and ur.is_delete=false and ur.user_id=us.id and ur.org_id=${orgid} limit ${limit} offset ${offset}`)
    }
    if (access == 'organization') {

      query = await client.query(`select * from public.users us,public.user_org ur where (us.name LIKE '%${name}%' or us.lastname LIKE '%${name}%') and ur.org_id=${orgid} and ur.is_delete=false and ur.user_id=us.id limit ${limit} offset ${offset}`)
    }

    console.log("query.rows", query.rows);

    return res.status(200).json({ data: query.rows, response: { status: true, message: "users fetched successfully" } })

  } catch (error) {
    console.log("error--", error);
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  } finally {
    client.release()
  }
}
//departments Child DATA for TASK FILTER--->
async function getDepChilds(depid, allids, org_id, client) {
  try {
    let getSingledepRes = await client.query(`select id from public."department" where parent=${depid} and org_id=${org_id} and is_delete=false`);
    if (getSingledepRes.rowCount <= 0) {//if the manager dont have any childrens
      return depid
    } else {
      for (let i = 0; i < getSingledepRes.rowCount; i++) {
        allids.push(getSingledepRes.rows[i].id); //pushing the childrens in to an array
        await getChilds(getSingledepRes.rows[i].id, allids, org_id, client);
      }
    }
  }
  catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}

async function getAssignees(managerid, allids, org_id, client) {
  try {

    let getSingleUserRes = await client.query(`select user_id from public."user_org" where reporting_manager=${managerid} and org_id=${org_id} and is_delete=false`);
    if (getSingleUserRes.rowCount <= 0) {//if the manager dont have any childrens
      return managerid
    } else {
      for (let i = 0; i < getSingleUserRes.rowCount; i++) {
        allids.push(getSingleUserRes.rows[i].user_id); //pushing the childrens in to an array
        
        let id = await getAssignees(getSingleUserRes.rows[i].user_id, allids, org_id, client);
      }
    }
  }
  catch (error) {
    console.log(error)
    // logsService.log('error', req, error + "")
    // return res.status(500).json({ status: false, message: error })
  }
}

async function taskFilter(req, res) {//rolemgmt-wise
  var org_id = req.body.session_variables["x-hasura-orgid"]
  let user_id = req.body.session_variables["x-hasura-user-id"];
  var body = req.body.input.arg1;
  const client = await pool.connect();
  try {
    let taskQuery;
    let basequery = '';
    let assignee = ''
    let closed = ''
    let user = []

    if (body.status.length > 0) {
      basequery = basequery + `and internal_status in (${await getarray(body.status)}) `
    }
    if (body.priority.length > 0) {
      basequery = basequery + `and internal_priority in (${await getarray(body.priority)}) `
    }
    if (body.department.length > 0) {
      let depUserList = await client.query(`select user_id from public.user_org where department_id in (${body.department}) and org_id=${org_id} and is_delete=false`)
      depUserList.rows.forEach((item) => user.push(item.user_id))
    }
    if (body.location.length > 0) {
      let usersList = await client.query(`select user_id from public.user_org where location_id in (${body.location}) and org_id=${org_id} and is_delete=false`)
      usersList.rows.forEach((item) => user.push(item.user_id))
    }
    if (body.date != "empty" && body.date == "startdate") {
      basequery = basequery + `and start_date BETWEEN DATE('${body.from_date}') AND DATE('${body.to_date}') `
    }
    if (body.date != "empty" && body.date == "duedate") {
      basequery = basequery + `and due_date BETWEEN DATE('${body.from_date}') AND DATE('${body.to_date}') `
    }
    if (body.team_tasks.length > 0) {
      user.push(...body.team_tasks);
      assignee = `assignee @> ANY ('{${user}}') and assignee!='[]'`
    } else {
      user.push(...JSON.parse(body.assignee))
      assignee = `assignee @> '[${user}]' and assignee!='[]'`
    }
    if (body.is_closed == true) {
      closed = closed + ` (status = 'closed' or status != 'closed') `
    } else {
      closed = closed + ` status != 'closed' `
    }
    //console.log("basequeryyy",basequery)
    ///role Access--------------------------------->>>>
    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${org_id} and is_delete=false`)
    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : org_id

    let getPermissionsQuery = await client.query(`select * from public.task_permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`)
    let { rowCount, rows } = getPermissionsQuery
    ///Accesses--->
    let dep_access = rows[0].department_access
    let loc_access = rows[0].location_access
    let ass_access = rows[0].assignee_access
    //organization wise data--->
    let depData = await client.query(`select id from public.department where org_id=${org_id} and is_delete=false`)
    let locData = await client.query(`select id from public.locations where org_id=${org_id} and is_delete=false`)
    let assData = await client.query(`select user_id from public.user_org where org_id=${org_id} and is_delete=false`)

    let depids = [roleid.rows[0].department_id];
    let locids = [roleid.rows[0].location_id];
    let assids = [roleid.rows[0].user_id];

    //permission as role_access wise-->
    dep_access == 'me' ? depids.push(roleid.rows[0].department_id) : dep_access == 'me+childs' ? await getDepChilds(roleid.rows[0].department_id, depids, org_id, client) : depData.rows.map((id) => depids.push(id.id))
    loc_access == 'me' ? locids.push(roleid.rows[0].location_id) : loc_access == 'me+childs' ? await getChilds(roleid.rows[0].location_id, locids, org_id, client) : locData.rows.map((id) => locids.push(id.id))
    ass_access == 'me' ? assids.push(roleid.rows[0].user_id) : ass_access == 'me+childs' ? assids = await getAllTeamIds(parseInt(user_id), org_id) : assData.rows.map((id) => assids.push(id.user_id))

    depids = [...new Set(depids)]
    locids = [...new Set(locids)]
    assids = [...new Set(assids)]

    let allIds2 = []
    let allIds = await client.query(`select * from public.user_org where (department_id in (${depids}) or user_id in (${assids}) or location_id in (${locids})) and is_delete=false`)

    allIds.rows.forEach((item) => {
      allIds2.push(item.user_id)
    })
    if (basequery || user.length > 0) {
      taskQuery = await client.query(`select * from public.tasks where name LIKE '%${body.name}%' and` + closed + `and parent = 0 and task_type = 'Live' and is_delete=false and ` + assignee + basequery + `and org_id=${org_id} order by id desc limit ${body.limit} offset ${body.offset}`)
    } else {
      taskQuery = await client.query(`select * from public.tasks where name LIKE '%${body.name}%' and` + closed + `and parent = 0 and task_type = 'Live' and is_delete=false and assignee @> ANY ('{${allIds2}}') and assignee!='[]' and org_id=${org_id} order by id desc limit ${body.limit} offset ${body.offset}`)
    }

    return res.status(200).json({ data: taskQuery.rows, response: { status: true, message: "successfull" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function dueDateFilter(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  const client = await pool.connect();

  try {
    currentDate = new Date();
    let date = new Date();
    date.setDate(date.getDate() + 3);
    let dueDateData = await client.query(`select count(*) from public.tasks where due_date between '${currentDate.toISOString()}' and '${date.toISOString()}' and org_id = ${org_id} and is_delete=false and is_active=true`);

    return res.status(200).json({ status: true, message: "fetched successfully", data: dueDateData.rows })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

//locationsData----------->
async function getChilds(locid, allids, org_id, client) {
  try {
    let getSinglelocRes = await client.query(`select id from public."locations" where parent=${locid} and org_id=${org_id} and is_delete=false`);
    if (getSinglelocRes.rowCount <= 0) {//if the manager dont have any childrens
      return locid
    } else {
      for (let i = 0; i < getSinglelocRes.rowCount; i++) {
        allids.push(getSinglelocRes.rows[i].id); //pushing the childrens in to an array
        await getChilds(getSinglelocRes.rows[i].id, allids, org_id, client);
      }
    }
  }
  catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}
async function getAccesBasedLocationData(req, res) {

  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"];
  let query;

  let body = req.body.input.arg1
  let name = body.name;
  let limit = body.limit
  let offset = body.offset;

  const client = await pool.connect();
  try {
    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${orgid} and is_delete=false`);
    const locationid = roleid.rows[0].location_id
    let ids = [locationid]
    await getChilds(locationid, ids, orgid, client);
    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : orgid

    let { rowCount, rows } = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`);
    let locationData = [];
    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == "locations") {
        locationData.push(rows[i]);
      }
    }
    let access = locationData[0].role_access;
    if (access == "me") {
      query = await client.query(`select * from public.locations where name LIKE '%${name}%' and id=${locationid} and is_delete=false and org_id=${orgid} limit ${limit} offset ${offset}`);
    }
    if (access == "me+childs") {

      query = await client.query(`select * from public.locations where name LIKE '%${name}%' and id in (${ids}) and is_delete=false and org_id=${orgid} limit ${limit} offset ${offset}`);
    }
    if (access == "organization") {
      query = await client.query(`select * from public.locations where name LIKE '%${name}%' and org_id=${orgid} and is_delete=false limit ${limit} offset ${offset}`);
    }

    return res.status(200).json({ data: query.rows, response: { status: true, message: "locations fetched successfully" } });
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  } finally {
    client.release();
  }
}

//overdue high prioroty taskss--->High Priority Tasks dashboard
async function getHighPriorityTasks(req, res) {
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"];
  let query;
  const client = await pool.connect();
  try {
    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${orgid} and is_delete=false`);
    let ids = await getAllTeamIds(parseInt(user_id), orgid)

    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : orgid

    let { rowCount, rows } = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`);
    let userData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == "users") {
        userData.push(rows[i]);
      }
    }

    let access = userData[0].role_access;
    if (access == "me") {

      query = await client.query(`select * from public.tasks where priority='high' and assignee @>'[${user_id}]' and assignee !='[]' and status!='closed' and task_type='Live' and is_delete=false and parent=0 and org_id=${orgid} order by due_date asc`);
    }
    if (access == "me+childs") {

      query = await client.query(`select * from public.tasks where priority='high' and assignee @> ANY('{${ids}}') and assignee !='[]' and status!='closed' and task_type='Live' and is_delete=false and parent=0 and org_id=${orgid} order by due_date asc`);
    }
    if (access == "organization") {
      query = await client.query(`select * from public.tasks where priority='high' and org_id=${orgid} and assignee !='[]' and status!='closed' and task_type='Live' and is_delete=false and parent=0 order by due_date asc`);
    }

    return res.status(200).json({ data: query.rows, response: { status: true, message: "tasks fetched successfully" } });
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}

//dropdowns--------->
async function getGroupsDropdown(req, res) {//(groups dropdown)
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let orgid = req.body.session_variables["x-hasura-orgid"];
  let query;
  const client = await pool.connect();
  try {
    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${orgid} and is_delete=false`);
    let ids = await getAllTeamIds(user_id, orgid)

    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : orgid

    let { rowCount, rows } = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`);
    let taskData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == "users") {
        taskData.push(rows[i]);
      }
    }

    let access = taskData[0].role_access;
    if (access == "me") {
      query = await client.query(`select * from public."groups" where group_members @> '[${user_id}]' and org_id=${orgid} and is_delete=false`);
    }
    if (access == "me+childs") {
      query = await client.query(`select * from public."groups" where group_members @> ANY('{${ids}}') and org_id=${orgid} and is_delete=false`);
    }
    if (access == "organization") {
      query = await client.query(`select * from public."groups" where org_id=${orgid} and is_delete=false`);
    }

    return res.status(200).json({ data: query.rows, response: { status: true, message: "successfull" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}

async function TaskProgresscalculation(req, res) {
  let taskid;
  if (!req.body.event.data.new.parent && !req.body.event.data.new.task_id) {
    taskid = req.body.event.data.new.id
  }
  if (req.body.event.data.new.parent) {
    taskid = req.body.event.data.new.parent
  }
  if (req.body.event.data.new.task_id) {
    taskid = req.body.event.data.new.task_id
  }
  let checklistprogress;
  const client = await pool.connect();
  try {
    let getTasks = `select * from public.tasks where id='${taskid}' and is_active = true and is_delete = false`;
    var taskresult = await client.query(getTasks);
    if (taskresult.rows[0].status != "closed") {
      //get checklist by task_id
      let Checklistquery = `select count(case when is_done=true then id end) as truecount, count(case when is_done=false then id end) as falsecount from public.checklist where task_id='${taskid}'`;
      let checklistresult = await client.query(Checklistquery);
      let totalchecklistcount = parseInt(checklistresult.rows[0].truecount) + parseInt(checklistresult.rows[0].falsecount);
      if (totalchecklistcount > 0) {
        let checklist_isdone_count = parseInt(checklistresult.rows[0].truecount);
        //get subtask with status closed
        let taskSubTaskClosedquery = `select count(case when status='closed' then id end) as closedcount, count(case when status!='closed' then id end) as notclosedcount from tasks where parent=${taskid}`;
        let completed_sub_task_response = await client.query(taskSubTaskClosedquery);
        let completed_subtask_count = parseInt(completed_sub_task_response.rows[0].closedcount)
        let totalsubtask_count = parseInt(completed_sub_task_response.rows[0].closedcount) + parseInt(completed_sub_task_response.rows[0].notclosedcount);

        totalchecklistcount += totalsubtask_count;
        checklist_isdone_count += completed_subtask_count;
        let checklist_percentage = (checklist_isdone_count / totalchecklistcount) * 100;
        checklistprogress = parseInt(checklist_percentage);

        let updatechecklistquery = `update tasks set checklistprogress='${checklistprogress}' where id=${taskid}`;
        var updateChecklistcalculation = await client.query(updatechecklistquery);

      }
      else {
        checklistprogress = 0;
        let updatechecklistquery = `update tasks set checklistprogress='${checklistprogress}' where id=${taskid}`;
        let updateChecklistresultWithZero = await client.query(updatechecklistquery);
      }

    }
    else {
      checklistprogress = 100;
      //update query
      let updateProgress = `update tasks set checklistprogress='${checklistprogress}' where id=${taskid}`;
      let updateChecklistresult = await client.query(updateProgress);
    }
    return res.status(200).json({ status: true, message: "calculated task progress", checklistprogress: checklistprogress })

  }
  catch (error) {
    logsService.log('error', req, error + "");
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function locationLogs(req, res) {
  let location = req.body.event.data;
  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (location.new.is_delete != true) {
      let context;
      if (location.old) {
        let editedField = getDiff(location.old, location.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: location.old ? "UPDATE" : "CREATE",
        json: location.old ? JSON.stringify([location.new, location.old]) : JSON.stringify(location.new),
        context: location.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: location.new.created_by,
        org_id: location.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(location.new),
        ip_address: "",
        created_by: location.new.created_by,
        org_id: location.new.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."location_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    var log_result = await client.query(queryText);

    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function departmentLogs(req, res) {
  let department = req.body.event.data;
  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (department.new.is_delete != true) {
      let context;
      if (department.old) {
        let editedField = getDiff(department.old, department.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: department.old ? "UPDATE" : "CREATE",
        json: department.old ? JSON.stringify([department.new, department.old]) : JSON.stringify(department.new),
        context: department.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: department.new.created_by,
        org_id: department.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(department.new),
        ip_address: "",
        created_by: department.new.created_by,
        org_id: department.new.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."department_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);

    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function designationLogs(req, res) {
  let designation = req.body.event.data;

  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (designation.new.is_delete != true) {
      let context;
      if (designation.old) {
        let editedField = getDiff(designation.old, designation.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: designation.old ? "UPDATE" : "CREATE",
        json: designation.old ? JSON.stringify([designation.new, designation.old]) : JSON.stringify(designation.new),
        context: designation.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: designation.new.created_by,
        org_id: designation.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(designation.new),
        ip_address: "",
        created_by: designation.new.created_by,
        org_id: designation.new.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."designation_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function deleteAttachment(req, res) {
  let attachment = req.body.event.data;
  let folderpath = attachment.old.folderpath
  let filename = attachment.old.filename

  let credentials = {
    accessKeyId: "AKIASTAEMZYQ3D75TOOZ",
    secretAccessKey: "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",
    region: "ap-south-1"
  };
  let s3 = new AWS.S3(credentials);
  let params = {
    Bucket: 'happimobiles',
    Key: `test-images-v1/${folderpath}/${filename}`
  };
  s3.deleteObject(params, function (err, data) {
    if (err) {
      console.log("error", err)
      return err
    } else {
      return res.status(200).json({ status: true, message: "Attachment deleted successfully" })
    }
  })
  return
}

async function commentLogs(req, res) {
  let comment = req.body.event.data;
  let logObj = {}
  let obj = {}
  let taskCmntLogObj
  const client = await pool.connect();
  try {
    let getusername = await client.query(`select name from public.users where id = ${comment.new.user_id}`)
    let name = getusername.rows[0].name
    if (comment.new.is_delete != true) {
      let context;
      if (comment.old) {
        let editedField = getDiff(comment.old, comment.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: comment.old ? "UPDATE" : "CREATE",
        json: comment.old ? JSON.stringify([comment.new, comment.old]) : JSON.stringify(comment.new),
        context: comment.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: comment.new.created_by,
      }

      taskCmntLogObj = {
        operation: "COMMENT-CREATE",
        created_by: comment.new.created_by,
        json: comment.old ? JSON.stringify([comment.new, comment.old]) : JSON.stringify(comment.new),
        context: JSON.stringify({ 'message': `${name} added a comment` }),
        ip_address: "",
        status: "",
        task_id: comment.old ? comment.old.task_id : comment.new.task_id,
        org_id: 0,
        assignee: "[]"
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(comment.new),
        ip_address: "",
        created_by: comment.new.created_by
      }
      taskCmntLogObj = {
        operation: "COMMENT-DELETE",
        created_by: comment.new.created_by,
        json: comment.old ? JSON.stringify([comment.new, comment.old]) : JSON.stringify(comment.new),
        context: JSON.stringify({ 'message': `${name} deleted a comment` }),
        ip_address: "",
        status: "",
        task_id: comment.old ? comment.old.task_id : comment.new.task_id,
        org_id: 0,
        assignee: "[]"
      }
    }
    obj = logObj
    const queryText = await client.query(`INSERT INTO public."comment_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`)

    const taskqueryText = await client.query(`INSERT INTO public."task_logs"(${Object.keys(taskCmntLogObj)}) VALUES(${await getarray(Object.values(taskCmntLogObj))}) RETURNING id`)
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    //client.release()
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function checklistLogs(req, res) {
  let checklist = req.body.event.data;

  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (checklist.new.is_delete != true) {
      let context;
      if (checklist.old) {
        let editedField = getDiff(checklist.old, checklist.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: checklist.old ? "UPDATE" : "CREATE",
        json: checklist.old ? JSON.stringify([checklist.new, checklist.old]) : JSON.stringify(checklist.new),
        context: checklist.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: checklist.new.created_by
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(checklist.new),
        ip_address: "",
        created_by: checklist.new.created_by,
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."checklist_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function attachmentLogs(req, res) {
  let attachment = req.body.event.data;
  let logObj = {}
  let obj = {}

  const client = await pool.connect();
  try {

    logObj = {
      operation: attachment.new ? "CREATE" : "DELETE",
      json: attachment.new ? JSON.stringify(attachment.new) : JSON.stringify(attachment.old),
      ip_address: "",
      created_by: attachment.new ? attachment.new.created_by : attachment.old.created_by,
      org_id: attachment.new ? attachment.new.org_id : attachment.old.org_id
    }
    obj = logObj
    const queryText = `INSERT INTO public."attachment_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    //client.release()
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function ticketLogs(req, res) {
  let ticket = req.body.event.data;
  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (ticket.new.is_delete != true) {
      let context;
      if (ticket.old) {
        let editedField = getDiff(ticket.old, ticket.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: ticket.old ? "UPDATE" : "CREATE",
        json: ticket.old ? JSON.stringify([ticket.new, ticket.old]) : JSON.stringify(ticket.new),
        context: ticket.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: ticket.new.created_by,
        org_id: ticket.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        json: JSON.stringify(ticket.new),
        ip_address: "",
        created_by: ticket.new.created_by,
        org_id: ticket.new.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."ticket_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    //client.release()
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function groupLogs(req, res) {
  var group = req.body.event.data;
  var logObj = {}
  var obj = {}
  const client = await pool.connect();
  try {
    if (group.new.is_delete != true) {
      var context;
      if (group.old) {
        let editedField = getDiff(group.old, group.new)
        if (editedField.edited.length == 0) {
          context = {
            "field_name": "group_members",
            "from": group.old.group_members,
            "to": group.new.group_members
          }

        } else {
          context = {
            "field_name": editedField.edited[0][0],
            "from": editedField.edited[0][1],
            "to": editedField.edited[0][2]
          }
        }
      }
      logObj = {
        operation: group.old ? "UPDATE" : "CREATE",
        created_by: group.new.createdby ? group.new.createdby : group.new.created_by,
        json: group.old ? JSON.stringify([group.new, group.old]) : JSON.stringify(group.new),
        context: group.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        org_id: group.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        created_by: group.new.createdby ? group.new.createdby : group.new.created_by,
        json: JSON.stringify(group.new),
        ip_address: "",
        org_id: group.new.org_id
      }
    }
    obj = logObj

    const queryText = `INSERT INTO public."group_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    var log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "created successfully" })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }

}

async function getGroupTaskCountFilter(req, res) {//role-mgmt-wise
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let user_id = req.body.session_variables["x-hasura-user-id"];
  var body = req.body.input.arg1;
  let name = body.title.toLowerCase();
  name = name.trim();
  name = name.replace(/ /g, "")
  let query1;
  const client = await pool.connect();
  try {

    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${org_id} and is_delete=false`);
    let ids = await getAllTeamIds(parseInt(user_id), org_id)
    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : org_id

    let { rowCount, rows } = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`);
    let taskData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == "users") {
        taskData.push(rows[i]);
      }
    }
    let access = taskData[0].role_access;
    if (access == "me") {
      query1 = await client.query(`select * from public.groups where org_id=${org_id} and group_members @>'[${user_id}]' and title LIKE '%%' and is_delete=false limit ${body.limit} offset ${body.offset}`);
    }
    if (access == "me+childs") {
      query1 = await client.query(`select * from public.groups where org_id=${org_id} and group_members @>'[${ids}]' and title LIKE '%%' and is_delete=false limit ${body.limit} offset ${body.offset}`);
    }
    if (access == "organization") {
      query1 = await client.query(`select * from public.groups where org_id=${org_id} and title LIKE '%%' and is_delete=false limit ${body.limit} offset ${body.offset}`);
    }
    let data = []
    for (let i = 0; i < query1.rowCount; i++) {
      let query2 = await client.query(`SELECT status,count(*) from public."tasks" WHERE assignee= '[${query1.rows[i].group_members}]' and org_id =${org_id} group by status`)
      data.push({ "counts": query2.rows, "group": query1.rows[i] })
    }
    return res.status(200).json({ data: data, response: { status: true, message: "successfull" } })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function getDepTaskCountFilter(req, res) {//role-mgmt-wise
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let user_id = req.body.session_variables["x-hasura-user-id"];
  let query;
  const client = await pool.connect();
  try {

    let roleid = await client.query(`select * from public.user_org where user_id=${user_id} and org_id=${org_id} and is_delete=false`);
    let ids = await getAllTeamIds(parseInt(user_id), org_id)
    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : org_id

    let { rowCount, rows } = await client.query(`select * from public.permissions ps,public.user_org ur where ur.user_id=${user_id} and ur.is_delete=false and ur.role_id=ps.role_id and ps.org_id=${orgId}`);
    let taskData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table == "users") {
        taskData.push(rows[i]);
      }
    }
    let access = taskData[0].role_access;
    if (access == "me") {
      query = await client.query(`SELECT d.name, ur.user_id FROM public.department d,public.user_org ur WHERE d.org_id = ${org_id} AND user_id =${user_id} AND d.is_delete = false AND ur.is_delete=false AND d.id = ur.department_id`);
    }
    if (access == "me+childs") {
      query = await client.query(`SELECT d.name, ur.user_id FROM public.department d,public.user_org ur WHERE d.org_id = ${org_id} AND user_id = ANY('{${ids}}') AND d.is_delete = false AND ur.is_delete=false AND d.id = ur.department_id`);
    }
    if (access == "organization") {
      query = await client.query(`SELECT d.name, ur.user_id FROM public.department d,public.user_org ur WHERE d.org_id = ${org_id} AND d.is_delete = false AND ur.is_delete=false AND d.id = ur.department_id`);
    }
    let data = [];

    // getting unique departments
    const uniques = [...new Set(query.rows.map(obj => obj.name))];

    // getting objects for particular department
    for (let i = 0; i < uniques.length; i++) {
      let objects = query.rows.filter((obj) => obj.name === uniques[i]);
      let user_ids = [];

      for (let j = 0; j < objects.length; j++) {
        user_ids.push(objects[j].user_id)
      }
      let query2 = await client.query(`SELECT status, count(*) from public."tasks" WHERE assignee @> '[${user_ids}]' and org_id = ${org_id} and task_type='Live' and is_delete=false group by status`)
      data.push({ "counts": query2.rows, "department": { name: objects[0].name, user_ids } })
    }

    return res.status(200).json({ data: data, response: { status: true, message: "successfull" } })
  } catch (error) {
    logsService.log('error', req, error + "");
    res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function announcmentLogs(req, res) {
  let announcment = req.body.event.data;
  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (announcment.new) {
      let context;
      if (announcment.old) {
        let editedField = getDiff(announcment.old, announcment.new)
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: announcment.old ? "UPDATE" : "CREATE",
        jsonb: announcment.old ? JSON.stringify([announcment.new, announcment.old]) : JSON.stringify(announcment.new),
        context: announcment.old ? JSON.stringify(context) : JSON.stringify({}),
        created_by: announcment.new.created_by,
        org_id: announcment.new.org_id
      }
    } else {
      logObj = {
        operation: "DELETE",
        jsonb: JSON.stringify(announcment.old),
        org_id: announcment.old.org_id
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."announcment_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
    let log_result = await client.query(queryText);
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function locDeleteCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;
  const client = await pool.connect();
  let childNames = []

  try {
    let queryData = await client.query(`select * from public."locations" where id = ${body.id} and org_id=${org_id}`)
    let query = await client.query(`select name from public."locations" where parent = ${body.id} and org_id=${org_id} and is_delete=false limit 5`)

    let query2 = await client.query(`select us.name from public."user_org" ur,public."users" us where ur.location_id=${body.id} and ur.org_id=${org_id} limit 10`)
    if (query.rowCount > 0) {
      for (let i = 0; i < query.rowCount; i++) {
        childNames.push(query.rows[i].name)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned as parent for ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    if (query2.rowCount > 0) {
      for (let i = 0; i < query2.rowCount; i++) {
        childNames.push(query2.rows[i].name)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned to users ${query2.rows}`, response: { status: true, message: "successfully fetched" } })
    }
    //client.release()
    return res.status(200).json({ "response": { status: true, message: "successfully fetched" }, "data": {} })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function depDeleteCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;

  const client = await pool.connect();
  let childNames = []
  try {
    let queryData = await client.query(`select * from public."department" where id = ${body.id} and org_id=${org_id}`)
    let query = await client.query(`select name from public."department" where parent = ${body.id} and org_id=${org_id} and is_delete=false limit 5`)

    let query2 = await client.query(`select us.name from public."user_org" ur,public."users" us where ur.department_id=${body.id} and ur.org_id=${org_id} limit 10`)
    if (query.rowCount > 0) {
      for (let i = 0; i < query.rowCount; i++) {
        childNames.push(query.rows[i].name)
      }
      return res.status(200).json({ "response": { status: true, message: "successfully fetched" }, "data": `${queryData.rows[0].name} is assigned as parent for ${childNames}` })
    }
    if (query2.rowCount > 0) {
      for (let i = 0; i < query2.rowCount; i++) {
        childNames.push(query2.rows[i].name)
      }
      return res.status(200).json({ "response": { status: true, message: "successfully fetched" }, "data": `${queryData.rows[0].name} is assigned to users ${childNames}` })
    }
    //client.release()
    return res.status(200).json({ "response": { status: true, message: "successfully fetched" }, "data": {} })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function desigDeleteCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;
  const client = await pool.connect();
  let childNames = []
  try {
    let queryData = await client.query(`select * from public."designation" where id = ${body.id} and org_id=${org_id} and is_delete=false`)
    let query2 = await client.query(`select us.name from public."user_org" ur,public."users" us where ur.designation_id=${body.id} and ur.org_id=${org_id} and ur.user_id=us.id limit 10`)
    if (query2.rowCount > 0) {
      for (let i = 0; i < query2.rowCount; i++) {
        childNames.push(query2.rows[i].name)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned to users ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    return res.json({ "response": { status: true, message: "successfully fetched" }, "data": {} })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function roleDeleteCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;
  const client = await pool.connect();
  let childNames = []
  try {
    let queryData = await client.query(`select * from public."roles" where id = ${body.id} and org_id=${org_id}`)
    let query2 = await client.query(`select us.name,ur.org_id from public."user_org" ur,public."users" us where ur.role_id=${body.id} and us.id=ur.user_id and ur.is_delete=false and ur.org_id=${org_id} limit 10`)

    if (query2.rowCount > 0) {
      for (let i = 0; i < query2.rowCount; i++) {
        childNames.push(query2.rows[i].name)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned to users ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    return res.json({ "response": { status: true, message: "successfully fetched" }, "data": {} })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function userDeleteCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;
  const client = await pool.connect();
  let childNames = []
  try {
    let queryData = await client.query(`select * from public."users" where id = ${body.id}`)
    let parentquery = await client.query(`select ur.user_id,us.name,us.lastname from public."user_org" ur,public."users" us where ur.reporting_manager=${body.id} and ur.org_id=${org_id} and ur.is_delete=false and ur.user_id=us.id limit 5`)
    let grpquery = await client.query(`select * from public.groups where group_members @> '[${body.id}]' and org_id=${org_id} and is_delete=false limit 5`)
    let taskquery = await client.query(`select * from public.tasks where assignee @> '[${body.id}]' and org_id=${org_id} and is_delete=false limit 5`)

    if (parentquery.rowCount > 0) {
      for (let i = 0; i < parentquery.rowCount; i++) {
        childNames.push(parentquery.rows[i].name)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned as reporting manager for ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    if (grpquery.rowCount > 0) {
      for (let i = 0; i < grpquery.rowCount; i++) {
        childNames.push(grpquery.rows[i].title)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assignee in group ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    if (taskquery.rowCount > 0) {
      for (let i = 0; i < taskquery.rowCount; i++) {
        childNames.push(taskquery.rows[i].title)
      }
      return res.status(200).json({ data: `${queryData.rows[0].name} is assigned in a task ${childNames}`, response: { status: true, message: "successfully fetched" } })
    }
    //client.release()
    return res.status(200).json({ "response": { status: true, message: "successfully fetched" }, "data": {} })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

// async function commentDeleteCheck(req, res) {
//   // const org_id = req.body.session_variables["x-hasura-orgid"]
//   // const userid = req.body.session_variables["x-hasura-user-id"]
//   console.log("wwewewewee")
//   const org_id =291
//   const userid =4013
//   //let body = req.body.input.arg1;
//   const client = await pool.connect();
//   try {
//     console.log(`select * from public.comment where id=${req.query.id}`)
//     const { rows } = await client.query(`select * from public.comment where id=${req.params.id}`)
//     console.log(rows)
//      const user_id = rows[0].created_by
//      let allids = []
//      await getAssignees(user_id, allids, org_id, client)
//   console.log("allidsss",allids)
//      if(userid == user_id || allids.includes(userid)) return res.json({status:true})
//       return res.json({status:false,message:"unable to delete"})

//   } catch (error) {
//     logsService.log('error', req, error + "")
//     return res.json({ status: false, message: error })
//   }
//   finally {
//     client.release()
//   }
// }

async function teamTasksClosedFilter(req, res) {
  let grpid = req.body.input.arg1.group_id;
  let org_id = req.body.session_variables["x-hasura-orgid"]
  const client = await pool.connect();
  let result = [];
  try {
    let newDate = new Date()
    let date = new Date(newDate.setDate(newDate.getDate() - 7))
    let assignees = await client.query(`select group_members from public."groups" where id =${grpid} and org_id = ${org_id}`)
    if (assignees.rowCount > 0) {
      for (let i = 0; i < assignees.rows[0].group_members.length; i++) {
        let totalTaskCount = await client.query(`select * from public."tasks" where assignee @> '[${assignees.rows[0].group_members[i]}]' and org_id =${org_id} and created_at>='${date.toISOString()}' and created_at <='${newDate.toISOString()}' and task_type='Live' and is_delete=false`)

        let userDetails = await client.query(`select us.name as username,us.id as userid,us.lastname as lastname,des.name as designame from public.user_org ur,public.designation des,public."users" us where us.id=${assignees.rows[0].group_members[i]} and ur.user_id=${assignees.rows[0].group_members[i]} and des.id=ur.designation_id and ur.org_id=${org_id} and ur.is_delete=false`)
        if (userDetails.rowCount > 0) {
          if (totalTaskCount.rowCount > 0) {
            let closedCount = await client.query(`select count(*) from public."tasks" where id in (${totalTaskCount.rows}) and status = 'closed' and is_delete=false`)
            let percent = closedCount / totalTaskCount * 100
            percent = parseInt(percent)
            result.push({ "username": userDetails.rows[0].username, "userid": userDetails.rows[0].userid, "lastname": userDetails.rows[0].lastname, "designame": userDetails.rows[0].designame, "percent": percent })
          } else {
            result.push({ "username": userDetails.rows[0].username, "userid": userDetails.rows[0].userid, "lastname": userDetails.rows[0].lastname, "designame": userDetails.rows[0].designame, "percent": 0 })
          }
        }
      }
    }

    return res.status(200).json({ data: result, response: { status: true, message: "successfully fetched" } })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function pastWeekStatusCounts(req, res) {
  let body = req.body.input.arg1;
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let user_id = req.body.session_variables["x-hasura-user-id"]
  const client = await pool.connect();
  try {
    let newDate = new Date()
    let date = new Date(newDate.setDate(newDate.getDate() - 7))
    let tasks;
    if (body.type != "self") {
      tasks = await client.query(`select status,date(created_at),count(*) from public."tasks" where created_at>='${date.toISOString()}' and created_at<='${new Date().toISOString()}' and org_id=${org_id} and is_delete=false group by date(created_at),status`)
    } else {
      tasks = await client.query(`select status,date(created_at),count(*) from public."tasks" where created_at>='${date.toISOString()}' and created_at<='${new Date().toISOString()}' and org_id=${org_id} and assignee @> '[${user_id}]' and is_delete=false group by date(created_at),status`)
    }
    return res.status(200).json({ data: tasks.rows, response: { status: true, message: "successfully fetched" } })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function task_codeGenerator(req, res) {
  let body = req.body.event.data.new;
  const client = await pool.connect();
  try {

    let get_codeGenerator = await client.query(`select * from public."code_generator" where org_id = ${body.org_id} `)
    if (get_codeGenerator.rowCount > 0) {
      let code = get_codeGenerator.rows[0].sequence_no + 1;
      let update_codeGenerator = await client.query(`update public."code_generator" set sequence_no=${code} where org_id = ${body.org_id} `)
      let updatetask = await client.query(`update public."tasks" set task_code=${code} where id = ${body.id} `)

    } else {
      let codeGenObj = {
        org_id: body.org_id,
        sequence_no: 0
      }
      const codegenqueryText = await client.query(`INSERT INTO public."code_generator"(${Object.keys(codeGenObj)}) VALUES(${await getarray(Object.values(codeGenObj))}) RETURNING id`)
      let get_new_codeGenerator = await client.query(`select * from public."code_generator" where org_id = ${body.org_id} `)

      let code = get_new_codeGenerator.rows[0].sequence_no + 1;
      let update_new_codeGenerator = await client.query(`update public."code_generator" set sequence_no=${code} where org_id = ${body.org_id} `)

      let updatetask = await client.query(`update public."tasks" set task_code=${code} where id = ${body.id} `)

    }
    return res.status(200).json({ status: true, message: 'code update successfully' })

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function statusGraph(req, res) {//role mgmt wise
  const org_id = req.body.session_variables["x-hasura-orgid"];
  const user_id = req.body.session_variables["x-hasura-user-id"];
  let query;

  const client = await pool.connect();
  try {

    const roleid = await client.query(`SELECT * FROM public.user_org WHERE user_id = ${user_id} AND org_id = ${org_id} AND is_delete = false`);

    const ids = [user_id];
    await getAssignees(user_id, ids, org_id, client);

    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : org_id

    const { rowCount, rows } = await client.query(`SELECT * FROM public.permissions ps, public.user_org ur WHERE ur.user_id = ${user_id} AND ur.is_delete = false AND  ur.role_id = ps.role_id AND ps.org_id = ${orgId}`);
    let taskData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table === "users") {
        taskData.push(rows[i]);
      }
    }
    if (taskData.length > 0) {
      const access = taskData[0].role_access;

      if (access === "me") {
        query = await client.query(`SELECT status, date(created_at), count(*) FROM public.task_logs WHERE status IS NOT NULL AND status != '' AND assignee @> '[${user_id}]' AND org_id = ${org_id} GROUP BY status, date(created_at) ORDER BY date(created_at)`);
      }
      if (access === "me+childs") {
        query = await client.query(`SELECT status, date(created_at), count(*) FROM public.task_logs WHERE status IS NOT NULL AND status != '' AND assignee @> ANY('{${ids}}') AND org_id = ${org_id} GROUP BY status, date(created_at) ORDER BY date(created_at)`);
      }
      if (access === "organization") {
        query = await client.query(`SELECT status, date(created_at), count(*) FROM public.task_logs WHERE status IS NOT NULL AND status != '' AND org_id = ${org_id} GROUP BY status, date(created_at) ORDER BY date(created_at)`);
      }
    }

    res.status(200).json({ data: query.rowCount > 0 ? query.rows : {}, response: { status: true, message: "successfully fetched" } })
  } catch (error) {
    logsService.log('error', req, error + "");
    res.status(500).json({ status: false, message: error })
  } finally {
    client.release()
  }
}

async function userTotalRewards(req, res) {
  const org_id = req.body.session_variables["x-hasura-orgid"];
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`SELECT user_id, SUM(points) AS points FROM public.reward_points WHERE org_id = ${org_id} GROUP BY user_id ORDER BY SUM(points) DESC`);
    res.status(200).json({ data: rows, response: { status: true, message: "Data fetched successfully" } })
  } catch (error) {
    logsService.log('error', req, error + "");
    res.status(500).json({ status: false, message: error })
  } finally {
    client.release()
  }
};

async function userBoardView(req, res) {//role mgmt wise
  const org_id = req.body.session_variables["x-hasura-orgid"];
  const user_id = req.body.session_variables["x-hasura-user-id"];

  let taskList = []
  let subtaskClosedCount = 0
  let totalSubtaskCount = 0
  let attachmentCount = 0
  let commentCount = 0
  let mainTasks;
  const client = await pool.connect();

  try {
    let roleid = await client.query(`SELECT * FROM public.user_org WHERE user_id = ${user_id} AND org_id = ${org_id} AND is_delete = false`);

    const ids = [user_id];
    await getAssignees(user_id, ids, org_id, client);
    let orgId = roleid.rows[0].role_id == 1 || roleid.rows[0].role_id == 2 || roleid.rows[0].role_id == 3 ? 0 : org_id
    const { rowCount, rows } = await client.query(`SELECT * FROM public.permissions ps, public.user_org ur WHERE ur.user_id = ${user_id} AND ur.is_delete = false AND ur.role_id = ps.role_id AND ps.org_id = ${orgId}`);

    let taskData = [];

    for (let i = 0; i < rowCount; i++) {
      if (rows[i].table === "users") {
        taskData.push(rows[i]);
      }
    }
    if (taskData[0].role_access === "me") {
      mainTasks = await client.query(`SELECT * FROM public.tasks WHERE parent = 0 AND org_id = ${org_id} AND assignee @> '[${user_id}]' AND assignee != '[]' AND task_type!='Draft' AND is_delete = false`);
    }

    if (taskData[0].role_access === "me+childs") {
      mainTasks = await client.query(`SELECT * FROM public.tasks WHERE parent = 0 AND org_id = ${org_id} AND assignee @> ANY ('{${ids}}') AND assignee != '[]' AND task_type!='Draft' AND is_delete = false`);
    }
    if (taskData[0].role_access === "organization") {
      mainTasks = await client.query(`SELECT * FROM public.tasks WHERE parent = 0 AND org_id = ${org_id} AND assignee != '[]' AND task_type!='Draft' AND is_delete = false`);
    }

    if (mainTasks.rowCount > 0) {
      for (let i = 0; i < mainTasks.rowCount; i++) {
        const subtasks = await client.query(`SELECT status, COUNT(*) FROM public.tasks WHERE parent = ${mainTasks.rows[i].id} AND task_type!='Draft' AND is_delete = false GROUP BY status`);

        if (subtasks.rowCount > 0) {
          Object.keys(subtasks.rows).forEach(key => {
            totalSubtaskCount += parseInt(subtasks.rows[key].count);
          });

          for (let j = 0; j < subtasks.rowCount; j++) {
            if (subtasks.rows[j].status == 'closed') {
              subtaskClosedCount = subtaskClosedCount + 1
            }
          }
        }

        const attachments = await client.query(`SELECT COUNT(*) FROM public.attachments WHERE task_id = ${mainTasks.rows[i].id} AND is_delete=false`);
        attachmentCount = parseInt(attachments.rows[0].count);

        const comments = await client.query(`SELECT COUNT(*) FROM public.comment WHERE task_id = ${mainTasks.rows[i].id} AND is_delete = false`);
        commentCount = parseInt(comments.rows[0].count);

        const obj = { "task": mainTasks.rows[i], "subtaskClosedCount": subtaskClosedCount, "totalSubtaskCount": totalSubtaskCount, "attachmentCount": attachmentCount, "commentCount": commentCount };
        taskList.push(obj);

        subtaskClosedCount = 0
        totalSubtaskCount = 0
        attachmentCount = 0
        commentCount = 0
      }
    }

    res.status(200).json({ data: taskList, response: { status: true, message: "successfull" } })
  } catch (error) {
    logsService.log('error', req, error + "");
    res.status(500).json({ status: false, message: error })
  } finally {
    client.release()
  }
}

async function rewardPointsCalcTrigger(req, res) {
  const client = await pool.connect();
  const task_obj = req.body.event.data.new
  if (task_obj.status === "closed") {
    try {
      const assignees = task_obj.assignee;
      const { rowCount: subtask_rowCount, rows: subtask_rows } = await client.query(`SELECT * FROM public.tasks WHERE parent = ${task_obj.id} AND is_delete = false AND org_id = ${task_obj.org_id}`);

      if (subtask_rowCount > 0) {
        // pushing assignees of sub taks to assignees array.
        for (let j = 0; j < subtask_rowCount; j++) {
          for (const assignee of subtask_rows[j].assignee)
            assignees.push(assignee);
        }
      }
      // Removing duplicates from asignees array.
      const uniqueAssignees = [...new Set(assignees)];

      let category;
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const { due_date, priority, org_id, assignee_type } = task_obj;
      const diffInDays = moment().diff(moment(due_date), "d");

      if (diffInDays < 1) { category = "beforeduedate" };
      if (diffInDays === 1) { category = "afterduedate" };
      if (diffInDays === 2) { category = "overduedate1" };
      if (diffInDays === 3) { category = "overduedate2" };
      if (diffInDays === 4) { category = "overduedate3" };
      if (diffInDays === 5) { category = "overduedate4" };
      if (diffInDays === 6) { category = "overduedate5" };
      if (diffInDays >= 7) { category = "overduedate6" };

      let getQuery = await client.query(`SELECT * FROM public.rewards_configuration where org_id=${org_id}`)
      let orgid = getQuery.rowCount > 0 ? org_id : 0
      const { rows, rowCount } = await client.query(`SELECT * FROM public.rewards_configuration WHERE category = '${category}' AND is_enable = true AND org_id = ${orgid} AND priority = '${priority}' AND  assignee_type = '${assignee_type}'`);
      if (rowCount > 0) {
        for (let k = 0; k < uniqueAssignees.length; k++) {
          ///createdby--------->
          let createdbyuser = uniqueAssignees[k] === task_obj.createdby ? uniqueAssignees[k] : task_obj.createdby
          const obj = {
            user_id: createdbyuser,
            org_id: task_obj.org_id,
            task_id: task_obj.id,
            points: rows[0].created_by_rewards,
            month,
            year,
            rewards_for: "created_by",
          };
          let getcreatedbyRecord = await client.query(`select * from public.reward_points where user_id=${obj.user_id} and org_id=${obj.org_id} and task_id=${obj.task_id} and rewards_for='${obj.rewards_for}'`)
          if (getcreatedbyRecord.rowCount > 0) {
            await client.query(`update public.reward_points set points=${obj.points} where id=${getcreatedbyRecord.rows[0].id}`)
          } else {
            await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
          }

          ///assignee-------->
          if (task_obj.assignee.includes(uniqueAssignees[k])) {

            const obj = {
              user_id: uniqueAssignees[k],
              org_id: task_obj.org_id,
              task_id: task_obj.id,
              points: rows[0].assigneed_to_rewards,
              month,
              year,
              rewards_for: "assigneee",
            };
            let getAssigneeRecord = await client.query(`select * from public.reward_points where user_id=${obj.user_id} and org_id=${obj.org_id} and task_id=${obj.task_id} and rewards_for='${obj.rewards_for}'`)
            if (getAssigneeRecord.rowCount > 0) {
              await client.query(`update public.reward_points set points=${obj.points} where id=${getAssigneeRecord.rows[0].id}`)
            } else {
              await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
            }
          }
          const query = await client.query(`select * from public.task_approvals WHERE task_id=${task_obj.id}`);
          ////reviewer------->
          if (query.rowCount > 0) {
            const list = query.rows.map((item) => item.current_user_id);
            const uniqUsers = [...new Set(list)];

            for (let r = 0; r < uniqUsers.length; r++) {
              const obj = {
                user_id: uniqUsers[r],
                org_id: task_obj.org_id,
                task_id: task_obj.id,
                points: rows[0].reviewed_by_rewards,
                month,
                year,
                rewards_for: "reviewer",
              };
              let getReviwerRecord = await client.query(`select * from public.reward_points where user_id=${obj.user_id} and org_id=${obj.org_id} and task_id=${obj.task_id} and rewards_for='${obj.rewards_for}'`)
              if (getReviwerRecord.rowCount > 0) {
                await client.query(`update public.reward_points set points=${obj.points} where id=${getReviwerRecord.rows[0].id}`)
              } else {
                await client.query(`INSERT INTO public.reward_points(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))})`);
              }
            }

          }

        }
      }

    } catch (error) {
      logsService.log('error', req, error + "");
      res.status(500).json({ status: false, message: error })
    } finally {
      client.release();
    }
  }
}

async function reportsFilter(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let userid = req.body.session_variables["x-hasura-user-id"]
  let body = req.body.input.arg1;
  const client = await pool.connect();
  let taskQuery;
  let basequery = '';
  let assignee = ''
  let assigneeList = [...body.assignees]
  let operator = body.operator
  try {
    if (body.status.length > 0) {
      basequery = basequery + ` ${operator} internal_status in (${await getarray(body.status)})`
    }
    if (body.priority.length > 0) {
      basequery = basequery + ` ${operator} internal_priority in (${await getarray(body.priority)})`
    }
    if (body.startdate.from_date != '' && body.startdate.to_date != '') {
      basequery = basequery + ` ${operator} start_date BETWEEN DATE('${body.startdate.from_date}') AND DATE('${body.startdate.to_date}')`
    }
    if (body.duedate.from_date != '' && body.duedate.to_date != '') {
      basequery = basequery + ` ${operator} due_date BETWEEN DATE('${body.duedate.from_date}') AND DATE('${body.duedate.to_date}')`
    }
    if (body.closeddate.from_date != '' && body.closeddate.to_date != '') {
      basequery = basequery + ` ${operator} closed_date BETWEEN DATE('${body.closeddate.from_date}') AND DATE('${body.closeddate.to_date}')`
    }
    if (body.teams.length > 0) {
      let usersList = await client.query(`select group_members from public.groups where id in (${body.teams}) and org_id=${org_id} and is_delete=false`)
      usersList.rows.forEach((item) => assigneeList.push(item.group_members))
    }
    if (body.location.length > 0) {
      let usersList = await client.query(`select user_id from public.user_org where location_id in (${body.location}) and org_id=${org_id} and is_delete=false`)
      usersList.rows.forEach((item) => assigneeList.push(item.user_id))
    }
    if (body.department.length > 0) {
      let depUserList = await client.query(`select user_id from public.user_org where department_id in (${body.department}) and org_id=${org_id} and is_delete=false`)
      depUserList.rows.forEach((item) => assigneeList.push(item.user_id))
    }
    if (body.assignees.length > 0 || body.department.length > 0 || body.location.length > 0 || body.teams.length > 0) {
      const uniqueAssignees = [...new Set(assigneeList)];
      assignee = `assignee @> ANY ('{${uniqueAssignees}}') and assignee!='[]' `
    }
    if (basequery) {
      if (operator == 'AND') {
        if (Object.keys(assignee).length > 0) {
          taskQuery = await client.query(`select * from public.tasks where  task_type = 'Live' and is_delete=false and ` + assignee + basequery + ` and org_id=${org_id}  `)
        } else {
          basequery = basequery.trim().split(' ').slice(1).join(' ')
          taskQuery = await client.query(`select * from public.tasks where  task_type = 'Live' and is_delete=false and ` + basequery + ` and org_id=${org_id}  `)
        }
      } else {
        if (Object.keys(assignee).length > 0) {
          taskQuery = await client.query(`select * from public.tasks where  task_type = 'Live' and is_delete=false and (` + assignee + basequery + `) and org_id=${org_id}  `)
        } else {
          basequery = basequery.trim().split(' ').slice(1).join(' ')
          taskQuery = await client.query(`select * from public.tasks where  task_type = 'Live' and is_delete=false and (` + basequery + `) and org_id=${org_id}  `)
        }
      }
    } else {
      taskQuery = await client.query(`select * from public.tasks where parent = 0 and task_type = 'Live' and is_delete=false and ` + assignee + ` and org_id=${org_id} `)
    }
    //Saving to s3 bucket---------------------------------------------------------------------------------------------------------------
    let json = []
    for (let i = 0; i < taskQuery.rowCount; i++) {//looping on 
      let assignee = taskQuery.rows[i].assignee
      let assignees = []
      for (let j = 0; j < assignee.length; j++) {
        let query = await client.query(`select name,lastname from public.users where id =${assignee[j]}`)
        if (query.rowCount > 0) {
          assignees.push(`${query.rows[0].name}` + " " + `${query.rows[0].lastname}`)
        }
      }
      let obj = {//getting wanted fields from task
        "Task code": taskQuery.rows[i].task_code,
        "name": taskQuery.rows[i].name,
        "assignees": assignees,
        "status": taskQuery.rows[i].status,
        "priority": taskQuery.rows[i].priority,
        "assignee type": taskQuery.rows[i].assignee_type,
        "Created at": taskQuery.rows[i].created_at,
        "Created by": taskQuery.rows[i].createdby,
        "Start date": taskQuery.rows[i].start_date,
        "Due date": taskQuery.rows[i].due_date,
        "Updated on": taskQuery.rows[i].updated_on,
        "Updated user": taskQuery.rows[i].updated_user,
        "Closed date": taskQuery.rows[i].closed_date
      }
      json.push(obj)
    }
    ////Saving to S3------------
    if (json.length > 0) {
      const xls = json2xls(json);
      const timestamp = new Date().getTime();
      let filename = `taskCsvReports${timestamp}.xlsx`
      fs.writeFileSync(filename, xls, 'binary');//converting json to xl format

      const reportContent = await fs.readFileSync(filename);

      let file = await configuration.getTasksReportFileUploadUrl(filename, org_id, 'taskscsvreport') //preparing a link to upload in AWS

      let fileconfig = {
        method: 'put',
        url: file.url,
        headers: {
          'Content-Type': 'application/xlsx'
        },
        data: reportContent
      };

      axios(fileconfig)
        .then(function (response) {
        })
        .catch(function (error) {
          console.log(error);
        });

      let url = await awsmodule.getSignedUrl(file.folderpath, filename, 'getObject')
      console.log("urllll", url)
      let taskObj = {
        "org_id": org_id,
        "filename": filename,
        "folderpath": file.folderpath,
        "created_by": userid,
        "url": url
      }
      await client.query(`INSERT INTO public.task_csv_reports(${Object.keys(taskObj)}) VALUES(${await getarray(Object.values(taskObj))}) `)
    }
    //---------------------------------------------------------------------------------------------------------------------------------------
    return res.status(200).json({ data: taskQuery.rows, response: { status: true, message: "successfull" } })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function statusPriorityDelCheck(req, res) {
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let body = req.body.input.arg1;
  let field_type = body.field_type
  let field = body.field
  let new_field = body.new_field
  let type = body.type
  let query;
  let temp_query;
  let ids = []
  let temp_ids = []

  const client = await pool.connect();
  try {
    if (field_type == 'status') {
      query = await client.query(`select id from public."tasks" where org_id=${org_id} and internal_status='${field}' and is_delete=false`)
      temp_query = await client.query(`select id from public."task_template" where org_id=${org_id} and internal_status='${field}' and is_delete=false`)
    }
    if (field_type == 'priority') {
      query = await client.query(`select id from public."tasks" where org_id=${org_id} and internal_priority='${field}' and is_delete=false`)
      temp_query = await client.query(`select id from public."task_template" where org_id=${org_id} and internal_priority='${field}' and is_delete=false`)
    }
    if (query.rowCount == 0 && temp_query.rowCount == 0) {
      return res.json({ response: { status: false, message: 0 } })
    }
    query.rows.map((id) => {
      ids.push(id.id)
    })
    temp_query.rows.map((id) => {
      temp_ids.push(id.id)
    })
    if (new_field == '') {
      return res.json({ response: { status: true, message: query.rowCount } })
    }
    if (ids.length > 0 || temp_ids.length > 0) {
      if ((type == 'delete' || type == 'update') && field_type == 'status') {
        if (ids.length > 0) {
          let updatequery = await client.query(`update public."tasks" set internal_status='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
        }
        if (temp_ids.length > 0) {
          let updatequery = await client.query(`update public."task_template" set internal_status='${new_field}' where id in (${[...temp_ids]}) and org_id=${org_id}`)
        }
        let message = type == 'delete' ? "Status Deleted Successfully" : "Status Updated Successfully"
        return res.json({ response: { status: true, message: message } })
      }
      if ((type == 'delete' || type == 'update') && field_type == 'priority') {
        if (ids.length > 0) {
          let updatequery = await client.query(`update public."tasks" set internal_priority='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
        }
        if (temp_ids.length > 0) {
          let updatequery = await client.query(`update public."task_template" set internal_priority='${new_field}' where id in (${[...temp_ids]}) and org_id=${org_id}`)
        }
        let message = type == 'delete' ? "Priority Deleted Successfully" : "Priority Updated Successfully"
        return res.status(200).json({ response: { status: true, message: message } })
      }
    } else {
      return res.status(204).json({ response: { status: false, message: "No records" } })
    }

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }

}


module.exports.statusPriorityDelCheck = statusPriorityDelCheck;
module.exports.reportsFilter = reportsFilter;
module.exports.taskNotification = taskNotification;
module.exports.TaskProgresscalculation = TaskProgresscalculation;
module.exports.taskEmailNotification = taskEmailNotification;
module.exports.taskLogs = taskLogs;
module.exports.taskTemplateLogs = taskTemplateLogs;
module.exports.locationLogs = locationLogs;
module.exports.departmentLogs = departmentLogs;
module.exports.designationLogs = designationLogs;
module.exports.ticketLogs = ticketLogs;
module.exports.commentLogs = commentLogs;
module.exports.attachmentLogs = attachmentLogs;
module.exports.checklistLogs = checklistLogs;
module.exports.groupLogs = groupLogs;
module.exports.announcmentLogs = announcmentLogs;
module.exports.taskPushNotification = taskPushNotification;
module.exports.statusCountFilter = statusCountFilter;
module.exports.dueDateFilter = dueDateFilter;
module.exports.assigneeTaskTransfer = assigneeTaskTransfer;
module.exports.taskApproval = taskApproval;
module.exports.taskFilter = taskFilter;
module.exports.getAllTeamIds = getAllTeamIds;
module.exports.getGroupTaskCountFilter = getGroupTaskCountFilter;
module.exports.getDepTaskCountFilter = getDepTaskCountFilter;
module.exports.locDeleteCheck = locDeleteCheck;
module.exports.depDeleteCheck = depDeleteCheck;
module.exports.desigDeleteCheck = desigDeleteCheck;
module.exports.roleDeleteCheck = roleDeleteCheck;
module.exports.userDeleteCheck = userDeleteCheck;
module.exports.teamTasksClosedFilter = teamTasksClosedFilter;
module.exports.deleteAttachment = deleteAttachment;
module.exports.pastWeekStatusCounts = pastWeekStatusCounts;
module.exports.task_codeGenerator = task_codeGenerator;
module.exports.approvalInsert = approvalInsert;
module.exports.getApproveUsers = getApproveUsers;
module.exports.taskStatusUpdate = taskStatusUpdate;
module.exports.getApproverList = getApproverList;
module.exports.needtoApproveList = needtoApproveList;
module.exports.acceptTask = acceptTask;
module.exports.myApprovedList = myApprovedList;
module.exports.myRejectedList = myRejectedList;
module.exports.rewardPointsCalcTrigger = rewardPointsCalcTrigger;
module.exports.statusGraph = statusGraph;
module.exports.userBoardView = userBoardView;
module.exports.userTotalRewards = userTotalRewards;
module.exports.getAccesBasedUserData = getAccesBasedUserData;
module.exports.getAccesBasedLocationData = getAccesBasedLocationData;
module.exports.getHighPriorityTasks = getHighPriorityTasks;
module.exports.getGroupsDropdown = getGroupsDropdown;
module.exports.getAllTeamIds2 = getAllTeamIds2;
// module.exports.commentDeleteCheck = commentDeleteCheck;






