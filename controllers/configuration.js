const awsmodule = require('../modules/aws')
const AWS = require('aws-sdk');
const config = require('../config/config.js').config;
let logsService = require('../config/logservice.js')

//generating & getting the files url from AWS 
async function getFileUploadUrl(req, res) {
  try {
    var table_id = req.body.table_id;
    var filename = req.body.filename;
    var org_id = req.params.org_id;
    var folder_type = req.body.folder_type == undefined ? 'Attachments' : req.body.folder_type;
    var table_name = req.body.table_name;
    var folderpath;
    if (folder_type != 'csv') {
      folderpath = `org/${org_id}/${table_name}/${table_id}`
    } else {
      folderpath = `org/${org_id}/${folder_type}`
    }
    var url = await awsmodule.getSignedUrl(folderpath, filename, 'putObject');
    res.status(200).json({ "status": true, message: "path fetched successfully", "data": url, folderpath: folderpath, "baseurl": config.baseurl })
  } catch (error) {
    console.log(error)
    res.status(500).json({ "status": false, message: "something went wrong please try again", error: error.message })
  }

}
//generating & getting the reports file url from AWS 
async function getReportFileUploadUrl(filename, org_id, folder_type) {
  try {
    let folderpath;
    folderpath = `org/${org_id}/reports/${folder_type}`
    let url = await awsmodule.getSignedUrl(folderpath, filename, 'putObject');
    return { url, folderpath }
  } catch (error) {
    logsService.log('error', req, error + "")
    return null
  }

}
//generating & getting the task reports file url from AWS 
async function getTasksReportFileUploadUrl(filename, org_id, folder_type) {
  try {
    let folderpath;
    folderpath = `org/${org_id}/taskReports/${folder_type}`
    let url = await awsmodule.getSignedUrl(folderpath, filename, 'putObject');
    return { url, folderpath }
  } catch (error) {
    logsService.log('error', req, error + "")
    return null
  }
}
//getting the Signed url from aws for multiple attachments by giving the filename and the folder path 
async function getMultipleAttachmentSignedUrl(req, res) {
  try {
    const data = [];
    const paths = req.body.objects;//taking multiple attachmet objects 

    if (!Array.isArray(paths) || paths.length === 0) return res.status(400).send("Invalid data")

    for (let i = 0; i < paths.length; i++) {
      const folderpath = paths[i].folder_path;
      const filename = paths[i].file_name;
      const credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: "ap-south-1"
      };

      const s3 = new AWS.S3(credentials);
      const params = { Bucket: 'happimobiles', Key: `test-images-v1/${folderpath}/${filename}`, Expires: 900 };
      const response = await s3.getSignedUrl('getObject', params);
      data.push(response)
    }

    res.status(200).json({ status: true, message: "successfully fetched.", data })
  } catch (error) {
    logsService.log('error', req, error + "")
    res.status(500).json({ status: false, message: error })
  }

}

// not sure if it is in use 
async function getAttachmentSignedUrl(req, res) {
  try {
    let folderpath = req.body.folder_path;
    let filename = req.body.file_name
    let credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: "ap-south-1"
    };
    let s3 = new AWS.S3(credentials);
    let params = { Bucket: 'happimobiles', Key: `test-images-v1/${folderpath}/${filename}`, Expires: 900 };
    let response = await s3.getSignedUrl('getObject', params)
    return res.status(200).json({ status: true, message: 'fetched successfully', data: response })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }

}

async function getAccesDropdown(req, res) {
  try {
    return res.status(200).json({ status: true, message: config.access })
  } catch (error) {
    logsService.log('error', req, error + "")
    return res.status(500).json({ status: false, message: error })
  }
}
module.exports.getReportFileUploadUrl = getReportFileUploadUrl;
module.exports.getFileUploadUrl = getFileUploadUrl;
module.exports.getAttachmentSignedUrl = getAttachmentSignedUrl;
module.exports.getMultipleAttachmentSignedUrl = getMultipleAttachmentSignedUrl;
module.exports.getTasksReportFileUploadUrl = getTasksReportFileUploadUrl;
module.exports.getAccesDropdown = getAccesDropdown;
