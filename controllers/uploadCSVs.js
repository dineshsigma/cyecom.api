const axios = require('axios');
const pool = require('../config/config').pool
const awsmodule = require('../modules/aws')
const dataToJson = require("data-to-json");
const { Parser } = require('json2csv');
const eventEmitter = require('../modules/events').eventEmitter;
let logsService = require('../config/logservice.js')
const XLSX = require('xlsx')

async function getarray(data) {
    var data1 = `'`;
    for (var i = 0; i < data.length; i++) {
        data1 += data[i] + `','`

    }
    return data1.substring(0, data1.length - 2);
}
//CSV upload for Locations
async function locGraphqlcsvupload(req, res) {
    const client = await pool.connect();
    let folderpath = req.body.folderpath
    let filename = req.body.filename
    let org_id = req.params.id;
    let parentname;
    if (filename.split('.')[1] == "csv") {//checking while filename consists of csv by splitting
        try {
            let filepath = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')//getting the signed url as in aws
            let location_get_csv_config = {
                method: 'GET',
                url: filepath,
                headers:
                {

                    'Content-Type': 'application/json'
                }

            };
            let location_get_csv_response = await axios(location_get_csv_config);
            const jsonObj2 = dataToJson.csv({ data: location_get_csv_response.data }).toJson(); //locJson 
            let new_records = [];
            let new_names = [];
            jsonObj2.splice(0, 1);

            let jsonObj = jsonObj2.filter(word => word.id == "" || word.id == undefined);

            for (let i = 0; i < jsonObj.length; i++) {
                let item = jsonObj[i];//taking each location object
                if (item.id == "" || item.id == undefined) {

                    if (item.parent == "" || item.parent == undefined) {
                        return res.json({ "status": false, "message": `${item.parent} must have parent location ` });
                    }
                    if (item.name == "" || item.name == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  location name not empty ` });
                    }

                    try {
                        //getting location details and location parent details if there exists it returns response as duplicate.
                        let locationData = await client.query(`SELECT * FROM public.locations WHERE REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.parent}'), ' ', '') and org_id='${org_id}'`);
                        let locationnameData = await client.query(`SELECT * from public."locations" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.name}'), ' ', '') and org_id ='${org_id}'`);//duplicate check

                        if (locationnameData.rowCount > 0) {
                            return res.status(409).json({ "status": false, message: `${item.name} duplicate name in DB` })
                        }
                        if (locationData != null && locationData.rows.length > 0) {
                            //checking the location name is on the array of new names(new_names) that will be upload to csv sheet
                            if (new_names.indexOf(item.name) == -1) {
                                new_names.push(item.name);
                                new_records.push(item);
                            }
                            else {
                                return res.status(409).json({ "status": false, message: `${item.name} duplicate name in the same sheet ` })
                            }

                        } else {

                            let find = new_names.filter(name => name.trim() == item.parent.trim());//if the name is equal to parent
                            //upload to array
                            if (find.length > 0) {
                                if (new_names.indexOf(item.name) == -1) {
                                    new_names.push(item.name);
                                    new_records.push(item);
                                }
                                else {
                                    return res.status(409).json({ "status": false, message: `${item.name} duplicate name in the same sheet ` })
                                }
                            } else {
                                return res.status(204).json({ "status": false, "message": `${item.parent} not found` });
                            }

                        }
                    } catch (error) {
                        console.log(error.message)
                        return res.status(500).json({ "status": false, message: error.message })
                    }
                }
            }

            //-------------------------
            // var new_records = new_records;
            var response;

            for (let i = 0; i < new_records.length; i++) {//iterates on the new names list of array that to be upload on csv
                let item = new_records[i];
                try {
                    let parent_locname = item.parent.toLowerCase();
                    parent_locname = parent_locname.trim();
                    parent_locname = parent_locname.replace(/ /g, "")

                    let locationgetData = await client.query(`SELECT * from public."locations" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.parent}'), ' ', '') and org_id = ${org_id}`);//parent check,duplicate check

                    if (locationgetData.rows.length > 0) {
                        let obj = {
                            "name": item.name,
                            "parent": locationgetData.rows[0].id,
                            "org_id": org_id,
                            "is_primary": false
                        };
                        // console.log("obj-----------------", obj);
                        const locqueryText = `INSERT INTO public."locations"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))}) RETURNING id`
                        let locresult = await client.query(locqueryText);

                    } else {
                        is_error = true
                        response = `${item.parent} does not exist,job failed`
                        return res.json({ status: false, message: response })
                    }
                } catch (error) {
                    logsService.log('error', req, error + "")
                    return res.status(500).json({ "status": false, message: error.message })
                }

            }

            return res.status(200).json({ "status": true, new_records: new_names, message: "Locations uploaded successfully" })

        } catch (error) {
            logsService.log('error', req, error + "")
            return res.status(500).json({ "status": false, message: error.message })
        }
        finally {
            client.release()
            //  client.end()
        }

    } else {
        return res.json({ "status": false, message: 'please upload valid csv file ' })
    }

}
//CSV upload for Departments
async function depGraphqlcsvuploadValidation(req, res) {
    const client = await pool.connect();
    let folderpath = req.body.folderpath
    let filename = req.body.filename
    let org_id = parseInt(req.params.id);

    if (filename.split('.')[1] == "csv") {
        try {
            let filepath = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')
            let department_get_csv_config = {
                method: 'GET',
                url: filepath,
                headers:
                {

                    'Content-Type': 'application/json'
                }

            };

            let department_get_csv_response = await axios(department_get_csv_config);
            const jsonObj2 = dataToJson.csv({ data: department_get_csv_response.data }).toJson();//depjsonFile
            let new_records = [];
            let new_names = [];
            jsonObj2.splice(0, 1);

            let jsonObj = jsonObj2.filter(word => word.id == "" || word.id == undefined);

            for (let i = 0; i < jsonObj.length; i++) {
                let item = jsonObj[i];
                if (item.id == "" || item.id == undefined) {

                    if (item.parent == "" || item.parent == undefined) {
                        return res.json({ "status": false, "message": `${item.parent} must have parent department ` });
                    }
                    if (item.name == "" || item.name == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  department name not empty ` });
                    }

                    try {

                        let departmentData = await client.query(`SELECT * from public."department" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.parent}'), ' ', '') and org_id =${org_id}`);//parent check,duplicate check 
                        let departmentnameData = await client.query(`SELECT * from public."department" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.name}'), ' ', '') and org_id =${org_id}`);//duplicate check

                        if (departmentnameData.rowCount > 0) {
                            return res.status(409).json({ "status": false, message: `${item.name} duplicate name in DB` })
                        }

                        if (departmentData != null && departmentData.rowCount > 0) {
                            if (new_names.indexOf(item.name) == -1) {
                                new_names.push(item.name);
                                new_records.push(item);
                            }
                            else {
                                return res.status(409).json({ "status": false, message: `${item.name} duplicate name in the same sheet ` })
                            }

                        } else {

                            let find = new_names.filter(name => name.trim() == item.parent.trim());

                            if (find.length > 0) {
                                if (new_names.indexOf(item.name) == -1) {
                                    new_names.push(item.name);
                                    new_records.push(item);
                                }
                                else {
                                    return res.status(409).json({ "status": false, message: `${item.name} duplicate name in the same sheet ` })
                                }
                            } else {
                                return res.status(204).json({ "status": false, "message": `${item.parent} not found` });
                            }

                        }
                    } catch (error) {
                        logsService.log('error', req, error + "")
                        return res.status(500).json({ "status": false, message: error })
                    }
                }
            }

            //-------------------------
            // var new_records = new_records;
            var response;

            for (let i = 0; i < new_records.length; i++) {
                let item = new_records[i];

                try {
                    let departmentgetData = await client.query(`SELECT * from public."department" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.parent}'), ' ', '') and org_id=${org_id}`);//parent check,duplicate check
                    // var departmentgetData = await client.query(`SELECT * from public."department" where name ='${parentname}' and org_id=${org_id}`);//parent check,duplicate check
                    if (departmentgetData.rowCount > 0) {

                        let obj = {
                            "name": item.name,
                            "parent": departmentgetData.rows[0].id,
                            "org_id": org_id,
                            "is_primary": false
                        };
                        const depqueryText = `INSERT INTO public."department"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))}) RETURNING id`
                        let depresult = await client.query(depqueryText);

                    } else {
                        is_error = true
                        response = `${item.parent} does not exist,job failed`
                        return res.json({ status: false, message: response })
                    }
                } catch (error) {
                    logsService.log('error', req, error + "")
                    return res.status(500).json({ "status": false, message: error })
                }

            }

            return res.status(200).json({ "status": true, new_records: new_names, message: "Departments uploaded successfully" })

        }

        catch (error) {
            logsService.log('error', req, error + "")
            res.status(500).json({ "status": false, message: error })
        }
        finally {
            client.release()
            //  client.end()
        }

    } else {
        return res.json({ "status": false, message: 'please upload valid csv file ' })
    }

}
//CSV upload for Designations
async function desigGraphqlcsvupload(req, res) {
    const client = await pool.connect();
    let folderpath = req.body.folderpath
    let filename = req.body.filename
    let org_id = req.params.id;

    if (filename.split('.')[1] == "csv") {
        try {
            let filepath = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')
            let designation_get_csv_config = {
                method: 'GET',
                url: filepath,
                headers:
                {

                    'Content-Type': 'application/json'
                }

            };
            let designation_get_csv_response = await axios(designation_get_csv_config);

            const jsonObj2 = dataToJson.csv({ data: designation_get_csv_response.data }).toJson();//desigJson  

            let new_records = [];
            let new_names = [];
            jsonObj2.splice(0, 1);

            let jsonObj = jsonObj2.filter(word => word.id == "" || word.id == undefined);

            for (let i = 0; i < jsonObj.length; i++) {
                let item = jsonObj[i];
                if (item.id == "" || item.id == undefined) {

                    if (item.name == "" || item.name == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  designation name should not empty ` });
                    }
                    try {

                        var desigData = await client.query(`SELECT * from public."designation" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.name}'), ' ', '') and org_id ='${org_id}'`);//duplicate check   
                        if (desigData.rowCount > 0) {
                            return res.status(409).json({ "status": false, message: `${item.name} duplicate name in DB` })
                        }
                        if (desigData != null && desigData.rows.length == 0) {
                            if (new_names.indexOf(item.name) == -1) {
                                new_names.push(item.name);
                                new_records.push(item);
                            }
                            else {
                                return res.status(409).json({ "status": false, message: `${item.name} duplicate name in the same sheet ` })
                            }

                        } else {
                            return res.status(409).json({ "status": false, "message": `${item.name} duplicate Designation` });
                        }
                    } catch (error) {
                        logsService.log('error', req, error + "")
                        return res.json({ "status": false, message: error })
                    }
                }
            }

            //-------------------------
            // var new_records = new_records;
            var response;
            for (let i = 0; i < new_records.length; i++) {
                let item = new_records[i];
                try {

                    let obj = {
                        "name": item.name,
                        "org_id": org_id,
                    };

                    const desigqueryText = await client.query(`INSERT INTO public."designation"(${Object.keys(obj)}) VALUES(${await getarray(Object.values(obj))}) RETURNING id`)

                } catch (error) {
                    logsService.log('error', req, error + "")
                    return res.status(500).json({ "status": false, message: error })
                }

            }

            return res.status(200).json({ "status": true, new_records: new_names, message: "designation uploaded successfully" })

        }
        catch (error) {
            logsService.log('error', req, error + "")
            res.status(500).json({ "status": false, message: error })
        }
        finally {
            client.release()
            //  client.end()
        }

    } else {
        return res.json({ "status": false, message: 'please upload valid csv file ' })
    }

}
//CSV upload for Users
async function userCsvValidation(req, res) {
    let folderpath = req.body.folderpath
    let filename = req.body.filename
    let email = req.body.email;
    let org_id = req.params.id;
    let url = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')//generates a signed url from AWS
    const client = await pool.connect();
    if (filename.split('.').pop() == "xlsx") {
        try {
            let user_get_csv_config = {
                method: 'GET',
                url: url,
                headers:
                {
                    'Content-Type': 'application/json'
                }
            };
            const options = {//getting url by using axios
                url,
                responseType: "arraybuffer"
            }
            let axiosResponse = await axios(options);

            const workbook = XLSX.read(axiosResponse.data);//inserting the data in to 
            let users_json = XLSX.utils.sheet_to_json(workbook.Sheets['Users'])
            let new_records = [];
            let new_names = [];

            let jsonObj = users_json.filter(word => word.id == "" || word.id == undefined);
            for (let i = 0; i < jsonObj.length; i++) {
                let item = jsonObj[i];

                if (item.id == "" || item.id == undefined) {

                    if (item.name == "" || item.name == undefined || item.name.includes("'")) {
                        return res.json({ "status": false, "message": `${item.name}  user name should not be empty ` });
                    }
                    if (item.lastname == "" || item.lastname == undefined || item.name.includes("'")) {
                        return res.json({ "status": false, "message": `${item.name}  user lastname should not be empty ` });
                    }

                    if (item.phone == "" || item.phone == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  user phone should not be empty ` });
                    }
                    //mobile number validation--->
                    if (item.phone.toString().length > 10) {
                        return res.json({ "status": false, "message": `${item.phone} mobile number should not exceed 10 digits ` })
                    }
                    if (item.location_id == "" || item.location_id == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  user location_id should not be empty ` });
                    }
                    if (item.department_id == "" || item.department_id == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  user department_id should not be empty ` });
                    }
                    if (item.designation_id == "" || item.designation_id == undefined) {
                        return res.json({ "status": false, "message": `${item.name}  user designation should not be empty ` });
                    }
                    if (item.name.includes("'") || item.name.includes(",") || item.lastname.includes("'") || item.lastname.includes(",") || item.phone.toString().includes("'") || item.phone.toString().includes(",")) {
                        return res.json({ "status": false, "message": "value should not contain singlequote(') or comas(,)" });
                    }
                    try {
                        //check location 
                        let querylocation = await client.query(`select * from public."locations" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.location_id}'), ' ', '') and org_id=${org_id}`);

                        if (querylocation.rows.length > 0) {
                            item.location_id = querylocation.rows[0].id;
                        }
                        else {
                            return res.json({ "status": false, message: `${item.location_id} location does not exists` })
                        }
                        //check department
                        let querydepartment = await client.query(`select * from public."department" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.department_id}'), ' ', '') and org_id='${org_id}'`);

                        if (querydepartment.rows.length > 0) {
                            item.department_id = querydepartment.rows[0].id;
                        }
                        else {
                            return res.json({ "status": false, message: `${item.department_id} department does not exists` })
                        }
                        //check roles
                        let queryroles = await client.query(`select * from public."roles" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.role_id}'), ' ', '')`);

                        if (queryroles.rows.length > 0) {
                            item.role_id = queryroles.rows[0].id;
                        }
                        else {
                            return res.json({ "status": false, message: `${item.role_id} roles does not exists` })
                        }
                        //check desigination
                        let querydesigination = await client.query(`select * from public."designation" where REPLACE(LOWER(name), ' ', '') = REPLACE(LOWER('${item.designation_id}'), ' ', '') and org_id='${org_id}'`);

                        if (querydesigination.rows.length > 0) {
                            item.designation = querydesigination.rows[0].id;
                        }
                        else {
                            return res.json({ "status": false, message: `${item.designation_id} designation does not exists` })
                        }
                        //check users with phone 
                        let queryusers = await client.query(`select ur.id as id from public."users" us,public.user_org ur where ur.user_id=us.id and us.phone='${item.phone}' and ur.org_id=${org_id} and ur.is_delete=false`);

                        if (queryusers.rows.length > 0) {

                            return res.status(409).json({ "status": false, message: `${item.phone} duplicate mobilenumber ` })
                        }
                        //check user with email
                        let queryusersemail = await client.query(`select * from public."users" where email='${item.email}' and email IS NOT NULL and email NOT LIKE 'undefined'`);

                        if (queryusersemail.rows.length > 0) {
                            return res.status(409).json({ "status": false, message: `${item.email} email already  exists` })
                        }
                        //check users in reporting_manager
                        if (new_names.indexOf(item.phone) == -1) {
                            new_names.push(item.phone);
                            new_records.push(item);
                        }
                        else {
                            return res.status(409).json({ "status": false, message: `${item.phone} duplicate mobilenumber in the same sheet ` })
                        }

                    } catch (error) {
                        logsService.log('error', req, error + "")
                        return res.status(500).json({ "status": false, message: error })
                    }
                }
            }

            let csvReportObj = {
                "org_id": org_id,
                "filename": filename,
                "url": url,
                "folderpath": folderpath,
                "type": "upload"
            }
            const queryText = `INSERT INTO public."user_csv_reports"(${Object.keys(csvReportObj)}) VALUES(${await getarray(Object.values(csvReportObj))}) RETURNING id`;
            let insertreportdata = await client.query(queryText);
            eventEmitter.emit('usercsvupload', { new_records: new_records, org_id: org_id, users_json: users_json, email: email });
            res.status(200).json({ "status": true, message: "users uploaded successfully" })

        }
        catch (error) {
            logsService.log('error', req, error + "")
            res.status(500).json({ "status": false, message: error })
        }
        finally {
            client.release()
        }
    } else {
        return res.json({ "status": false, message: 'please upload valid xlsx file ' })
    }
}




module.exports.locGraphqlcsvupload = locGraphqlcsvupload;
module.exports.depGraphqlcsvuploadValidation = depGraphqlcsvuploadValidation;
module.exports.desigGraphqlcsvupload = desigGraphqlcsvupload;
module.exports.userCsvValidation = userCsvValidation;