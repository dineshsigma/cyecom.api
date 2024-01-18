const AWS = require('aws-sdk');
const config = require('../config/config.js').config;
let logsService = require('../config/logservice.js')

async function getSignedUrl(folderpath, filename, url_type) {
  try {
    let credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: "ap-south-1"
    };
    let s3 = new AWS.S3(credentials);
    let params;
    if (url_type == 'putObject') {
      params = { Bucket: 'happimobiles', Key: `test-images-v1/${folderpath}/${filename}`, ACL: "public-read", };

    } else {
      params = { Bucket: 'happimobiles', Key: `test-images-v1/${folderpath}/${filename}`, Expires: 100000 };

    }
    let response = await s3.getSignedUrl(url_type, params)
    return response
  } catch (error) {
    logsService.log('error', req, error + "")
  }
}

async function deleteObjectUrl(folderpath, filename) {
  try {
    let credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: "ap-south-1"
    };
    let s3 = new AWS.S3(credentials);
    let params = {
      Bucket: 'happimobiles',
      Key: `test-images-v1/${folderpath}/${filename}`
    };

    let res = await s3.deleteObject(params, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
      } else {
        return res  // successful response
      }
    });
  } catch (error) {
    logsService.log('error', req, error + "")
  }

}

module.exports.getSignedUrl = getSignedUrl;
module.exports.deleteObjectUrl = deleteObjectUrl;