// let moment=require('moment')
// var crypto = require("crypto");
// var algorithm = "aes-192-cbc"; 
// const secret = "Y3llY29tbG9naW5lbmNyeXB0aW9u";
// const key = crypto.scryptSync(secret, 'salt', 24); 
// var text= "123456"; 

// const iv = crypto.randomBytes(16); // generate different ciphertext everytime
// const cipher = crypto.createCipheriv(algorithm, key, iv);
// var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex'); // encrypted text
// console.log("encrypted-----",encrypted);
// const decipher = crypto.createDecipheriv(algorithm, key, iv);
// var decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
// console.log("decrypted------",decrypted);
//console.log(new Date().toISOString())
   
//   var CryptoJS = require("crypto-js");
// const secret ="Y3llY29tbG9naW5lbmNyeXB0aW9u"
// var text = '123456789'
// //Encrypt
// // var ciphertext = CryptoJS.AES.encrypt(text,secret).toString();
// // console.log("ciphertext-------",ciphertext)
// // Decrypt
// var bytes  = CryptoJS.AES.decrypt('U2FsdGVkX19Nxg5/HCqS8oNJ+dDdXQ1R93h0fDAy/cA=', secret);
// var originalText = bytes.toString(CryptoJS.enc.Utf8);
// let date = '2023-04-08T04:38:19.902Z'
//  console.log("originalText-------",originalText)

// console.log(new Date().getMilliseconds()+300000)
//     let seconds = Math.floor(milliseconds / 1000);
//     let minutes = Math.floor(seconds / 60);
//     let hours = Math.floor(minutes / 60);
  
//     seconds = seconds % 60;
//     minutes = minutes % 60;
//     hours = hours % 24;
//     return hours
// }
// var date = new Date('2023-03-08T04:56:09.248Z');
//console.log(new Date().getMilliseconds()+15778800000)
// let hours =(convertMsToTime(85400000))
// console.log(new Date())
//  console.log(new Date(Date.parse('2023-03-08T12:13:02.555Z') +86400000))
// console.log(new Date(date.setHours(date.getHours() + hours)))
// console.log(originalText); // 'my message'
// var date = new Date();
// date.setDate(date.getDate() - 7);

// console.log(date);
// async function dinesh(){


// function fibonacciRecursive(n) {
//     if (n <= 1) {
//       return n;
//     } else {
//       return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
//     }
//   }


  // Generate the first 10 numbers in the Fibonacci series
//   for (let i = 0; i < 10; i++) {
//     console.log(fibonacciRecursive(i));
//   }
// let jsondata={
//     "type": "WHEN",
//     "title": "STATUS_CHANGE",
//     "jsons": {
//       "key": "STATUS_CHANGE",
//       "title": "status change",
//       "fields": [
//         {

//           "field_name": "from",

//           "type": "dropdown",

//           "values": ['Not Started', 'Active', 'Done', 'Closed']

//         },

//         {

//           "field_name": "to",

//           "type": "dropdown",

//           "values": ['Not Started', 'Active', 'Done', 'Closed']

//         }

//       ]
//     }
//   }


//"privacy": [{ "privacy": "private" }, { "privacy": "Non-participants can view" }, { "privaccy": "Non-participants can join" }, { "privaccy": "Non-participants can edit" }],
//   var quantity_data = JSON.stringify({

//     query: `mutation insert_workflows_one($object: workflow_insert_input!) {
//         insert_workflow_one(object: $object) {
//             id
//          }
//       }`,

//     variables: { "object": jsondata}

// });


// var insertquantityconfig = {

//     method: 'post',

//     url: 'https://cyecom-qa.hasura.app/v1/graphql',

//     headers: {

//         'x-hasura-admin-secret': 'UE1zjvH32oUZy4WeN5jylkGs4bJGVrpIpA7bGk27Xt47YokeVvHdMGl8hPSmXoHs',

//         'Content-Type': 'application/graphql'

//     },

//     data: quantity_data

// };
// let insertQuantityData = await axios(insertquantityconfig);
// console.log(insertQuantityData.data);
// }


// dinesh();


// async function workflow() {

//   // engine.addRule({
//   //     conditions: {

//   //             all: [{
//   //                 fact: 'fromStatus',
//   //                 operator: 'equal',
//   //                 value: 'Inprogress'
//   //             }, {
//   //                 fact: 'toStatus',
//   //                 operator: 'equal',
//   //                 value: 'Testing'
//   //             }]

//   //     },


//   //     event: {
//   //         type: 'AssigneetoTestingTeam',
//   //         params: {
//   //             "username": "Vamsi Krishna"
//   //         }
//   //     }
//   // })


//   // engine.addRule({
//   //     conditions: {

//   //             all: [{
//   //                 fact: 'fromPriority',
//   //                 operator: 'equal',
//   //                 value: 'High'
//   //             }, {
//   //                 fact: 'toPriority',
//   //                 operator: 'equal',
//   //                 value: 'Medium'
//   //             }]

//   //     },

//   //     event: {  
//   //         type: 'AssigneetoTestingTeamHigh',
//   //         params: {
//   //            user_name:'Vamsi Krishna 2'
//   //         }
//   //     }
//   // })


//   // let facts = {
//   //     fromStatus: 'Inprogress',
//   //     toStatus: 'Testing',
//   //     fromPriority: 'High1',
//   //     toPriority: 'Medium'

//   // }

//   //alll---all matches
//   //any ---any one condition

//   let TaskRule = {
//     conditions: {
//       all: [
//         {
//           fact: 'Tasks',
//           operator: 'equal',
//           value: 'In progress',
//           path: '$.status'
//         },
//         {
//           fact: 'Tasks',
//           operator: 'equal',
//           value: 'High',
//           path: '$.priority'
//         },

//       ]
//     },
//     event: {
//       type: 'Tasks',
//       params: {
//         message: 'Change status'
//       }
//     }
//   }

//   let AssigneeRule = {
//     conditions: {
//       all: [
//         {
//           fact: 'Assignee',
//           operator: 'equal',
//           value: 'dinesh',
//           path: '$.username'
//         }


//       ]
//     },
//     event: {
//       type: 'Assignee',
//       params: {
//         message: 'Change  Assignee'
//       }
//     }
//   }
//   // let microsoftRule2 = {
//   //   conditions: {
//   //     all: [{
//   //       fact: 'account-information',
//   //       operator: 'equal',
//   //       value: 'microsoft',
//   //       path: '$.company' // access the 'company' property of "account-information"
//   //     }, {
//   //       fact: 'account-information',
//   //       operator: 'in',
//   //       value: ['active', 'paid-leave'], // 'status' can be active or paid-leave
//   //       path: '$.status' // access the 'status' property of "account-information"
//   //     }, {
//   //       fact: 'account-information',
//   //       operator: 'contains', // the 'ptoDaysTaken' property (an array) must contain '2016-12-25'
//   //       value: '2016-12-25',
//   //       path: '$.ptoDaysTaken' // access the 'ptoDaysTaken' property of "account-information"
//   //     }]
//   //   },
//   //   event: {
//   //     type: 'microsoft-christmas-pto-2',
//   //     params: {
//   //       message: 'current microsoft employee taking christmas day on'
//   //     }
//   //   }
//   // }

//   engine.addRule(TaskRule)
//   engine.addRule(AssigneeRule)
//   let facts =
//   {
//     "Tasks": { status: 'In progress', "priority": "High" },
//     "Assignee": { username: 'dinesh' }
//   }



//   engine
//     .run(facts)
//     .then(({ events }) => {
//       console.log("events.........", events);
//       events.map(event => console.log(event.params.message))
//     })

// }




// workflow();

// var crypto = require('crypto');
// var assert = require('assert');

// var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
// var key = 'Y3llY29tbG9naW5lbmNyeXB0aW9u';
// var pass = 'encrypt the password';

// var cipher = crypto.createCipher(algorithm, key);  
// var encrypted = cipher.update(pass, 'utf8', 'hex') + cipher.final('hex');
// console.log("encrypted",encrypted)
// var decipher = crypto.createDecipher(algorithm, key);
// var decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
// console.log("decrypted",decrypted)
// assert.equal(decrypted, pass);


// var token = sjwt.encode(payload, process.env.PRIVATE, "RS256",{

//     expiresIn: '1s' // expires in 365 days

// })

// setTimeout(function() {
// var decoded = sjwt.decode(token, secret);
// console.log(decoded);
// }, 2000);

// async function getAssignees(managerid,allids,tasks_list){ 
//     try{
//        // console.log('managerid.......',managerid);
//         let getSingleUserRes = await client.query(`select user_id from public.user_org where reporting_manager=${managerid} and org_id=${org_id}`); 
//         //console.log("getSingleUserRes---",getSingleUserRes.rowCount,managerid)    
//         if(getSingleUserRes.rowCount<=0){ 
//             return managerid 
//         }else{
//             for(let i=0;i<getSingleUserRes.rowCount;i++){   
//                 allids.push(getSingleUserRes.rows[i].user_id);
//                 let tasksquery = await client.query(`select * from public."tasks" where assignee @> '[${getSingleUserRes.rows[i].user_id}]' and org_id = ${org_id}`)
//                 //console.log("taskssssssssssss",tasksquery.rows)
//                 if(tasksquery.rowCount>0){
//                     for(let j=0;j<tasksquery.rowCount;j++){
//                           let filter = tasksquery.rows.filter((value) => !value.name.includes(tasksquery.rows[j].name))
//                             tasks_list.push(filter)
//                         }
//                 }  
//                 let id= await getAssignees(getSingleUserRes.rows[i].user_id,allids,tasks_list);     
//             }    
//         } 
//         }
//             catch(error){
//                 console.log("error---",error); 
//             }
//   } 
//   async function getall(input_id){ 
//             var allids=[];
//             let tasks_list=[]
//             await getAssignees(input_id,allids,tasks_list); 
//             let all=[input_id,...allids,...tasks_list]
//             console.log('user_idsArray.......final......onely+++++++++++',tasks_list);
//            // console.log('user_idsArray.......final',all);
//             return tasks_list;
//   }
  

// getall(user_id)
//console.log(new Date().getMonth()+1)

//USERS CSV UPLOAD MAIN CODE------------------->>>
// async function userCsvValidation(req, res) {
//     var folderpath = req.body.folderpath
//     var filename = req.body.filename
//     let email = req.body.email;
//     let org_id = req.params.id;
//     var url = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')//generates a signed url from AWS
//     // const pool = new Pool(config.dbconnection)
//     const client = await pool.connect();
//     if (filename.split('.').pop() == "xlsx") {
//         try {
//             var user_get_csv_config = {
//                 method: 'GET',
//                 url: url,
//                 headers:
//                 {
//                     'Content-Type': 'application/json'
//                 }
//             };
//             const options = {//getting url by using axios
//                 url,
//                 responseType: "arraybuffer"
//             }
//             let axiosResponse = await axios(options);

//             const workbook = XLSX.read(axiosResponse.data);//inserting the data in to 
//             var users_json = XLSX.utils.sheet_to_json(workbook.Sheets['Users'])
//             var new_records = [];
//             var new_names = [];

//             var jsonObj = users_json.filter(word => word.id == "" || word.id == undefined);
//             for (var i = 0; i < jsonObj.length; i++) {
//                 var item = jsonObj[i];

//                 if (item.id == "" || item.id == undefined) {
//                     if (item.reporting_manager == "" || item.reporting_manager == undefined) {
//                         return res.json({ "status": false, "message": `${item.name} must have reporting_manager ` });
//                     }
//                     if (item.name == "" || item.name == undefined || item.name.includes("'")) {
//                         return res.json({ "status": false, "message": `${item.name}  user name should not be empty ` });
//                     }
//                     if (item.lastname == "" || item.lastname == undefined || item.name.includes("'")) {
//                         return res.json({ "status": false, "message": `${item.name}  user lastname should not be empty ` });
//                     }

//                     if (item.phone == "" || item.phone == undefined) {
//                         return res.json({ "status": false, "message": `${item.name}  user phone should not be empty ` });
//                     }
//                     //mobile number validation--->
//                     if (item.phone.toString().length > 10) {
//                         return res.json({ "status": false, "message": `${item.phone} mobile number should not exceed 10 digits ` })
//                     }
//                     if (item.location_id == "" || item.location_id == undefined) {
//                         return res.json({ "status": false, "message": `${item.name}  user location_id should not be empty ` });
//                     }
//                     if (item.department_id == "" || item.department_id == undefined) {
//                         return res.json({ "status": false, "message": `${item.name}  user department_id should not be empty ` });
//                     }

//                     if (item.designation_id == "" || item.designation_id == undefined) {
//                         return res.json({ "status": false, "message": `${item.name}  user designation should not be empty ` });
//                     }
//                     if (item.name.includes("'") || item.name.includes(",") || item.lastname.includes("'") || item.lastname.includes(",") || item.phone.toString().includes("'") || item.phone.toString().includes(",")) {
//                         return res.json({ "status": false, "message": "value should not contain singlequote(') or comas(,)" });
//                     }
//                     try {

//                         //check location 
//                         let locname = item.location_id.toLowerCase();
//                         locname = locname.trim();
//                         locname = locname.replace(/ /g, "")
//                         let querylocation = await client.query(`select * from public."locations" where name='${locname}' and org_id=${org_id}`);

//                         if (querylocation.rows.length > 0) {
//                             item.location_id = querylocation.rows[0].id;
//                         }
//                         else {
//                             return res.json({ "status": false, message: `${item.location_id} location does not exists` })
//                         }
//                         //check department
//                         let depname = item.department_id.toLowerCase();
//                         depname = depname.trim();
//                         depname = depname.replace(/ /g, "")
//                         let querydepartment = await client.query(`select * from public."department" where name='${depname}' and org_id='${org_id}'`);

//                         if (querydepartment.rows.length > 0) {
//                             item.department_id = querydepartment.rows[0].id;
//                         }
//                         else {
//                             return res.json({ "status": false, message: `${item.department_id} department does not exists` })
//                         }
//                         //check roles
//                         let rolename = item.role_id.toLowerCase();
//                         rolename = rolename.trim();
//                         rolename = rolename.replace(/ /g, "")
//                         let queryroles = await client.query(`select * from public."roles" where name='${rolename}'`);

//                         if (queryroles.rows.length > 0) {
//                             item.role_id = queryroles.rows[0].id;
//                         }
//                         else {
//                             return res.json({ "status": false, message: `${item.role_id} roles does not exists` })
//                         }
//                         //check desigination
//                         let desname = item.designation_id.toLowerCase();
//                         desname = desname.trim();
//                         desname = desname.replace(/ /g, "")

//                         let querydesigination = await client.query(`select * from public."designation" where name='${desname}' and org_id='${org_id}'`);

//                         if (querydesigination.rows.length > 0) {
//                             item.designation = querydesigination.rows[0].id;
//                         }
//                         else {
//                             return res.json({ "status": false, message: `${querydesigination.rows[0].name} designation does not exists` })
//                         }
//                         //check users with phone ------------>
//                         let queryusers = await client.query(`select ur.id as id from public."users" us,public.user_org ur where ur.user_id=us.id and us.phone='${item.phone}' and ur.org_id=${org_id} and ur.is_delete=false`);

//                         if (queryusers.rows.length > 0) {

//                             return res.json({ "status": false, message: `${item.phone} duplicate mobilenumber ` })
//                         }
//                         //check user with email
//                         let queryusersemail = await client.query(`select * from public."users" where email='${item.email}' and email IS NOT NULL and email NOT LIKE 'undefined'`);

//                         if (queryusersemail.rows.length > 0) {
//                             return res.json({ "status": false, message: `${item.email} email already  exists` })
//                         }
//                         //check users in reporting_manager
//                         let queryreportmanager = await client.query(`select * from public."users" where phone='${item.reporting_manager}'`);

//                         if (queryreportmanager.rows.length > 0) {
//                             if (new_names.indexOf(item.phone) == -1) {
//                                 new_names.push(item.phone);
//                                 new_records.push(item);
//                             }
//                             else {
//                                 return res.json({ "status": false, message: `${item.phone} duplicate mobilenumber in the same sheet ` })
//                             }

//                         }
//                         else {
//                             //console.log("new_names-----",new_names,item.phone)
//                             var find = new_names.filter(phone => phone == item.reporting_manager);
//                              console.log("find-----",find,find.length)
//                             if (find.length > 0) {
//                                 if (new_names.indexOf(item.phone) == -1) {
//                                     new_names.push(item.phone);
//                                     new_records.push(item);
//                                 }
//                                 else {
//                                     return res.json({ "status": false, message: `${item.phone} duplicate mobilenumber in the same sheet ` })
//                                 }
//                             } else {
//                                 return res.json({ "status": false, "message": `${item.reporting_manager} reporting manager not found` });
//                             }
//                         }

//                     } catch (error) {
//                         console.log(error)
//                         return res.json({ "status": false, message: error })
//                     }
//                 }
//             }

//             var csvReportObj = {
//                 "org_id": org_id,
//                 "filename": filename,
//                 "url": url,
//                 "folderpath": folderpath,
//                 "type": "upload"
//             }
//             const queryText = `INSERT INTO public."user_csv_reports"(${Object.keys(csvReportObj)}) VALUES(${await getarray(Object.values(csvReportObj))}) RETURNING id`;
//             var insertreportdata = await client.query(queryText);

//             eventEmitter.emit('usercsvupload', { new_records: new_records, org_id: org_id, users_json: users_json, email: email });
//             res.json({ "status": true, message: "users uploaded successfully" })
//         }
//         catch (error) {
//             console.log(error)
//             res.json({ "status": false, message: error })
//         }
//         finally {
//             client.release()
//             //  client.end()
//         }
//     } else {
//         return res.json({ "status": false, message: 'please upload valid xlsx file ' })
//     }
// }

///TASK FILTER------>>
// async function taskFilter(req, res) {
//   var org_id = req.body.session_variables["x-hasura-orgid"]
//   // let user_id = req.body.session_variables["x-hasura-user-id"]
//   var body = req.body.input.arg1;
//   //console.log("bodyyyyyyyyyyyy", body)
//   const client = await pool.connect();
//   let taskQuery;
//   let basequery = '';
//   let assignee = ''
//   try {
//     if (body.status.length > 0) {
//       basequery = basequery + `and status in (${await getarray(body.status)}) `
//     }
//     if (body.priority.length > 0) {
//       basequery = basequery + `and priority in (${await getarray(body.priority)}) `
//     }
//     if (body.start_date != "") {
//       basequery = basequery + `and start_date >= '${body.start_date}' `
//     }
//     if (body.due_date != "") {
//       basequery = basequery + `and due_date <= '${body.due_date}' `
//     }
//     if (body.team_tasks.length != "" || body.team_tasks.length > 0) {
//       let users = body.team_tasks;
//       assignee = `assignee @> ANY ('{${users}}') and assignee!='[]'`
//     } else {
//       assignee = `assignee @> '${body.assignee}' and assignee!='[]'`
//     }
//     //console.log("basequeryyy",basequery)
//     if (basequery) {
//       taskQuery = await client.query(`select * from public.tasks where name LIKE '%${body.name}%' and parent = 0 and task_type = 'Live' and is_delete=false and ` + assignee + basequery + `and org_id=${org_id}  limit ${body.limit} offset ${body.offset}`)
//       //console.log("1111111",`select * from public.tasks where name LIKE '%${body.name}%' and parent = 0 and task_type = 'Live' and `+assignee +basequery+`and org_id=${org_id} limit ${body.limit} offset ${body.offset}`)
//     } else {
//       taskQuery = await client.query(`select * from public.tasks where name LIKE '%${body.name}%' and parent = 0 and task_type = 'Live' and is_delete=false and assignee @> '${body.assignee}' and assignee!='[]' and org_id=${org_id} limit ${body.limit} offset ${body.offset}`)
//       //console.log("2222222",`select * from public.tasks where name LIKE '%${body.name}%' and parent = 0 and task_type = 'Live' and assignee @> '${body.assignee}' and org_id=${org_id} limit ${body.limit} offset ${body.offset}`)
//     }

//     return res.json({ data: taskQuery.rows, response: { status: true, message: "successfull" } })
//   } catch (error) {
//     console.log(error)
//     //client.release()
//     return res.json({ status: false, message: error })
//   }
//   finally {
//     client.release()
//     //  client.end()
//   }
// }

//STATUS PRIORITY DEL CHECK-------->
// async function statusPriorityDelCheck(req, res) {
//   let org_id = req.body.session_variables["x-hasura-orgid"]
//   let body = req.body.input.arg1;
//   let field_type = body.field_type
//   let field = body.field
//   let new_field = body.new_field
//   let type = body.type
//   let query;
//   let ids = []
//   //console.log("body--------",body)
//   const client = await pool.connect();
//   try {
//     if (field_type == 'status') {
//       // console.log(`select id from public."tasks" where org_id=${org_id} and internal_status='${field}' and is_delete=false`)
//       query = await client.query(`select id from public."tasks" where org_id=${org_id} and internal_status='${field}' and is_delete=false`)
//     }
//     if (field_type == 'priority') {
//       //  console.log(`select id from public."tasks" where org_id=${org_id} and internal_priority='${field}' and is_delete=false`)
//       query = await client.query(`select id from public."tasks" where org_id=${org_id} and internal_priority='${field}' and is_delete=false`)
//     }
//     // console.log("query---------",query.rows)
//     if (query.rowCount == 0) {
//       return res.json({ response: { status: false, message: 0 } })
//     }
//     query.rows.map((id) => {
//       ids.push(id.id)
//     })
//     if (new_field == '') {
//       return res.json({ response: { status: true, message: query.rowCount } })
//     }
//     // console.log("ids-------------",ids)
//     if (ids.length > 0) {
//       if ((type == 'delete' || type == 'update') && field_type == 'status') {
//         // console.log(`update public."tasks" set internal_status='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
//         let query = await client.query(`update public."tasks" set internal_status='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
//         let message = type == 'delete' ? "Status Deleted Successfully" : "Status Updated Successfully"
//         return res.json({ response: { status: true, message: message } })
//       }
//       if ((type == 'delete' || type == 'update') && field_type == 'priority') {
//         // console.log(`update public."tasks" set internal_priority='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
//         let query = await client.query(`update public."tasks" set internal_priority='${new_field}' where id in (${[...ids]}) and org_id=${org_id}`)
//         let message = type == 'delete' ? "Priority Deleted Successfully" : "Priority Updated Successfully"
//         return res.json({ response: { status: true, message: message } })
//       }
//     } else {
//       return res.json({ response: { status: false, message: "No records" } })
//     }

//   } catch (error) {
//     console.log(error)
//     return res.json({ status: false, message: error })
//   }

// }

//let res = new Date(new Date().setMonth(new Date().getMonth()+subscription_months)).toISOString()

