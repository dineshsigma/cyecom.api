let fcm = require('../modules/firebase.js');
const express = require('express')
const app = express();
const cors = require('cors')
const pool = require('../config/config').pool
let logsService = require('../config/logservice.js')

app.options('*', cors())
app.use(cors());
app.use(express.json());

async function getarray(data) {
  let data1 = `'`;
  for (let i = 0; i < data.length; i++) {
    data1 += data[i] + `','`
  }
  return data1.substring(0, data1.length - 2);
}

function isObjectEmpty(object) {
  let isEmpty = true;
  for (keys in object) {
    isEmpty = false;
    break;
  }
  return isEmpty;
}

async function sendGraphqlUsermessage(data) {
  let tokens = []

  const client = await pool.connect();
  try {
    for (let i = 0; i < data.assignee.length; i++) {
      let taskAssignedata = await client.query(`SELECT * from public."fcmtoken" where user_id ='${data.assignee[i]}'`);
      let notification = {
        "title": data.title,
        "user_id": data.assignee[i],
        "message": data.message,
        "org_id": data.org_id,
        "target_id": data.target_id,
        "type": data.type
      }

      const queryText = `INSERT INTO public."notification"(${Object.keys(notification)}) VALUES(${await getarray(Object.values(notification))}) RETURNING id`
      let notification_result = await client.query(queryText);

      let fcmtoken = isObjectEmpty(taskAssignedata.rows) ? "undefined" : taskAssignedata.rows[0].fcm_token;
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
  }

}


module.exports.sendGraphqlUsermessage = sendGraphqlUsermessage

