const axios = require('axios');
const { Parser } = require('json2csv');
// const XLSX = require('xlsx');//---check
const path = require('path');
const excel = require('exceljs');
const configuration = require('../config/config.js').config;
let logsService = require('../config/logservice.js')
const awsmodule = require('../modules/aws')
function isObjectEmpty(object) {
    var isEmpty = true;
    for (keys in object) {
        isEmpty = false;
        break; // exiting since we found that the object is not empty
    }
    return isEmpty;
}
//CSV file Download api for Departments
async function departmentDownload(req, res) {
    //getting token and organizaion id from query params
    let token = req.query.token;
    let org_id = req.params.id;
    try {
        let data = {//query to get the departments with current organization
            query: `query MyQuery {
                department(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
                  id
                  name
                  parent
                }
              }`
        }
        let config = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: data,
        }
        let response = await axios(config)
        let resultdata = response.data.data.department
        const fields = resultdata[0].keys;//separating the keys
        const opts = { fields };

        try {
            const parser = new Parser(opts);
            const csv = parser.parse(resultdata);

            res.setHeader('Content-disposition', `attachment; filename=department-${org_id}.csv`);
            res.set('Content-Type', 'text/csv');
            res.status(200).send(csv);//downloads the csv
        } catch (err) {
            logsService.log('error', req, err + "");
            res.status(500).json({
                status: false,
                message: err
            })
        }

    }
    catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ "status": false, message: "something went wrong please try again", error })
    }

}
//CSV file Download api for Locations
async function locationDownload(req, res) {
    let token = req.query.token;
    let org_id = req.params.id;
    try {
        let data = {
            query: `query MyQuery {
                locations(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
                  id
                  name
                  parent
                }
              }`
        }
        let config = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: data,
        }
        let response = await axios(config)
        let resultdata = response.data.data.locations//Getting locations data using hasura graphql query
        const fields = resultdata[0].keys;//Taking keys from the data

        const opts = { fields };

        try {
            const parser = new Parser(opts);
            const csv = parser.parse(resultdata);

            res.setHeader('Content-disposition', `attachment; filename=location-${org_id}.csv`);
            res.set('Content-Type', 'text/csv');
            res.status(200).send(csv);
        } catch (err) {
            logsService.log('error', req, err + "");
            res.status(500).json({
                status: false,
                message: err
            })
        }

    }
    catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ "status": false, message: "something went wrong please try again", error })
    }

}
//CSV file Download api for Designations
async function desiginationDownload(req, res) {
    var token = req.query.token;
    var org_id = req.params.id;

    try {
        var data = {
            query: `query MyQuery {
                designation(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
                  id
                  name
                }
              }`
        }
        var config = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: data,
        }
        var response = await axios(config)
        var resultdata = response.data.data.designation
        const fields = resultdata[0].keys;
        const opts = { fields };
        try {
            const parser = new Parser(opts);
            const csv = parser.parse(resultdata);

            res.setHeader('Content-disposition', `attachment; filename=designation-${org_id}.csv`);
            res.set('Content-Type', 'text/csv');
            res.status(200).send(csv);
        } catch (err) {
            logsService.log('error', req, err + "");
            res.status(500).json({
                status: false,
                message: err
            })
        }

    }
    catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ "status": false, message: "something went wrong please try again", error })
    }

}
//CSV file Download api for Users
async function usersDownload(req, res) {
    let token = req.query.token;
    let org_id = req.params.id;
    const filtPath = path.resolve(__dirname, './', `streamed-workbook-1-${org_id}.xlsx`)
    let locationsdroup = [];
    let departmentsdroup = [];
    let designationsdroup = [];
    let rolesdroup = [];
    let options = {
        filename: filtPath,
        useStyles: true,
        useSharedStrings: true
    };
    let workbook = new excel.stream.xlsx.WorkbookWriter(options);
    try {
        //get query for user_org and user table
        let user_worksheet = workbook.addWorksheet('Users');
        let userdata = {
            query: `query {
                user_org(where:{is_delete:{_eq:false},org_id:{_eq:${org_id}}}){
                       id
                      user_id
                      org_id
                      department_id 
                      location_id
                      role_id
                      reporting_manager
                      is_active
                      active_time
                      designation_id
                user{
                      id
                       name
                       lastname
                       email
                       phone
                       is_delete
                       password
                       login_type
                } 
                }}`
        }
        let user_config = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: userdata,
        }
        let userresponse = await axios(user_config)
        let userresultdata = userresponse.data.data.user_org

        //iterate userResult data
        let u = 0;
        for (const item of userresultdata) {
            let obj = {
                "id": item.user.id,
                "name": item.user.name,
                "lastname": item.user.lastname,
                "email": item.user.email,
                "phone": item.user.phone,
                "location_id": item.location_id,
                "department_id": item.department_id,
                "role_id": item.role_id,
                "designation_id": item.designation_id,
                "reporting_manager": item.reporting_manager
            }
            if (u == 0) {
                u = u + 1;
                const user_fields = Object.keys(obj)
                var columns = [];
                for (var i = 0; i < user_fields.length; i++) {
                    columns.push({ header: `${user_fields[i]}`, key: `${user_fields[i]}`, width: 10 });
                }
                user_worksheet.columns = columns;
            }
            user_worksheet.addRow(obj);
        }
        // get query for locations  based on  org_id
        let location_worksheet = workbook.addWorksheet('Locations');
        let locdata = {
            query: `query MyQuery {
                locations(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
                  id
                  name
                  parent
                }
              }`
        }
        let location_config = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: locdata,
        }
        let locresponse = await axios(location_config)

        let location_resultdata = locresponse.data.data.locations;
        let l = 0;
        //iterate for each location data
        for (const item of location_resultdata) {
            let obj = { "name": item.name, "parent": item.parent, id: item.id };
            if (l == 0) {
                l = l + 1;
                const location_fields = Object.keys(obj)
                let columns = [];
                for (let i = 0; i < location_fields.length; i++) {
                    columns.push({ header: `${location_fields[i]}`, key: `${location_fields[i]}`, width: 10 });
                }
                location_worksheet.columns = columns;
            }
            location_worksheet.addRow(obj);
            locationsdroup.push(item.name)
        }
        // get  query for department  based on org_id
        let department_worksheet = workbook.addWorksheet('Departments');
        let depdata = {
            query: `query MyQuery {
             department(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
               id
               name
               parent
             }
           }`
        }
        let departmentconfig = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: depdata,
        }
        let departmentresponse = await axios(departmentconfig)
        let departmentresultdata = departmentresponse.data.data.department
        let dep = 0;
        //iterate for each department
        for (const item of departmentresultdata) {
            let obj = { "name": item.name, "parent": item.parent, id: item.id };
            if (dep == 0) {
                dep = dep + 1;
                const department_fields = Object.keys(obj)
                let columns = [];
                for (let i = 0; i < department_fields.length; i++) {
                    columns.push({ header: `${department_fields[i]}`, key: `${department_fields[i]}`, width: 10 });
                }
                department_worksheet.columns = columns;
            }
            department_worksheet.addRow(obj);
            departmentsdroup.push(item.name)
        }
        // get query for designations  based on org_id
        let desigination_worksheet = workbook.addWorksheet('Desiginations');
        let desigdata = {
            query: `query MyQuery {
             designation(order_by: {id: asc},where:{org_id:{_eq:${org_id}},is_delete:{_eq:false}}) {                                       
               id
               name
             }
           }`
        }
        let desiginationconfig = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: desigdata
        }
        let desigination_response = await axios(desiginationconfig)
        let desiginationresultdata = desigination_response.data.data.designation
        let de = 0;
        if (!isObjectEmpty(desiginationresultdata) && desiginationresultdata != null && desiginationresultdata.length > 0) {
            for (const item of desiginationresultdata) {
                if (item.name != "chairman") {
                    let obj = { "name": item.name, id: item.id };
                    if (de == 0) {
                        de = de + 1;
                        const desigination_fields = Object.keys(obj)
                        var columns = [];
                        for (let i = 0; i < desigination_fields.length; i++) {
                            columns.push({ header: `${desigination_fields[i]}`, key: `${desigination_fields[i]}`, width: 10 });
                        }
                        desigination_worksheet.columns = columns;
                    }
                    desigination_worksheet.addRow(obj);
                    designationsdroup.push(item.name)
                }
            }
        }
        // get query for roles 
        let roles_worksheet = workbook.addWorksheet('Roles');
        let roledata = {
            query: `query MyQuery { roles(where: {_or:[ {org_id: {_eq: 0}}, {org_id: {_eq:${org_id}}}],is_delete:{_eq:false}},order_by: {id: asc}) {
                   id
                   name
                   is_delete
         }
       }`
        }
        let roleconfig = {
            method: 'post',
            url: configuration.hasuradb.hasuraurl,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: roledata,
        }
        let rolesresponse = await axios(roleconfig)
        let roleresultdata = rolesresponse.data.data.roles
        let r = 0;
        for (const item of roleresultdata) {
            if (item.name != "owner") {
                let obj = { "name": item.name, id: item.id };
                if (r == 0) {
                    r = r + 1;
                    const role_fields = Object.keys(obj)
                    let columns = [];
                    for (let i = 0; i < role_fields.length; i++) {
                        columns.push({ header: `${role_fields[i]}`, key: `${role_fields[i]}`, width: 10 });
                    }
                    roles_worksheet.columns = columns;
                }

                roles_worksheet.addRow(obj);
                rolesdroup.push(item.name)
            }
        }
        let locationlist = locationsdroup.join(',');
        locationlist = [`"${locationlist}"`];
        let departmentlist = departmentsdroup.join(',');
        departmentlist = [`"${departmentlist}"`];
        let rolesdrouplist = rolesdroup.join(',');
        rolesdrouplist = [`"${rolesdrouplist}"`]
        for (let i = 0; i < 1000; i++) {
            user_worksheet.getCell('A' + userresultdata.length + i + 1).protection = { locked: true, };
            user_worksheet.getCell('F' + (userresultdata.length + i + 1))
                .dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: locationlist,
            };
            user_worksheet.getCell('G' + (userresultdata.length + i + 1))
                .dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: departmentlist
            };
            user_worksheet.getCell('H' + (userresultdata.length + i + 1))
                .dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: rolesdrouplist
            };
            user_worksheet.getCell('I' + (userresultdata.length + i + 1))
                .dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${designationsdroup.join(',')}"`]
            };
        }
        workbook.commit().then(function () {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader("Content-Disposition", "attachment; filename=" + "Users.xlsx");
            res.status(200).sendFile(filtPath);
        });

    }
    catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ "status": false, message: "something went wrong please try again", error })
    }
}
//CSV file Download api for Task Reports
async function getTaskCsvReportUrl(req, res) {
    let filename = req.body.filename;
    let folderpath = req.body.folderpath;
    try {
        let url = await awsmodule.getSignedUrl(folderpath, filename, 'getObject')
        return res.status(200).json({ status: true, "url": url })
    } catch (error) {
        logsService.log('error', req, error + "")
        res.status(500).json({ "status": false, message: "something went wrong please try again", error })
    }
}

module.exports.departmentDownload = departmentDownload;
module.exports.locationDownload = locationDownload;
module.exports.usersDownload = usersDownload;
module.exports.desiginationDownload = desiginationDownload;
module.exports.getTaskCsvReportUrl = getTaskCsvReportUrl;