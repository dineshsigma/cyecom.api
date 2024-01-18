const validator = require("email-validator");
const pool = require('../config/config').pool
const { parsePhoneNumber } = require('awesome-phonenumber');
const { getDiff } = require('json-difference');
const otplib = require('otplib');
const sjwt = require('jwt-simple');
const config = require('../config/config.js').config;
const OTP_SECRET = config.OTP_SECRET;
const secret2 = config.secret;
// const secret2 = process.env.SECRET
// let OTP_SECRET = process.env.OTP_SECRET;
const CryptoJS = require("crypto-js");
const send_mail = require('../modules/email')
const moment = require('moment');
const Razorpay = require('razorpay');
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
//Create Organization api
async function graphqlOrganizationRegister(req, res) {
    let body = req.body.input.arg1;
    let client_type = body.otps.client_type;
    let phoneotp = client_type == 'ios' ? '' : body.otps.phoneotp;
    let emailotp = body.otps.emailotp;
    let phone
    const secret = OTP_SECRET + body.user.email;
    let isemailValid = otplib.authenticator.check(emailotp, secret);//email verification

    if (emailotp == "000000") {//default email OTP
        isemailValid = true
    }

    if (validator.validate(body.user.email)) {//validates the email
        let pn;
        if (client_type != 'ios') {//if the client is not equal to IOS then phone equal to given phone number
            phone = body.user.phone.toString()
            pn = parsePhoneNumber(phone, 'IN');
        } else {
            pn = true//else the phone is true
        }

        if (pn) {
            //email OTP check
            if (isemailValid) {
                let isphoneValid;
                if (client_type != 'ios') {
                    const phonesecret = OTP_SECRET + body.user.phone;
                    isphoneValid = otplib.authenticator.check(phoneotp, phonesecret);
                } else {//Or else the email validation is true
                    isphoneValid = true
                }
                //phone OTP check
                if (phoneotp == "000000") {//default phone otp
                    isphoneValid = true
                }
                if (isphoneValid) {
                    let organization = body.organization;//organization data entered by user

                    let user = body.user;

                    const client = await pool.connect();
                    //getting user details with the email entered in user form on organization regestration 
                    let queryuserfind = await client.query(`select * from public."users" where email ='${user.email}' and email IS NOT NULL and email NOT LIKE ''`);
                    if (queryuserfind.rowCount > 0) {//if any user existed with the email then it reflects duplicate email response
                        return res.status(409).json({ status: false, message: `Duplicate email:'${user.email}'` })
                    }
                    //getting user details with the phone entered in user form on organization regestration 
                    let userphonequery = await client.query(`select * from public."users" where phone = '${user.phone}'`)

                    if (userphonequery.rowCount > 0) {//if any user existed with the phone then it reflects duplicate phone response
                        return res.status(409).json({ status: false, message: `Duplicate number:'${user.phone}'` })
                    }

                    try {
                        await client.query('BEGIN')
                        //inserted organization data into organization table
                        const queryText = `INSERT INTO public."organization"(${Object.keys(organization)}) VALUES(${await getarray(Object.values(organization))}) RETURNING id`
                        let org_result = await client.query(queryText);
                        let org_id = org_result.rows[0].id;
                        //inserted users data into users table
                        const userqueryText = `INSERT INTO public."users"(${Object.keys(user)}) VALUES(${await getarray(Object.values(user))}) RETURNING id`
                        let userresult = await client.query(userqueryText);
                        //updating the users email as valid while registering with the organization 
                        const update = await client.query(`update public.users set is_email_valid=true where id=${userresult.rows[0].id}`)
                        let user_id = userresult.rows[0].id

                        //Adding department---->>
                        let department = {
                            name: 'administration',
                            org_id: org_id,
                            level: 0,
                            //parent:0,
                            is_primary: true

                        }
                        //insert into department table
                        const depqueryText = `INSERT INTO public."department"(${Object.keys(department)}) VALUES(${await getarray(Object.values(department))}) RETURNING id`

                        let depresult = await client.query(depqueryText);

                        let department_id = depresult.rows[0].id
                        //Adding location---->>
                        let locname = body.headquarter_location_name.toLowerCase();
                        locname = locname.trim();
                        locname = locname.replace(/ /g, "")

                        let locations = {
                            name: locname,
                            //parent: 0,
                            color: 'red',
                            org_id: org_id,
                            level: 0,
                            is_primary: true
                        }

                        const locationqueryText = `INSERT INTO public."locations"(${Object.keys(locations)}) VALUES(${await getarray(Object.values(locations))}) RETURNING id`
                        let locationresult = await client.query(locationqueryText);

                        let location_id = locationresult.rows[0].id

                        let roleData = `select id from public.roles where name='owner' and org_id=0`;//getting role data of predefined 0 organization in role table
                        let roleresult = await client.query(roleData);
                        //Adding designation---->> 
                        let desigination = {
                            name: 'chairman',
                            org_id: org_id,
                            level: 0,
                            is_primary: true
                        }
                        const designationqueryText = `INSERT INTO public."designation"(${Object.keys(desigination)}) VALUES(${await getarray(Object.values(desigination))}) RETURNING id`
                        let designationresult = await client.query(designationqueryText);

                        let desig_id = designationresult.rows[0].id
                        //Adding user_org---->>
                        let user_org = {
                            user_id: user_id,
                            department_id: department_id,
                            location_id: location_id,
                            role_id: roleresult.rows[0].id,
                            reporting_manager: 0,
                            org_id: org_id,
                            designation_id: desig_id,
                            //is_primary:true,
                            is_active: true
                        }

                        const userOrgqueryText = `INSERT INTO public."user_org"(${Object.keys(user_org)}) VALUES(${await getarray(Object.values(user_org))}) RETURNING id`
                        let user_orgresult = await client.query(userOrgqueryText);
                        ////auto generate task code------>
                        let codeGenObj = {//generating a sequence code for organization
                            org_id: org_id,
                            sequence_no: 0
                        }

                        const codegenqueryText = await client.query(`INSERT INTO public."code_generator"(${Object.keys(codeGenObj)}) VALUES(${await getarray(Object.values(codeGenObj))}) RETURNING id`)

                        ////subscription plan saving-------------->

                        let subscription = {
                            plan_type: body.subscription.plan_type,//plan type for organization free trail or subscription
                            subscription_months: body.subscription.subscription_months,//how many months of subscription
                            startdate: new Date().toISOString(),//date of subscribed
                            enddate: moment().add(body.subscription.subscription_months, 'M').toISOString(),//end date of subscription
                            org_id: org_id
                        }

                        const subscriptionqueryText = await client.query(`INSERT INTO public."subscription"(${Object.keys(subscription)}) VALUES(${await getarray(Object.values(subscription))}) RETURNING id`)

                        await client.query('COMMIT')
                        //decrypt the password and send it to the user----------
                        let userGetPass = `select * from public."users" where id='${userresult.rows[0].id}'`;
                        let userres = await client.query(userGetPass);

                        let bytes = CryptoJS.AES.decrypt(userres.rows[0].password, secret2);
                        let decrypted = bytes.toString(CryptoJS.enc.Utf8);


                        let to = userres.rows[0].email;

                        send_mail.send_mail(to, 'PASSWORD', decrypted, [])
                        ///------------------------------
                        return res.status(200).json({ status: true, message: "Organization Registration Successfull" })
                    } catch (error) {
                        logsService.log('error', req, error + "")
                        await client.query('ROLLBACK')
                        return res.status(500).json({ status: false, message: error.detail })
                    }
                }
                else {
                    return res.status(409).json({
                        status: false,
                        message: 'Invalid  Phone OTP'
                    })

                }
            }
            else {
                return res.status(409).json({
                    status: false,
                    message: 'Invalid Email OTP'
                })

            }
        }
        else {
            return res.status(401).json({
                status: false,
                "message": "INVALID PHONE NUMBER"
            })


        }
    } else {
        return res.status(401).json({
            status: false,
            "message": "INVALID EMAIL: CHECK EMAIL FOR  ORGANIZATION"
        })

    }

}
//Createing organization inside  organization,api
async function graphqlAddOrganization(req, res) {
    let user_id = req.body.session_variables["x-hasura-user-id"]
    const client = await pool.connect();
    let body = req.body.input.arg1;
    let phoneotp = body.otps.phoneotp;
    let emailotp = body.otps.emailotp;
    let userData = `select * from public."users" where id=${user_id}`;
    let userresult = await client.query(userData);
    const phonesecret = OTP_SECRET + userresult.rows[0].phone;
    let isphoneValid = otplib.authenticator.check(phoneotp.toString(), phonesecret);
    const secret = OTP_SECRET + userresult.rows[0].email;
    let isemailValid = otplib.authenticator.check(emailotp, secret);
    if (emailotp == "000000") {
        isemailValid = true
    }
    if (validator.validate(body.organization.email)) {
        //email OTP check
        if (isemailValid) {
            //phone OTP check
            if (phoneotp == "000000") {
                isphoneValid = true
            }
            if (isphoneValid) {
                let organization = body.organization;
                try {
                    await client.query('BEGIN')
                    const queryText = `INSERT INTO public."organization"(${Object.keys(organization)}) VALUES(${await getarray(Object.values(organization))}) RETURNING id`
                    let org_result = await client.query(queryText);
                    let org_id = org_result.rows[0].id;
                    let department = {
                        name: 'administration',
                        org_id: org_id,
                        level: 0,
                        is_primary: true
                    }
                    const depqueryText = `INSERT INTO public."department"(${Object.keys(department)}) VALUES(${await getarray(Object.values(department))}) RETURNING id`
                    let depresult = await client.query(depqueryText);
                    let department_id = depresult.rows[0].id
                    let locname = body.headquarter_location_name.toLowerCase();
                    locname = locname.trim();
                    locname = locname.replace(/ /g, "")
                    let locations = {
                        name: locname,
                        color: 'red',
                        org_id: org_id,
                        level: 0,
                        is_primary: true
                    }
                    const locationqueryText = `INSERT INTO public."locations"(${Object.keys(locations)}) VALUES(${await getarray(Object.values(locations))}) RETURNING id`
                    let locationresult = await client.query(locationqueryText);
                    let location_id = locationresult.rows[0].id
                    let roleData = `select id from public.roles where name='owner' and org_id=0`;
                    let roleresult = await client.query(roleData);

                    let desigination = {
                        name: 'chairman',
                        org_id: org_id,
                        level: 0,
                        is_primary: true
                    }
                    const designationqueryText = `INSERT INTO public."designation"(${Object.keys(desigination)}) VALUES(${await getarray(Object.values(desigination))}) RETURNING id`
                    let designationresult = await client.query(designationqueryText);
                    let desig_id = designationresult.rows[0].id
                    let user_org = {
                        user_id: body.user_id,
                        department_id: department_id,
                        location_id: location_id,
                        role_id: roleresult.rows[0].id,
                        org_id: org_id,
                        designation_id: desig_id,
                        is_active: true
                    }
                    const userOrgqueryText = `INSERT INTO public."user_org"(${Object.keys(user_org)}) VALUES(${await getarray(Object.values(user_org))}) RETURNING id`
                    let user_orgresult = await client.query(userOrgqueryText);
                    ////subscription plan saving-------------->
                    let subscription = {
                        plan_type: body.subscription.plan_type,
                        subscription_months: body.subscription.subscription_months,
                        startdate: new Date().toISOString(),
                        enddate: moment().add(body.subscription.subscription_months, 'M').toISOString(),
                        org_id: org_id
                    }

                    const subscriptionqueryText = await client.query(`INSERT INTO public."subscription"(${Object.keys(subscription)}) VALUES(${await getarray(Object.values(subscription))}) RETURNING id`)

                    await client.query('COMMIT')
                    return res.json({ status: true, message: "Your Registration Successfull" })
                } catch (DatabaseError) {
                    logsService.log('error', req, DatabaseError + "")
                    await client.query('ROLLBACK')
                    return res.status(500).json({ status: false, message: DatabaseError.detail })
                }
            }
            else {
                return res.status(409).json({
                    status: false,
                    message: 'Invalid  Phone OTP'
                })
            }
        }
        else {
            return res.status(409).json({
                status: false,
                message: 'Invalid Email OTP'
            })
        }

    } else {
        return res.status(401).json({
            status: false,
            "message": "INVALID EMAIL: CHECK EMAIL FOR  ORGANIZATION"
        })

    }

}
//Change organization (Switch organization) api
async function changeOrganizationGraphql(req, res) {
    try {

        let org_id = req.body.input.arg1.org_id.toString();

        let user_id = req.body.session_variables['x-hasura-user-id']
        const client = await pool.connect();
        await client.query('BEGIN')
        try {
            let getOrganization = `select * from public.organization where id=${org_id} and is_active=true`;
            let orgresult = await client.query(getOrganization);

            if (orgresult.rows.length > 0) {
                let payload = {
                    "https://hasura.io/jwt/claims": {
                        "x-hasura-allowed-roles": ["user"],
                        "x-hasura-default-role": "user",
                        "x-hasura-user-id": "" + user_id,
                        "x-hasura-orgid": org_id

                    }
                };

                let token = sjwt.encode(payload, config.private, "RS256");

                return res.status(200).json({
                    data: {
                        accessToken: token,
                        current_organization: org_id
                    }, response: { status: true, message: "Successfully Logged In" }

                })

                //  return res.json({ status: true,  accessToken: token,
                //         current_organization: org_id,message: "Successfully Logged In"})
            }
            else {
                return res.status(403).json({
                    status: false,
                    message: "organization is inActive"
                })
            }
        }
        catch (error) {
            logsService.log('error', req, error + "");
            return res.status(500).json({
                status: false,
                message: error
            })
        }

    }
    catch (error) {
        logsService.log('error', req, error + "");
        return res.status(500).json({
            status: false,
            message: error
        })
    }
}
//Changing as Alias user api
async function changeAsAliasUser(req, res) {
    try {
        let user_id = req.body.input.arg1.user_id;
        let org_id = req.body.session_variables['x-hasura-orgid']
        let alias_user_id = req.body.session_variables['x-hasura-user-id']
        //const pool = new Pool(config.dbconnection)
        const client = await pool.connect();
        try {
            let getUser = await client.query(`select * from public.users where id=${user_id}`);

            let payload = {
                "https://hasura.io/jwt/claims": {
                    "x-hasura-allowed-roles": ["user"],
                    "x-hasura-default-role": "user",
                    "x-hasura-user-id": "" + user_id,
                    //"x-hasura-alias-user-id":alias_user_id,
                    "x-hasura-orgid": org_id
                }
            };

            let token = sjwt.encode(payload, config.private, "RS256");
            client.release()
            return res.status(200).json({
                data: {
                    accessToken: token,
                    current_organization: org_id,
                    user_id: user_id,
                    alias_user_id: alias_user_id
                }, response: { status: true, message: `Switched as ${getUser.rows[0].name}` }

            })

        }
        catch (error) {
            logsService.log('error', req, error + "");
            res.status(500).json({
                status: false,
                message: error
            })
            client.release()
        }

    }
    catch (error) {
        logsService.log('error', req, error + "");
        return res.status(500).json({
            status: false,
            message: error
        })
    }
}
//End to end logs of organization table api
async function organizationLogs(req, res) {
    let organization = req.body.event.data;
    let logObj = {}
    let obj = {}
    const client = await pool.connect();
    try {
        if (organization.new.is_delete != true) {
            let context;
            if (organization.old) {
                let editedField = getDiff(organization.old, organization.new)
                context = {
                    "field_name": editedField.edited[0][0],
                    "from": editedField.edited[0][1],
                    "to": editedField.edited[0][2]
                }

            }
            logObj = {
                operation: organization.old ? "UPDATE" : "CREATE",
                json: organization.old ? JSON.stringify([organization.new, organization.old]) : JSON.stringify(organization.new),
                context: organization.old ? JSON.stringify(context) : JSON.stringify({}),
                ip_address: "",
            }
        } else {
            logObj = {
                operation: "DELETE",
                json: JSON.stringify(organization.new),
                ip_address: "",
            }
        }
        obj = logObj
        const queryText = `INSERT INTO public."organization_logs"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(logObj))}) RETURNING id`
        let log_result = await client.query(queryText);
        client.release()
        return res.status(200).json({ status: true, message: "log created successfully" })
    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: error })
    }
}
//User existig check in user org table api
async function userExistCheckInOrg(req, res) {
    let phone = req.body.input.arg1.phone
    const client = await pool.connect();
    try {
        let queryuserfind = await client.query(`select * from public."users" where phone='${phone}'`);
        if (queryuserfind.rowCount > 0) {
            return res.json({ data: queryuserfind.rows[0], response: { status: true, message: `Duplicate number :${phone}` } })
        } else {
            return res.status(200).json({ data: [], response: { status: true, message: `` } })
        }
    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: error })
    }

}
//Razorpay payment gateway api
async function paymentGateway(req, res) {
    let { amount, name, email, phone: contact, billing_code } = req.body;

    try {
        let instance = new Razorpay({ key_id: 'rzp_test_qahvQgHW0qIVhA', key_secret: 'nZ9rUlqgKu5seaIOzxrcuAhF' })

        let response = await instance.paymentLink.create({
            amount: amount * 100,
            currency: "INR",
            accept_partial: true,
            first_min_partial_amount: 100,
            description: "For organization",
            customer: {
                name,
                email,
                contact
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            notes: {
                policy_name: "cyecom_billing"
            },
            callback_url: `http://cyecom-api-qa.iipl.work/api/v1/razorpycallbackurl?billing_code=${billing_code}`,
            callback_method: "get"
        })

        res.status(200).json({ success: true, response })

    } catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ status: false, message: error })
    }

}

async function getPaymentLink(req, res) {
    const client = await pool.connect();
    const billing_code = req.query.billing_code;

    try {
        let instance = new Razorpay({ key_id: process.env.KEY_ID, key_secret: process.env.SECRET_KEY, headers: { 'Content-Type': 'application/json' } })

        const billing_master = await client.query(`SELECT * FROM public.billing_master WHERE billing_code = '${billing_code}'`);
        const { id, payment_link_id } = billing_master.rows[0]

        let linkstatus = await instance.paymentLink.fetch(payment_link_id);

        await client.query(`UPDATE public.billing_master SET status = '${linkstatus.status}', paid_date = '${new Date().toISOString()}' WHERE id = ${id}`)

        res.json({ status: linkstatus.status, data: linkstatus.payments.payment_id })
    } catch (error) {
        logsService.log('error', req, error + "")
        return res.status(500).json({ status: false, message: error })
    }
}

module.exports.graphqlOrganizationRegister = graphqlOrganizationRegister;
module.exports.graphqlAddOrganization = graphqlAddOrganization;
module.exports.changeOrganizationGraphql = changeOrganizationGraphql;
module.exports.organizationLogs = organizationLogs;
module.exports.changeAsAliasUser = changeAsAliasUser;
module.exports.userExistCheckInOrg = userExistCheckInOrg;
module.exports.paymentGateway = paymentGateway;
module.exports.getPaymentLink = getPaymentLink;

