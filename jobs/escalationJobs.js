const express = require("express");
const pool = require("../config/config").pool;
const moment = require("moment");
const format = require("pg-format");
let logsService = require('../config/logservice.js')
const axios = require("axios");
const app = express();
app.set("view engine", "ejs");

function getarray(data) {
  let data1 = `'`;
  for (let i = 0; i < data.length; i++) {
    data1 += data[i] + `','`;
  }
  return data1.substring(0, data1.length - 2);
}
async function getarray2(data) {
  var data1 = [];
  for (var i = 0; i < data.length; i++) {
    data1.push(data[i]);
  }
  return data1;
}


async function selfEscalationJob(req,res) {
  const client = await pool.connect();
  let type;
  let daysin;
  let category;
  let message;
  let diff_indays
  let remainderData = await client.query(
    `select * from public.remainders where execution='L1'`
  );
 
  if (remainderData.rowCount > 0) {
    //getting the records from task_remainders where self equal to true---
    try{
      let orgData = await client.query(
        `select * from public."organization" where is_delete=false`
      );
      
  
      for (let r = 0; r < orgData.rowCount; r++) {
        try{
      let tasks = await client.query(
          `select * from public."tasks" where org_id=${orgData.rows[r].id} and is_delete=false and status!='closed'`
        );
         
        let orgConfig = await client.query(
          `select * from public."remainders" where org_id=${orgData.rows[r].id}`
        );
        let orgid = orgConfig.rowCount > 0 ? orgData.rows[r].id : 0;
        for (let j = 0; j < tasks.rowCount; j++) {
          //getting the matched record from tasks table
          let assignee = tasks.rows[j].assignee;
          let startdate = tasks.rows[j].start_date;
          let sdate = moment(startdate).format('DD-MM-YYYY')
          let startdate_diff = moment(startdate).diff(moment(), 'd')
          if (startdate_diff > 0) {
            category = "b";
            message = `You have an up coming task on ${sdate}`;
            daysin = startdate_diff
            type = 'startdate'
          } else {
            //next_notification in task is the duedate
            let duedate = tasks.rows[j].due_date;
            let currentdate = new Date();
            //compare the due date and current date----->
            let diff_milliscs = Date.parse(duedate) - Date.parse(currentdate);
            diff_indays = new moment.duration(diff_milliscs);
            diff_indays.asDays();
            daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            type = 'duedate'
            //the days are in positive then beforeoverdue records should get
            if (daysin > 0) {
              category = "b";
              message = "You Need to close the task before due date";
            }
            if (daysin < 0) {
              category = "o";
              message = "Task Due date Exceeded";
              //changing the -ve days to positiva days
              let diff_milliscs = Date.parse(currentdate) - Date.parse(duedate);
              diff_indays = new moment.duration(diff_milliscs);
              diff_indays.asDays();
              daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            }
            if (daysin == 0) {
              category = "c";
              message = "Today is the due date to complete the task";
            }
          }
          let category_record = await client.query(
            `select * from public."remainders" where execution='L1' and org_id=${orgid} and min_days>=${daysin} and ${daysin}<=days and days_type='${category}' and status='${tasks.rows[j].status}' and priority='${tasks.rows[j].priority}' and is_enable=true and type='${type}'`
          );
  
          if (category_record.rowCount > 0) {
            let single_task_remainder = category_record.rows[0];
            let trigger_time = category_record.rows[0].timer;
            let last_self_remainder_time = tasks.rows[j].last_self_remainder_time;
            //convert trigger_time to hrs and add to last_self-remaindertime and compare with current_date
            let date = new Date(last_self_remainder_time);
            let last_self_remainder = new Date(Date.parse(date) + trigger_time);
            let compare_remainder_time = last_self_remainder <= new Date();
            //if the last_self_remainder<= current date
            if (compare_remainder_time) {
              let notificationArray = [];
              let singleobj = {};
              let notification
              if (single_task_remainder.email == true) {
                for (let i = 0; i < assignee.length; i++) {
                  notification = {
                    title: tasks.rows[j].name,
                    user_id: assignee[i],
                    message: `${message}`,
                    org_id: tasks.rows[j].org_id,
                    target_id: tasks.rows[j].id,
                    context: {},
                    is_email: single_task_remainder.email == true ? true : false,
                    type: "task",
                  };
                  singleobj = notification;
                  notificationArray.push(
                    await getarray2(Object.values(notification))
                  );
                }
              }
              if (notificationArray.length > 0) {
                const queryText = format(
                  `INSERT INTO public."notification"(${Object.keys(singleobj)}) VALUES %L`,
                  notificationArray
                );
                let notification_result = await client.query(queryText);
              }
  
              let current_time = new Date().toISOString();
              let update_last_selfRemainder = await client.query(
                `UPDATE public."tasks" SET last_self_remainder_time='${current_time}' where id=${tasks.rows[j].id}`
              );
            }
          }
        }
        }catch(error){
          console.log(error)
        }
        
      }
      return res.json({status:true,message:"Self Escalation job runs successfully"})
    }catch(error){
      console.log(error)
    }finally {
      client.release()
    }
  
  }else{
    return res.json({status:false,message:"No self remainders"})
  }
}

//selfEscalationJob()

async function escalation_1Job(req,res) {
  const client = await pool.connect();
  let type;
  let daysin;
  let category;
  let message;
  let start = false;
  let diff_indays
  let remainderData = await client.query(
    `select * from public.remainders where execution='L2'`
  );

  if (remainderData.rowCount > 0) {
    //getting the records from task_remainders where escalation1 equal to true---
    try{
      let orgData = await client.query(
        `select * from public."organization" where is_delete=false`
      );
      for (let r = 0; r < orgData.rowCount; r++) {
        let tasks = await client.query(
          `select * from public."tasks" where org_id=${orgData.rows[r].id} and task_type='Live' and is_delete=false and status!='closed'`
        );
        let orgConfig = await client.query(
          `select * from public."remainders" where org_id=${orgData.rows[r].id}`
        );
        let orgid = orgConfig.rowCount > 0 ? orgData.rows[r].id : 0;
        for (let j = 0; j < tasks.rowCount; j++) {
          //getting the matched record from tasks table
          let assignee = tasks.rows[j].assignee;
          let startdate = tasks.rows[j].start_date;
          let sdate = moment(startdate).format('DD-MM-YYYY')
          let startdate_diff = moment(startdate).diff(moment(), 'd')
          if (startdate_diff > 0) {
            category = "b";
            message = `You have an upcoming task on ${sdate}`;
            daysin = startdate_diff
            type = 'startdate'
            start = true
          } else {
            //next_notification in task is the duedate
            let duedate = tasks.rows[j].due_date;
            let currentdate = new Date();
            //compare the due date and current date
            let diff_milliscs = Date.parse(duedate) - Date.parse(currentdate);
            diff_indays = new moment.duration(diff_milliscs);
            diff_indays.asDays();
            daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            type = 'duedate'
            //the days are in positive then beforeoverdue records should get
            if (daysin > 0) {
              category = "b";
              message = "Escalation mail sent to Your Reporting manager";
            }
            if (daysin < 0) {
              category = "o";
              message = "Escalation mail sent to Your Reporting manager";
              //changing the -ve days to positiva days
              let diff_milliscs = Date.parse(currentdate) - Date.parse(duedate);
              diff_indays = new moment.duration(diff_milliscs);
              diff_indays.asDays();
              daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            }
            if (daysin == 0) {
              category = "c";
              message = "Escalation mail sent to Your Reporting manager";
            }
          }
          let category_record = await client.query(
            `select * from public."remainders" where execution='L2' and org_id=${orgid} and min_days>=${daysin} and ${daysin}<=days and days_type='${category}' and status='${tasks.rows[j].status}' and priority='${tasks.rows[j].priority}' and is_enable=true and type='${type}'`
          );
  
          if (category_record.rowCount > 0) {
            let single_task_remainder = category_record.rows[0];
            let trigger_time = category_record.rows[0].timer
            let last_self_remainder_time = tasks.rows[j].last_escalation1;
            //convert trigger_time to hrs and add to last_self-remaindertime and compare with current_date
            let date = new Date(last_self_remainder_time);
            let last_self_remainder = new Date(Date.parse(date) + trigger_time);
            let compare_remainder_time = last_self_remainder <= new Date();
            if (compare_remainder_time) {
              //getting level-1 reporting managers---------->>>
              let level1Ids = await getall(assignee, 1);
              ///if EMAIL------>
              let notificationArray = [];
              let singleobj = {};
              let notification
              let title = tasks.rows[j].name
              let orgid = tasks.rows[j].org_id
              let target_id = tasks.rows[j].id
              let type = "task"
              if (single_task_remainder.email == true) {
                //email to self assignee--->
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  notification = {
                    title: title,
                    user_id: assignee[i],
                    message: `${message}`,
                    org_id: orgid,
                    target_id: target_id,
                    is_email: true,
                    type: type,
                  };
                  singleobj = notification;
                  notificationArray.push(
                    await getarray2(Object.values(notification))
                  );
                  //email to reporting managers
                  for (let i = 0; i < level1Ids.length; i++) {
                    notification = {
                      title: title,
                      user_id: level1Ids[i],
                      message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to complete` : `${assigneeData.rows[0].name}'s task is in open Need to be close before Due date`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: true,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                  }
                }
              }
              if (single_task_remainder.notification == true) {
                //push notification
                //self push notification
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  notification = {
                    title: title,
                    user_id: assignee[i],
                    message: `${message}`,
                    org_id: orgid,
                    target_id: target_id,
                    is_email: false,
                    type: type,
                  };
                  singleobj = notification;
                  notificationArray.push(
                    await getarray2(Object.values(notification))
                  );
                  //notification to reporting managers------>
                  for (let i = 0; i < level1Ids.length; i++) {
                    notification = {
                      title: title,
                      user_id: level1Ids[i],
                      message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to complete` : `${assigneeData.rows[0].name}'s task is in Over Due Remind him to complete`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: false,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                  }
                }
              }
              if (notificationArray.length > 0) {
                const queryText = format(
                  `INSERT INTO public."notification"(${Object.keys(
                    singleobj
                  )}) VALUES %L`,
                  notificationArray
                );
                var notification_result = await client.query(queryText);
              }
  
              let current_time = new Date().toISOString();
              let update_last_escalationRemainder = await client.query(
                `UPDATE public."tasks" SET last_escalation1= '${current_time}' where id=${tasks.rows[j].id}`
              );
  
            }
          }
        }
      }
      return res.json({status:true,message:"Escalation job 1 runs successfully"})
    }catch(error){
      console.log(error)
    }finally {
      client.release()
    }
   
  }else{
    return res.json({status:false,message:"No L2 remainders"})
  }
}
//escalation_1Job();

async function escalation_2Job(req,res) {
 
  const client = await pool.connect();
  let type;
  let daysin;
  let category;
  let message;
  let start = false;

  let remainderData = await client.query(
    `select * from public.remainders where execution='L3'`
  );

  if (remainderData.rowCount > 0) {
    //getting the records from task_remainders where escalation-2 equal to true---
    try{
      let orgData = await client.query(
        `select * from public."organization" where is_delete=false`
      );
  
      for (let r = 0; r < orgData.rowCount; r++) {
        let tasks = await client.query(
          `select * from public."tasks" where org_id=${orgData.rows[r].id} and is_delete=false and status!='closed'`
        );
        let orgConfig = await client.query(
          `select * from public."remainders" where org_id=${orgData.rows[r].id}`
        );
        console.log(`select * from public."remainders" where org_id=${orgData.rows[r].id}`)
        let orgid = orgConfig.rowCount > 0 ? orgData.rows[r].id : 0;
        for (let j = 0; j < tasks.rowCount; j++) {
          //getting the matched record from tasks table
          let assignee = tasks.rows[j].assignee;
          let startdate = tasks.rows[j].start_date;
          let sdate = moment(startdate).format('DD-MM-YYYY')
          let startdate_diff = moment(startdate).diff(moment(), 'd')
          if (startdate_diff > 0) {
            category = "b";
            message = `You have an up coming task ${sdate}`;
            daysin = startdate_diff
            type = 'startdate'
            start = true
          } else {
            //next_notification in task is the duedate
            let duedate = tasks.rows[j].due_date;
            let currentdate = new Date();
            //compare the due date and current date
            let diff_milliscs = Date.parse(duedate) - Date.parse(currentdate);
            var diff_indays = new moment.duration(diff_milliscs);
            diff_indays.asDays();
            let daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            //the days are in positive then beforeoverdue records should get------>
            if (daysin > 0) {
              category = "b";
              message = "Escalation mail sent to Your Reporting manager";
            }
            if (daysin < 0) {
              category = "o";
              message = "Escalation mail sent to Your Reporting manager";
              //changing the -ve days to positiva days
              let diff_milliscs = Date.parse(currentdate) - Date.parse(duedate);
              var diff_indays = new moment.duration(diff_milliscs);
              diff_indays.asDays();
              daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            }
            if (daysin == 0) {
              category = "c";
              message = "Escalation mail sent to Your Reporting manager";
            }
          }
          let category_record = await client.query(
            `select * from public."remainders" where execution='L3' and org_id=${orgid} and min_days>=${daysin} and ${daysin}<=days and days_type='${category}' and status='${tasks.rows[j].status}' and priority='${tasks.rows[j].priority}' and is_enable=true and type='${type}'`
          );
  
          if (category_record.rowCount > 0) {
            let single_task_remainder = category_record.rows[0];
            let trigger_time = category_record.rows[0].timer;
            let last_self_remainder_time = tasks.rows[j].last_escalation2;
            //convert trigger_time to hrs and add to last_self-remaindertime and compare with current_date
            var date = new Date(last_self_remainder_time);
            let last_self_remainder = new Date(Date.parse(date) + trigger_time);
            let compare_remainder_time = last_self_remainder <= new Date();
            if (compare_remainder_time) {
              //getting level-1 reporting managers
              let level1Ids = getall(assignee, 2);
              ///if EMAIL------>
  
              let notificationArray = [];
              let singleobj = {};
              let notification
              let title = tasks.rows[j].name
              let orgid = tasks.rows[j].org_id
              let target_id = tasks.rows[j].id
              let type = "task"
              if (single_task_remainder.email == true) {
                //email to self assignee
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  if (assigneeData.rowCount > 0) {
                    notification = {
                      title: title,
                      user_id: assignee[i],
                      message: `${message}`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: true,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                    //email to reporting managers------>
                    for (let i = 0; i < level1Ids.length; i++) {
                      notification = {
                        title: title,
                        user_id: level1Ids[i],
                        message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to complete` : `${assigneeData.rows[0].name}'s task is in open Need to be close before Due date`,
                        org_id: orgid,
                        target_id: target_id,
                        is_email: true,
                        type: type,
                      };
                      singleobj = notification;
                      notificationArray.push(
                        await getarray2(Object.values(notification))
                      );
                    }
                  }
                }
              }
              if (single_task_remainder.notification == true) {
                //push notification
                //self push notification
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  if (assigneeData.rowCount > 0) {
                    notification = {
                      title: title,
                      user_id: assignee[i],
                      message: `${message}`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: false,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                    //notification to reporting managers------>
                    for (let i = 0; i < level1Ids.length; i++) {
                      notification = {
                        title: title,
                        user_id: level1Ids[i],
                        message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to complete` : `${assigneeData.rows[0].name}'s task is in Over Due Remain him to complete`,
                        org_id: orgid,
                        target_id: target_id,
                        is_email: false,
                        type: type,
                      };
                      singleobj = notification;
                      notificationArray.push(
                        await getarray2(Object.values(notification))
                      );
  
                    }
                  }
                }
              }
              if (notificationArray.length > 0) {
                const queryText = format(
                  `INSERT INTO public."notification"(${Object.keys(
                    singleobj
                  )}) VALUES %L`,
                  notificationArray
                );
                let notification_result = await client.query(queryText);
              }
  
              let current_time = new Date().toISOString();
              let update_last_escalationRemainder = await client.query(
                `UPDATE public."tasks" SET last_escalation2= '${current_time}' where id=${tasks.rows[j].id}`
              );
            }
          }
        }
      }
      return res.json({status:true,message:"Escalation job 2 runs successfully"})
    }catch(error){
      console.log(error)
    }finally {
      client.release()
    }
    
  }else{
    return res.json({status:false,message:"No L3 remainders"})
  }
   
  
}
//escalation_2Job();

async function escalation_3Job(req,res) {
  const client = await pool.connect();
  let type;
  let daysin;
  let category;
  let message;
  let start = false;
  let remainderData = await client.query(
    `select * from public.remainders where execution='L4'`
  );

  if (remainderData.rowCount > 0) {
    try{
      let orgData = await client.query(
        `select * from public."organization" where is_delete=false`
      );
  
      for (let r = 0; r < orgData.rowCount; r++) {
      
        let tasks = await client.query(
          `select * from public."tasks" where org_id=${orgData.rows[r].id} and is_delete=false and status!='closed'`
        );
  
        let orgConfig = await client.query(
          `select * from public."remainders" where org_id=${orgData.rows[r].id}`
        );
        let orgid = orgConfig.rowCount > 0 ? orgData.rows[r].id : 0;
        for (let j = 0; j < tasks.rowCount; j++) {
          ///getting the matched record from tasks table-------
          let assignee = tasks.rows[j].assignee;
          let startdate = tasks.rows[j].start_date;
          let sdate = moment(startdate).format('DD-MM-YYYY')
          let startdate_diff = moment(startdate).diff(moment(), 'd')
          if (startdate_diff > 0) {
            category = "b";
            message = `You have an up coming task on ${sdate}`;
            daysin = startdate_diff
            type = 'startdate'
            start = true
          } else {
            //next_notification in task is the duedate
            let duedate = tasks.rows[j].due_date;
            let currentdate = new Date();
            //compare the due date and current date
            let diff_milliscs = Date.parse(duedate) - Date.parse(currentdate);
            var diff_indays = new moment.duration(diff_milliscs);
            diff_indays.asDays();
            let daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            //the days are in positive then beforeoverdue records should get------>
            let category;
            let message;
            if (daysin > 0) {
              category = "b";
              message = "Escalation mail sent to Your Reporting manager";
            }
            if (daysin < 0) {
              category = "o";
              message = "Escalation mail sent to Your Reporting manager";
              //changing the -ve days to positiva days
              let diff_milliscs = Date.parse(currentdate) - Date.parse(duedate);
              var diff_indays = new moment.duration(diff_milliscs);
              diff_indays.asDays();
              daysin = parseInt(diff_indays.asDays().toString().split(".")[0]);
            }
            if (daysin == 0) {
              category = "c";
              message = "Escalation mail sent to Your Reporting manager";
            }
          }
          let category_record = await client.query(
            `select * from public."remainders" where execution='L4' and org_id=${orgid} and min_days>=${daysin} and ${daysin}<=days and days_type='${category}' and status='${tasks.rows[j].status}' and priority='${tasks.rows[j].priority}' and is_enable=true and type='${type}'`
          );
  
          if (category_record.rowCount > 0) {
            let single_task_remainder = category_record.rows[0];
            let trigger_time = category_record.rows[0].timer;
            let last_self_remainder_time = tasks.rows[j].last_escalation3;
            //convert trigger_time to hrs and add to last_self-remaindertime and compare with current_date------>
            var date = new Date(last_self_remainder_time);
            let last_self_remainder = new Date(Date.parse(date) + trigger_time);
            let compare_remainder_time = last_self_remainder <= new Date();
            ///if the last_self_remainder<= current date------->
            if (compare_remainder_time) {
              ///getting level-3(ALL) reporting managers---------->>>
              let level1Ids = getall(assignee, 3);
              ///if EMAIL------>
              let notificationArray = [];
              let singleobj = {};
              let title = tasks.rows[j].name
              let orgid = tasks.rows[j].org_id
              let target_id = tasks.rows[j].id
              let type = "task"
              if (single_task_remainder.email == true) {
                ///email to self assignee--->
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  if (assigneeData.rowCount > 0) {
                    var notification = {
                      title: title,
                      user_id: assignee[i],
                      message: `${message}`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: true,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                    //   const queryText = await client.query(`INSERT INTO public."notification"(${Object.keys(notification)}) VALUES(${await getarray(Object.values(notification))})`)
                    //   console.log("queryText======",queryText)
                    ///email to reporting managers------>
                    for (let i = 0; i < level1Ids.length; i++) {
                      var notification = {
                        title: title,
                        user_id: level1Ids[i],
                        message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to start` : `${assigneeData.rows[0].name}'s task is in open Need to be close before Due date`,
                        org_id: orgid,
                        target_id: target_id,
                        is_email: true,
                        type: type,
                      };
                      singleobj = notification;
                      notificationArray.push(
                        await getarray2(Object.values(notification))
                      );
  
                    }
                  }
                }
              }
              if (single_task_remainder.notification == true) {
                ///push notification
                //self push notification
                for (let i = 0; i < assignee.length; i++) {
                  let assigneeData = await client.query(
                    `select * from public."users" where id=${assignee[i]}`
                  );
                  if (assigneeData.rowCount > 0) {
                    var notification = {
                      title: title,
                      user_id: assignee[i],
                      message: `${message}`,
                      org_id: orgid,
                      target_id: target_id,
                      is_email: false,
                      type: type,
                    };
                    singleobj = notification;
                    notificationArray.push(
                      await getarray2(Object.values(notification))
                    );
                    //   const queryText = await client.query(`INSERT INTO public."notification"(${Object.keys(notification)}) VALUES(${await getarray(Object.values(notification))})`)
                    //   console.log("queryText======",queryText)
                    //notification to reporting managers------>
                    for (let i = 0; i < level1Ids.length; i++) {
                      var notification = {
                        title: title,
                        user_id: level1Ids[i],
                        message: start == true ? `${assigneeData.rows[0].name} has upcoming task on ${sdate} remind him to complete` : `${assigneeData.rows[0].name}'s task is in Over Due Remain him to complete`,
                        org_id: orgid,
                        target_id: target_id,
                        is_email: false,
                        type: type,
                      };
                      singleobj = notification;
                      notificationArray.push(
                        await getarray2(Object.values(notification))
                      );
                      //   const queryText = await client.query(`INSERT INTO public."notification"(${Object.keys(notification)}) VALUES(${await getarray(Object.values(notification))})`)
                      //   console.log("queryText======",queryText)
                    }
                  }
                }
              }
              if (notificationArray.length > 0) {
                const queryText = format(
                  `INSERT INTO public."notification"(${Object.keys(
                    singleobj
                  )}) VALUES %L`,
                  notificationArray
                );
  
                let notification_result = await client.query(queryText);
              }
              let current_time = new Date().toISOString();
              let update_last_escalationRemainder = await client.query(
                `UPDATE public."tasks" SET last_escalation3= '${current_time}' where id=${tasks.rows[j].id}`
              );
  
            }
          }
        }
      }
      return res.json({status:true,message:"Escalation job 1 runs successfully"})
    }catch(error){
      console.log(error)
      return
    }finally {
      client.release()
    } 
  } else{
    return res.json({status:false,message:"No L4 remainders"})
  }
}
//escalation_3Job();



async function escalations_level(assigneeid, allids, level) {
  try {
    for (var i = 0; i < assigneeid.length; i++) {
      let id = await getReportingManager(assigneeid[i], allids, level, false);
    }
  } catch (error) {
    console.log("error---", error);
  }
}
async function getReportingManager(assigneeid, allids, level, self_call) {
  // user_idsArray.push(assigneeid);
  try {
    const client = await pool.connect();
    let usersquery = `select user_id,reporting_manager from public.user_org where user_id=${assigneeid}`;
    var getSingleUserRes = await client.query(usersquery);
    console.log("getSingleUserRes---", getSingleUserRes.rows, assigneeid)
    if (level == 1) {
      allids.push(getSingleUserRes.rows[0].reporting_manager);
      return;
    } else if (level == 2) {
      if (!self_call) {
        if (
          getSingleUserRes.rowCount <= 0 ||
          getSingleUserRes.rows[0].reporting_manager == 0
        ) {
          return assigneeid;
        } else {
          allids.push(getSingleUserRes.rows[0].reporting_manager);
          let id = await getReportingManager(
            getSingleUserRes.rows[0].reporting_manager,
            allids,
            level,
            true
          );
          // user_idsArray.push(id);
        }
      } else {
        allids.push(getSingleUserRes.rows[0].reporting_manager);
      }
    } else {
      if (
        getSingleUserRes.rowCount <= 0 ||
        getSingleUserRes.rows[0].reporting_manager == 0
      ) {
        return assigneeid;
      } else {
        allids.push(getSingleUserRes.rows[0].reporting_manager);
        let id = await getReportingManager(
          getSingleUserRes.rows[0].reporting_manager,
          allids,
          level,
          true
        );
        // user_idsArray.push(id);
      }
    }
  } catch (error) {
    console.log("error---", error);
  }
}

async function getall(input_ids, level) {
  var allids = [];
  await escalations_level(input_ids, allids, level);
  let all = [...input_ids, ...allids];
  return all;
}

// orgbillingInvoiceStatus();
module.exports.selfEscalationJob = selfEscalationJob;
module.exports.escalation_1Job = escalation_1Job;
module.exports.escalation_2Job = escalation_2Job;
module.exports.escalation_3Job = escalation_3Job;
