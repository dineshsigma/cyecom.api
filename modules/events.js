let events = require('events');
const eventEmitter = new events.EventEmitter();
let config = require('../config/config.js').config;
const moment = require('moment');
let configuration = require('../controllers/configuration');
const fs = require("fs");
const json2xls = require('json2xls');
const pool = require('../config/config').pool
const CryptoJS = require("crypto-js");
// const secret = process.env.SECRET
const secret = config.secret;
const axios = require('axios');
let email_module = require('../modules/email')
let logsService = require('../config/logservice.js')
async function getarray(data) {
  let data1 = `'`;
  for (let i = 0; i < data.length; i++) {
    data1 += data[i] + `','`

  }
  return data1.substring(0, data1.length - 2);
}

function generatePassword() {
  let pass = '';
  const secret = config.secret;
  var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz0123456789@#';
  for (let i = 1; i <= 12; i++) {
    var char = Math.floor(Math.random()
      * str.length + 1);
    pass += str.charAt(char)
  }
  let password = CryptoJS.AES.encrypt(pass, secret).toString();
  return password;
}

//Emmiter for upload Users
eventEmitter.on('usercsvupload', async (jsonObj) => {
  let user_mail = jsonObj.email

  let new_records = jsonObj.new_records;
  let org_id = jsonObj.org_id;
  const client = await pool.connect();
  var response;
  let new_user_array = []
  for (let i = 0; i < new_records.length; i++) {
    let item = new_records[i];
    try {
      //generate the random password and encrypt it to save
      const password = generatePassword();
      //user creation
      let avatarBrColors = ['--br-danger', '--br-dark', '--br-info', '--br-primary', '--br-success', '--br-warning']

      let queryuserfind = await client.query(`select * from public."users" where phone='${item.phone}'`);
      let user_id = 0;
      if (queryuserfind.rows.length > 0) {
        user_id = queryuserfind.rows[0].id;
      } else {
        let usersobj = {
          "name": item.name,
          "lastname": item.lastname,
          "email": item.email != undefined && item.email != "undefined" && item.email ? item.email : "",
          "phone": item.phone,
          "password": password,
          "color": avatarBrColors[Math.floor(Math.random() * avatarBrColors.length)],
          "is_active": false,
          "is_delete": false
        }
        const userqueryText = `INSERT INTO public."users"(${Object.keys(usersobj)}) VALUES(${await getarray(Object.values(usersobj))}) RETURNING id`;
        let insertuserdata = await client.query(userqueryText);
        user_id = insertuserdata.rows[0].id;

      }

      let user_orgObj = {
        "location_id": item.location_id,
        "department_id": item.department_id,
        "role_id": item.role_id,
        "designation_id": item.designation,
        // "reporting_manager": reporting_manager,
        "org_id": org_id,
        "is_active": false,
        "user_id": user_id
      }
      const userOrgqueryText = `INSERT INTO public."user_org"(${Object.keys(user_orgObj)}) VALUES(${await getarray(Object.values(user_orgObj))}) RETURNING id`;
      let insertuserOrgdata = await client.query(userOrgqueryText);
      //check the mail by sending verifcation link to user consisitng email
      if (item.email != undefined && item.email != "undefined" && item.email) {
        let date = new Date();
        date = moment(date).format('YYYYMMDD');

        let text = `${item.email}-${date}`
        //Encrypt
        let ciphertext = CryptoJS.AES.encrypt(text, secret).toString();
        ciphertext = encodeURIComponent(ciphertext)

        let url_path = `${config.domainurl}/api/user/url_path?userid=${user_id}&verifyEmail=${ciphertext}`

        const email = item.email

        let message = {
          'link': url_path,
        }
        //send Email to user
        await email_module.sendEmailVerifyLink(email, "Verify Email", "/templates/emailVerifyLink.ejs", message)
      }

      ///decrypt the encrypted random password send to given user mail
      let userGetPass = `select * from public."users" where id='${user_id}'`;
      let userres = await client.query(userGetPass);
      let bytes = CryptoJS.AES.decrypt(userres.rows[0].password, secret);  //temporary disabled Auto generation password
      let decrypted = bytes.toString(CryptoJS.enc.Utf8);

      let data = {
        "username": userres.rows[0].name,
        "phone": userres.rows[0].phone,
        "password": decrypted
      }
      new_user_array.push(data)

    } catch (error) {
      logsService.log('error', req, error + "")
      is_error = true
      response = error;
    }

  }
  await updateRepoManagersJob(new_records, org_id)//updates reporting managers of inserted users
  const json = new_user_array

  const xls = json2xls(json);
  fs.writeFileSync('usersPasswords.xlsx', xls, 'binary');

  const attachmentContent = await fs.readFileSync('usersPasswords.xlsx');

  let file = await configuration.getReportFileUploadUrl('usersPasswords.xlsx', org_id, 'usercsvreport')

  let fileconfig = {
    method: 'put',
    url: file.url,
    headers: {
      'Content-Type': 'application/xlsx'
    },
    data: attachmentContent
  };

  axios(fileconfig)
    .then(function (response) {
    })
    .catch(function (error) {
      console.log(error);
    });

  let urlpath = `${config.domainurl}/api/user/urlpath?filename=usersPasswords.xlsx&folderpath=${file.folderpath}`

  let getcsvReportObj = {
    "org_id": org_id,
    "filename": 'usersPasswords.xlsx',
    "url": urlpath,
    "folderpath": file.folderpath,
    "type": "report"
  }
  const queryText = `INSERT INTO public."user_csv_reports"(${Object.keys(getcsvReportObj)}) VALUES(${await getarray(Object.values(getcsvReportObj))}) RETURNING id`;
  let insertreportdata = await client.query(queryText);
  let to_mail = user_mail;
  client.release()
  ////passwords emails sent to owner------->
  const msg = {

    to: to_mail,
    from: 'noreply@cyechamp.com',
    subject: 'PASSWORDS',
    text: urlpath,
    html: `'<a target="#" href='${urlpath}'>${urlpath}</a>'`,
    attachments: [],

  }
  var response = await email_module.send_template_mail(msg)
  return;
}
)

//update reporting managers of users Job
async function updateRepoManagersJob(new_records, org_id) {
  const client = await pool.connect();
  for (let i = 0; i < new_records.length; i++) {
    let item = new_records[i];
    try {
      let queryuserfind = await client.query(`select * from public."users" where phone='${item.phone}'`);
      if (queryuserfind.rowCount > 0) {

        let user_id = queryuserfind.rows[0].id
        let repomanagerfind = await client.query(`select * from public."users" where phone='${item.reporting_manager}'`);
        if (repomanagerfind.rowCount > 0) {
          repo_id = repomanagerfind.rows[0].id
          let updatequery = await client.query(`update public.user_org set reporting_manager=${repo_id},is_active=true where user_id=${user_id} and org_id=${org_id}`)
        }
      }
    } catch (error) {
      logsService.log('error', req, error + "")
    }
  }
  return
}


module.exports.eventEmitter = eventEmitter;