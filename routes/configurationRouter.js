const express = require('express');
const router = express.Router();

const configuration = require('../controllers/configuration')

router.post('/getFileUploadUrl/:org_id', configuration.getFileUploadUrl);

router.post('/getAttachmentSignedUrl', configuration.getAttachmentSignedUrl);

router.post('/getMultipleAttachmentSignedUrl', configuration.getMultipleAttachmentSignedUrl);

router.get('/getAccesDropdown', configuration.getAccesDropdown);

module.exports = router

