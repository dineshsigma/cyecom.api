const pool = require('../config/config').pool
const CryptoJS = require("crypto-js");
let email_module = require('../modules/email')
let config = require('../config/config.js').config;
const moment = require('moment');
const awsmodule = require('../modules/aws')
// const secret = process.env.SECRET
const secret = config.secret;
let send_mail = require('../modules/email')
const otplib = require('otplib');
const { getDiff } = require('json-difference');
const format = require('pg-format');
let type = require('type-of');
let logsService = require('../config/logservice.js')

otplib.authenticator.options = {
  step: 900,
  window: 1,
  digits: 6
};

async function getarray(data) {
  var data1 = `'`;
  for (var i = 0; i < data.length; i++) {

    data1 += data[i] + `','`
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

async function graphqlCreateUser(req, res) {//Create a new user in the organization,api
  let body = req.body.input.arg1;
  const client = await pool.connect();
  try {
    await client.query('BEGIN')
    //user delete check query by getting from users and user org table
    let userGet = await client.query(`select ur.id from public."users" us,public.user_org ur where ur.user_id=us.id and us.phone='${body.user.phone}' and ur.org_id=${body.org_id} and ur.is_delete=false`);
    let userid = 0;//assume user id equal to 0
    let usertype = 'exist';//assume usertype as exist
    if (userGet.rows.length > 0) {//if the user exist 
      userid = userGet.rows[0].id;//userid equal to the response from user get query
      usertype = 'exist';
      return res.json({ status: false, message: "Duplicate user" })//if the user exists in database then it shows error message as already exists
    } else {
      let queryuserfind = await client.query(`select * from public."users" where phone='${body.user.phone}'`);//get user details by getting user by phone
      let queryuserfind2 = await client.query(`select * from public."users" where email ='${body.user.email}' and email IS NOT NULL and email NOT LIKE ''`);//get user where email is not equal to null
      if (queryuserfind2.rowCount > 0) {//if exists
        return res.json({ status: false, message: `Duplicate email:${body.user.email}` })//if exists then its shows error as already email exists
      }
      if (queryuserfind.rows.length > 0) {
        userid = queryuserfind.rows[0].id;//if the user exists in user table but not present in user org with the sme organization
        usertype = 'new';//take the user as new
      } else {
        //insert user into user table
        const userqueryText = `INSERT INTO public."users"(${Object.keys(body.user)}) VALUES(${await getarray(Object.values(body.user))}) RETURNING id`
        let userresult = await client.query(userqueryText);
        userid = userresult.rows[0].id
        usertype = 'new';

      }

    }

    let user_org = {//making users organization data
      "location_id": body.location_id,
      "department_id": body.department_id,
      "role_id": body.role_id,
      "reporting_manager": body.reporting_manager,
      "designation_id": body.designation_id,
      "user_id": userid,
      "org_id": body.org_id,
      "is_active": true
    }
    //insert user in user_org
    let user_orgqueryText = `INSERT INTO public."user_org"(${Object.keys(user_org)}) VALUES(${await getarray(Object.values(user_org))}) RETURNING id`
    let userorgresult = await client.query(user_orgqueryText);

    if (usertype == 'new') {//if the user is new means he is not an existed user in users and user org table
      //decrypt the password and send it to the user----------
      let userGetPass = `select * from public."users" where id='${userid}'`;//getting users data
      let userres = await client.query(userGetPass);
      let bytes = CryptoJS.AES.decrypt(userres.rows[0].password, secret);//decrypting the password
      let decrypted = bytes.toString(CryptoJS.enc.Utf8);
      let mail = userres.rows[0].email
      let to = mail;

      send_mail.send_mail(to, 'PASSWORD', decrypted, [])//sending the decrypted password to the user
      //------------------check the mail by sending verifcation link to user consisitng email---->>>>
      if (mail != undefined && mail != "undefined" && mail != '' && mail) {
        let date = new Date();
        date = moment(date).format('YYYYMMDD');

        let text = `${mail}-${date}`
        //Encrypt
        let ciphertext = CryptoJS.AES.encrypt(text, secret).toString();
        ciphertext = encodeURIComponent(ciphertext)

        let url_path = `${config.domainurl}/api/user/url_path?userid=${userid}&verifyEmail=${ciphertext}`//creating link 

        const email = mail

        let message = {
          'link': url_path,
        }
        await email_module.sendEmailVerifyLink(email, "Verify Email", "/templates/emailVerifyLink.ejs", message)//sending the verification email link to user
      }
    }
    await client.query('COMMIT')

    //client.release()
    return res.status(200).json({ status: true, message: "user created successfully" })

  } catch (error) {
    logsService.log('error', req, error + "");
    await client.query('ROLLBACK')
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
    //  client.end()
  }
}

async function userLogs(req, res) {//Saving the users table end to end activity as logs
  let user = req.body.event.data;

  let logObj = {}
  let obj = {}
  const client = await pool.connect();
  try {
    if (user.new.is_delete != true) {//if the user is not deleted means exists 
      let context;
      if (user.old) {//if the user object consists old
        let editedField = getDiff(user.old, user.new)//taking difference between old and new object
        context = {
          "field_name": editedField.edited[0][0],
          "from": editedField.edited[0][1],
          "to": editedField.edited[0][2]
        }

      }
      logObj = {
        operation: user.old ? "UPDATE" : "CREATE",//taking operation as update or delete,if it contains old object then it takes update or it takes create
        json: user.old ? JSON.stringify([user.new, user.old]) : JSON.stringify(user.new),//takes entire object as json
        context: user.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        created_by: user.new.created_by
      }
    } else {
      logObj = {//if the object s is delete is true then the users delete is true means user deleted
        operation: "DELETE",
        json: JSON.stringify(user.new),
        ip_address: "",
        created_by: user.new.created_by
      }
    }
    obj = logObj
    const queryText = `INSERT INTO public."users_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
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

async function userOrgLogs(req, res) {//Saving the user with organization table end to end activity as logs
  let userOrg = req.body.event.data;
  let logObj = {}
  let obj = {}
  let notificationArray = [];
  let singleobj = {};
  let orgid = userOrg.new.org_id;
  let target_id = userOrg.new.id;

  const client = await pool.connect();
  try {
    if (userOrg.old) {
      let editedField = getDiff(userOrg.old, userOrg.new)//compares the difference between users new object and old object
      let context //taking a vaariable context
      if (editedField.edited.length > 0) {//if the field is edited 
        context = {
          "field_name": editedField.edited[0][0],//taking field name which is effected (or) changed
          "from": editedField.edited[0][1],//from which 
          "to": editedField.edited[0][2]//to which
        }
      } else {//if field is not edited 
        context = {
          "field_name": "alias_user",//taking field name which is effected (or) changed
          "from": userOrg.old.alias_user,//from which 
          "to": userOrg.new.alias_user//to which
        }
      }
      if (editedField.added.length > 0 || editedField.removed.length > 0) {//if edited and removed length is more than one
        let userData = await client.query(`SELECT * from public."users" where id = '${userOrg.new.user_id}' and is_delete = false`);//getting user data with user id taken from new object
        if (editedField.added.length > 0 && editedField.added[0].length > 0 && type(editedField.added[0][1]) != 'array') {
          //added users notification saving
          for (let i = 0; i < editedField.added.length; i++) {//if the added users length is more than one
            let addedUser = editedField.added[i][1]//taking user
            let notification = {//build notification object
              title: "added as alias user",//title for the push notification 
              user_id: addedUser,//users id
              message: `You added as a alias user for ${userData.rows[0].name}`,//message in the notification
              org_id: orgid,//organization id
              target_id: target_id,//the task id 
              context: context,
              is_email: true//taking is email true means send the email
            }
            singleobj = notification;

            notificationArray.push(await getarray2(Object.values(notification)))
          }

        }
        //finding removed users
        //removedUsers notification saving-----
        if (editedField.removed.length > 0 && editedField.removed[0].length > 0 && type(editedField.removed[0][1]) != 'array') {
          for (let i = 0; i < editedField.removed.length; i++) {//if the removed users are more than one 
            let removedUser = editedField.removed[i][1]//taking removed users
            let notification = {
              title: "removed as alias user",
              user_id: removedUser,
              message: `${userData.rows[0].name} Removed you as alias user`,
              org_id: orgid,
              target_id: target_id,
              context: context,
              is_email: true
            }
            singleobj = notification;
            notificationArray.push(await getarray2(Object.values(notification)))
          }
        }
        if (notificationArray.length > 0) {
          const queryText = format(`INSERT INTO public."notification"(${Object.keys(singleobj)}) VALUES %L`, notificationArray)
          let notification_result = await client.query(queryText);
        }
        return;

      }
      //general field update notification saving
      logObj = {//if the field is not added or removed then it takes as general field update like update or create
        operation: userOrg.old ? "UPDATE" : "CREATE",
        json: userOrg.old ? JSON.stringify([userOrg.new, userOrg.old]) : JSON.stringify(userOrg.new),
        context: userOrg.old ? JSON.stringify(context) : JSON.stringify({}),
        ip_address: "",
        //created_by : userOrg.new.created_by
      }
    }

    obj = logObj
    const queryText = await client.query(`INSERT INTO public."user_org_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`)
    return res.status(200).json({ status: true, message: "log created successfully" })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
  finally {
    client.release()
  }
}

async function userExistCheckInCreate(req, res) {//user existing check while creating a user
  let org_id = req.body.session_variables["x-hasura-orgid"]
  let phone = req.body.input.arg1.phone
  const client = await pool.connect();
  try {
    //Getting user through phone number and organization
    let userGet = await client.query(`select ur.id from public."users" us,public.user_org ur where ur.user_id=us.id and us.phone='${phone}' and ur.org_id=${org_id} and ur.is_delete=false`);
    if (userGet.rowCount > 0) {//if the user count more than one means if user exists
      return res.status(409).json({ data: [], response: { status: false, message: "Duplicate user" } })//i returns duplicate user response
    }
    let queryuserfind = await client.query(`select * from public."users" where phone='${phone}'`);//it selects the user with given phone number but not with organization
    if (queryuserfind.rowCount > 0) {//if user with phone number exists 
      return res.status(200).json({ data: queryuserfind.rows[0], response: { status: true, message: '' } })//returns the response of the user
    } else {
      return res.status(200).json({ data: [], response: { status: true, message: `` } })//Else it returns an empty response
    }
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}


async function urlpath(req, res) {//getting a signed url path
  let folderpath = req.query.folderpath;
  let filename = req.query.filename;
  try {
    let geturl = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')
    res.redirect(geturl)
  } catch (error) {
    logsService.log('error', req, error + "")
  }

}

async function url_path(req, res) {//Enables Email verified true for user 
  let userid = parseInt(req.query.userid);//getting user id from query params
  const client = await pool.connect();
  try {
    let getUser = await client.query(`update public.users set is_email_valid=true where id=${userid}`)//updating is email valid true for user

    res.redirect(`'${config.url}/emailverified'`)//shows email verified succesfully pop up 

  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }

}


module.exports.url_path = url_path;
module.exports.urlpath = urlpath;
module.exports.graphqlCreateUser = graphqlCreateUser;
module.exports.userLogs = userLogs;
module.exports.userOrgLogs = userOrgLogs;
module.exports.userExistCheckInCreate = userExistCheckInCreate

