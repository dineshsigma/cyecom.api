const sjwt = require('jwt-simple');
const pool = require('../config/config').pool
const { parsePhoneNumber } = require('awesome-phonenumber');
const config = require('../config/config.js').config;
const otplib = require('otplib');
const request = require('request');
const moment = require('moment');
const validator = require("email-validator");
const ejs = require("ejs");
const email_module = require('../modules/email')
const CryptoJS = require("crypto-js");
const AES = require("crypto-js/aes");
const secret = config.secret
let OTP_SECRET = config.OTP_SECRET;
// const secret = config.secret
// let OTP_SECRET = process.env.OTP_SECRET;
let logsService = require('../config/logservice.js')

otplib.authenticator.options = {
    step: 900,
    window: 1,
    digits: 6
};

async function userLoginGraphql(req, res) {//User login api
    let input = req.body.input.arg1; //taking input from hasura login mutation
    let response;
    let is_remember = input.is_remember ? input.is_remember : false // is_remember is for to remember the user in application for 6 months
    const client = await pool.connect();
    try {
        let userData;
        let userGetData
        if (input.login_type == 'phone') {//Based on login type users data fetched if it email then it takes email or else takes phone
            userGetData = `select * from public."users" where phone='${input.username}'`;
            response = "Invalid Phone Number"
        } else {
            userGetData = `select * from public."users" where email='${input.username}'`;
            response = "Invalid Email"
        }
        let userres = await client.query(userGetData);
        if (userres.rows.length > 0) {//compares the password entred by user
            let bytes = CryptoJS.AES.decrypt(userres.rows[0].password, secret);
            let decrypted = bytes.toString(CryptoJS.enc.Utf8);//Decrypt the password to original password

            if (decrypted == input.password) {//if decrypted password matches with original password entered by user
                userData = userres.rows[0];
            } else {
                return res.status(401).json({ data: {}, response: { status: false, message: "Invalid Password" } })
            }
        } else {
            return res.status(401).json({ data: {}, response: { status: false, message: response } })
        }
        if (userData) {
            if (userres.rows[0].is_cyecom_team) {//ADMIN login
                payload = {
                    "https://hasura.io/jwt/claims": {
                        "x-hasura-allowed-roles": ["admin"],
                        "x-hasura-default-role": "admin",
                        "x-hasura-user-id": "" + userData.id,
                        "x-hasura-orgid": 0
                    }
                };
                let token = sjwt.encode(payload, config.private, "RS256")//Generates token
                return res.status(200).json({
                    data: {
                        accessToken: token,
                        user_id: userData.id
                    }, response: { status: true, message: "Successfully Logged In" }
                })
            } else {//if the user is not an admin means a normal user
                let user_id = userData.id
                let orgs = []; //list of organization ids
                let currentOrganization;
                //getting the user with organization , if the user with organization is not deleted 
                let userOrgDetails = await client.query(`SELECT org_id from public."user_org" usr,public."organization" org where usr.user_id =${user_id} and org.id=usr.org_id and usr.is_delete=false`)
                if (userOrgDetails.rowCount > 0) { //User Delete Check,if the user exists or not
                    //getting the active organization which is not deleted 
                    let organizationIsActiveData = await client.query(`SELECT org_id from public."user_org" usr,public."organization" org where usr.user_id =${user_id} and org.id=usr.org_id and usr.is_delete=false and org.is_delete=false`)

                    for (let i = 0; i < organizationIsActiveData.rows.length; i++) { // organization delete check
                        orgs.push(organizationIsActiveData.rows[i].org_id)//pushing the organizations in to an array
                    }
                    if (orgs.length > 0) {
                        currentOrganization = await client.query(`select id from public."organization" where id in (${orgs}) and is_active=true`);//getting the active organizations
                        if (currentOrganization.rowCount > 0) {//Checking Active organizations
                            let payload
                            if (is_remember == true) {//if user clicks is remember then he shoul be able to be logged in on application for 6 months
                                payload = {//token of the user is active for 6 months 
                                    "https://hasura.io/jwt/claims": {
                                        "x-hasura-allowed-roles": ["user"],
                                        "x-hasura-default-role": "user",
                                        "x-hasura-user-id": "" + userData.id,
                                        "x-hasura-orgid": "" + currentOrganization.rows[0].id
                                    }, exp: moment().add(6, 'M').valueOf() / 1000
                                    //exp:moment().add(15, 's').valueOf() / 1000
                                };
                            } else {//if not he should be logged in on application for 15 days
                                payload = {
                                    "https://hasura.io/jwt/claims": {
                                        "x-hasura-allowed-roles": ["user"],
                                        "x-hasura-default-role": "user",
                                        "x-hasura-user-id": "" + userData.id,
                                        "x-hasura-orgid": "" + currentOrganization.rows[0].id
                                    }, exp: moment().add(15, 'd').valueOf() / 1000
                                    //exp:moment().add(15, 's').valueOf() / 1000
                                };
                            }

                            let token = sjwt.encode(payload, config.private, "RS256") // generation of token

                            return res.status(200).json({//sending token response
                                data: {
                                    accessToken: token,
                                    available_organizations: orgs,
                                    current_organization: currentOrganization.rows[0].id,
                                    user_id
                                }, response: { status: true, message: "Successfully Logged In" }
                            })
                        } else {
                            return res.json({ data: {}, response: { status: false, message: "No Current Active Organization Found" } })
                        }

                    } else {
                        return res.status(204).json({ data: {}, response: { status: false, message: "No Current Active Organization Found" } })
                    }
                } else {
                    return res.status(204).json({ data: {}, response: { status: false, message: "You Are Removed By Your Admin" } })
                }
            }

        } else {
            return res.status(404).json({ data: {}, response: { status: false, message: "user not found" } })
        }

    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ data: {}, response: { status: false, message: error.message } })
    }
    finally {
        client.release()
    }

}

let d = require('./m')

//email verifivation apis
async function otpAuthentication(req, res) {
    let input = req.body.input.arg1.email;
    try {
        if (validator.validate(input)) { // validating the Email
            const emailsecret = OTP_SECRET + input;
            const token = otplib.authenticator.generate(emailsecret);
            let message = {
                'data1': token,
                'data2': ''
            }
            await email_module.send_templates_mails(email, "VERIFICATION CODE", "/templates/epotps.ejs", message, '') // sending Email OTP
            return res.status(200).json({
                status: true,
                message: 'OTP SENT SUCCESSFULLY'
            })

        }
        else {
            res.status(401).json({
                status: false,
                message: 'invalid  email'
            })
        }

    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: error })
    }

}

async function verifyAuthentication(req, res) { //Email verification Link sending Api
    let mail = req.body.input.arg1.email;
    let userid = req.body.input.arg1.userid;
    const client = await pool.connect();
    try {
        if (validator.validate(mail)) { //validating Email
            let updatemail = await client.query(`update public.users set email = '${mail}',is_email_valid=false where id=${userid}`)
            //check the mail by sending verifcation link to user consisitng email
            let date = new Date();
            date = moment(date).format('YYYYMMDD');

            let text = `${mail}-${date}`
            //Encrypt
            let ciphertext = CryptoJS.AES.encrypt(text, secret).toString();
            ciphertext = encodeURIComponent(ciphertext)
            //creating a Vefification Link to send via Email
            let url_path = `${config.domainurl}/api/user/url_path?userid=${userid}&verifyEmail=${ciphertext}`

            const email = mail

            let message = {
                'link': url_path,
            }
            await email_module.sendEmailVerifyLink(email, "Verify Email", "/templates/emailVerifyLink.ejs", message)
        } else {
            return res.status(401).json({ status: false, message: 'Please Enter Valid Email' })
        }
        return res.status(200).json({ status: true, message: "successfull" })

    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: "error", error: error })
    }

}

async function HausaraAccessToken(req, res) {
    try {
        let payload = {
            "https://hasura.io/jwt/claims": {
                "x-hasura-allowed-roles": ["admin"],
                "x-hasura-default-role": "admin"
            }
        };
        const token = sjwt.encode(payload, config.private, "RS256");
        return res.status(200).json({ status: true, token: token })
    }
    catch (error) {
        logsService.log('error', req, error + "");
        return res.status(500).json({
            status: false,
            message: "error"
        })
    }

}

async function epots(req, res) { // email and phone OTPs sending api
    try {
        let data = req.body.input.arg1;
        if (data.client_type != "ios") { // check for the client is ios or android
            if (data.phone != '') { // if the user have phone 
                let phone = data.phone.toString();
                let pn = parsePhoneNumber(phone, 'IN');
                if (pn) { // sending phone OTP
                    const secret = OTP_SECRET + data.phone;
                    const phonetoken = otplib.authenticator.generate(secret);
                    let phoneoptions = {
                        'method': 'GET',
                        'url': `https://2factor.in/API/V1/e27f1a8a-e428-11e9-9721-0200cd936042/SMS/${data.phone}/${phonetoken}/Happi`,
                    };

                    request(phoneoptions, async function (error, response) {
                        let result = JSON.parse(response.body);
                        if (result.Status != "Success") {
                            return res.json({
                                status: false,
                                message: "unable to send otp"
                            })

                        }

                    });
                } else {
                    res.status(401).json({
                        status: false,
                        message: 'invalid phone number'
                    })

                }
            }
            if (data.email != '') { //if the user have mail
                if (validator.validate(data.email)) { // validation for email
                    const emailsecret = OTP_SECRET + data.email;
                    const token = otplib.authenticator.generate(emailsecret);

                    let message = {
                        'data1': token,
                        'data2': ''
                    }
                    await email_module.send_templates_mails(data.email, "VERIFICATION CODE", "/templates/epotps.ejs", message, '') //sending email otp

                } else {
                    res.status(401).json({
                        status: false,
                        message: 'invalid  email'
                    })

                }
            }
            return res.status(200).json({
                status: true,
                message: 'OTP SENT SUCCESSFULLY'
            })
        } else { // if client equal to IOS then it should send only email otp
            if (validator.validate(data.email)) {//validates the email
                const emailsecret = OTP_SECRET + data.email;
                const token = otplib.authenticator.generate(emailsecret);
                let message = {
                    'data1': token,
                    'data2': ''
                }
                await email_module.send_templates_mails(data.email, "VERIFICATION CODE", "/templates/epotps.ejs", message, '')//sending an verification code as otp to email
                return res.status(200).json({
                    status: true,
                    message: 'OTP SENT SUCCESSFULLY'
                })

            }
            else {
                res.status(401).json({
                    status: false,
                    message: 'invalid  email'
                })

            }
        }
    }
    catch (error) {
        logsService.log('error', req, error + "");
        return res.status(500).json({ status: false, message: "error", error: error })
    }

}
//'hostname': 'cyeproreports.azurewebsites.net',
//  async function call1(request,returnresponse) {
//     try{
//     let dashboardid=request.query.dashboardid
//     var org_id=request.query.org_id;
//     //console.log("org_id",org_id,dashboardid)
//     var options = {
//         'method': 'POST',
//         'hostname': 'http://192.168.1.78:8899/',
//         'path': '/api/v1/security/login',
//         'headers': {
//             'Content-Type': 'application/json'
//         },
//         'maxRedirects': 20
//     };
//     var req = https.request(options, function (res) {
//         var chunks = [];
//         res.on("data", function (chunk) {
//             chunks.push(chunk);
//         });
//         res.on("end", function (chunk) {
//             var body = Buffer.concat(chunks);
//             var access_token = JSON.parse(body.toString())['access_token'];
//             run(access_token,returnresponse,dashboardid,org_id)
//         });
//         res.on("error", function (error) {
//             console.error(error);
//         });
//     });

//     var postData = JSON.stringify({
//         "password": "admin",
//         "username": "admin",
//         "refresh": true,
//         "provider": "db"
//     });
//     req.write(postData);
//     req.end();
// }catch(error){
//     console.log(error)
//     res.json({status:false,message:error})
// }
// }
// function run(access_token, returnresponse,dashboardid,org_id) {
//     console.log("RUN", access_token)
//     try{
//     var options = {
//         'method': 'POST',
//       'hostname': 'http://192.168.1.78:8899/',
//         'path': '/api/v1/security/guest_token/',
//         'headers': {
//             'Authorization': 'Bearer ' + access_token,
//             'Content-Type': 'application/json'
//         },
//        'maxRedirects': 20
//     };
//     var req = https.request(options, function (res) {
//       var chunks = [];
//         res.on("data", function (chunk) {
//             chunks.push(chunk);
//         });
//     res.on("end", function (chunk) {
//             var body = Buffer.concat(chunks);
//             console.log(body.toString());
//             returnresponse.json(JSON.parse(body.toString()))
//         });
//         res.on("error", function (error) {
//            console.error(error);
//         });
//     });
//     let postData;
//     if(dashboardid !=undefined && dashboardid !='' && dashboardid!=null ){
//        // console.log("dashboardid is there----",dashboardid,request.query)
//          postData = JSON.stringify({
//             "user": {
//                 "username": "admin",
//                 "first_name": "Superset",
//                 "last_name": "Admin"
//             },
//             "resources": [
//                 {
//                     "type": "dashboard",
//                     "id": dashboardid
//                 }
//             ],
//             "rls": [{"clause":"org_id="+org_id+""}]
//         });
//         // {"user": {"username": "myAppUser", "first_name": "MyApp User", "last_name": "MyApp User"}, "resources":[{"type": "dashboard", "id": "0f0c12de-6bf7-48e0-be5e-27e8a08c67de"}],"rls":[{"clause": "customer_id=4"}]}
//     }
//     else{
//         console.log("nodashboardid----",dashboardid)
//          postData = JSON.stringify({
//             "user": {
//                 "username": "admin",
//                 "first_name": "Superset",
//                 "last_name": "Admin"
//             },
//             "resources": [
//                 {
//                     "type": "dashboard",
//                     "id": "4cbe9787-8e8b-4795-8feb-682bc9af97a4"
//                 }
//             ],
//             "rls": []
//         });
//     }
//     req.write(postData);
//     req.end();
// }catch(error){
//     console.log(error)
//     res.json({status:false,message:error})
// }
// }

async function forgetPassword(req, res) {//forget password api
    let phone = req.body.input.arg1.phone;

    const client = await pool.connect();
    try {
        //getting user details from users table
        let userDetails = await client.query(`select * from public."users" where phone='${phone}' and is_active=true and is_delete=false`); //getting user Details
        if (userDetails.rowCount == 0) { //if user exists or not exists check
            return res.json({ data: "", response: { status: false, message: "Mobile Number Does Not Exist" } })//if the mobile number is not existed in the table it returns mobile not exists response
        }
        let email = userDetails.rows[0].email //users email

        if (email) {//if user consists email
            const emailsecret = OTP_SECRET + email;
            const token = otplib.authenticator.generate(emailsecret);
            let message = {
                'data1': token,
                'data2': ''
            }
            await email_module.send_templates_mails(email, "VERIFICATION CODE", "/templates/epotps.ejs", message, '') //sending email otp to user

            return res.status(200).json({ data: email, response: { status: true, message: 'OTP SENT SUCCESSFULLY' } })

        } else {
            return res.status(510).json({ data: "", response: { status: false, message: "You Don't Have A Email,Please contact your ADMIN" } })
        }

    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: "ERROR", error: error })
    }
    finally {
        client.release()
        //  client.end()
    }

}

async function setPassword(req, res) {//setting password with the otp getting by forget password
    let email = req.body.input.arg1.email;
    let otp = req.body.input.arg1.otp;
    const client = await pool.connect();
    try {
        const secret = OTP_SECRET + email;
        let isemailValid = otplib.authenticator.check(otp, secret);//comparing the otp and the SECRET 

        if (isemailValid) { // email valid or not valid check
            let pass = '';
            const secret = config.secret;
            let str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                'abcdefghijklmnopqrstuvwxyz0123456789@#';
            for (let i = 1; i <= 12; i++) { // generating random string for password
                let char = Math.floor(Math.random()
                    * str.length + 1);
                pass += str.charAt(char)
            }//generating a random password
            let password = CryptoJS.AES.encrypt(pass, secret).toString();//encrypting thr random generated password
            //updating the password in users
            let userData = await client.query(`UPDATE public."users" SET password ='${password}' where email='${email}'`); //updating users password
            //decrypt the password and send to user
            let bytes = CryptoJS.AES.decrypt(password, secret);
            let decrypted = bytes.toString(CryptoJS.enc.Utf8);
            let to = email;
            let message = {
                'data1': decrypted,
                'data2': ''
            }
            await email_module.send_templates_mails(to, "PASSWORD", "/templates/password.ejs", message, '') //sending the password through email of user
            return res.json({ status: true, message: "Password sent to the Email" })

        } else {
            return res.status(402).json({ status: false, message: "Invalid OTP" })
        }

    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: "ERROR", error: error })
    }
    finally {
        client.release()
    }
}

async function resetPassword(req, res) {//reset password 
    let oldPassword = req.body.input.arg1.oldpassword;
    let newPassword = req.body.input.arg1.newpassword;
    let id = req.body.session_variables["x-hasura-user-id"]
    const client = await pool.connect();
    try {
        let userGetData = await client.query(`select password from public."users" where id='${id}'`); // getting the login user password 

        let bytes = CryptoJS.AES.decrypt(userGetData.rows[0].password, secret);//decrypted the encrypted password  
        let decryptedpass = bytes.toString(CryptoJS.enc.Utf8);

        if (decryptedpass == oldPassword) {//if the decrypted password matches with the password entered by user
            // Encrypt---new password---
            let ciphertext = CryptoJS.AES.encrypt(newPassword, secret).toString();//encrypt the new password entered by user

            let userData = await client.query(`UPDATE public."users" SET password ='${ciphertext}' where id='${id}'`);//updates the new password for the user

            return res.status(200).json({ status: true, message: "Password updated" })//sends response of password updated successfully

        } else {
            return res.status(401).json({ status: false, message: "Invalid Old Password" })
        }
    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: "ERROR", error: error })
    }
    finally {
        client.release()
        //client.end()
    }
}

async function emailOtp(req, res) {// OTP sending for email api
    let email = req.body.input.arg1.email;
    const client = await pool.connect();
    try {
        // getting the user with the given mail having the is email valid is true  
        let userGetData = await client.query(`select * from public."users" where email='${email}' and is_email_valid=true`);
        if (userGetData.rowCount > 0) {//if the email is existed then it sends the response as duplicate email
            return res.status(409).json({ status: true, message: "Duplicate email" })
        }
        if (validator.validate(email)) {//validates the email
            const emailsecret = OTP_SECRET + email;
            const token = otplib.authenticator.generate(emailsecret);
            let message = {
                'data1': token,
                'data2': ''
            }
            await email_module.send_templates_mails(email, "VERIFICATION CODE", "/templates/epotps.ejs", message, '')//sends the OTP to email
            return res.status(200).json({
                status: true,
                message: 'OTP SENT SUCCESSFULLY'
            })

        }
        else {
            res.status(401).json({
                status: false,
                message: 'invalid  email'
            })
        }
    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: "ERROR", error: error })
    }
    finally {
        client.release()
        // client.end()
    }
}



module.exports.userLoginGraphql = userLoginGraphql;
module.exports.HausaraAccessToken = HausaraAccessToken;
module.exports.epots = epots;
module.exports.otpAuthentication = otpAuthentication;
module.exports.verifyAuthentication = verifyAuthentication;
//module.exports.call1 = call1;
module.exports.forgetPassword = forgetPassword;
module.exports.setPassword = setPassword;
module.exports.resetPassword = resetPassword;
module.exports.emailOtp = emailOtp;
