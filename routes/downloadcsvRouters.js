const express = require('express');
const router = express.Router();

const csvs = require('../controllers/downloadcsv')

router.get('/department/:id', csvs.departmentDownload);
router.get('/location/:id', csvs.locationDownload);
router.get('/users/:id', csvs.usersDownload);
router.get('/designation/:id', csvs.desiginationDownload);
router.post('/getTaskCsvReportUrl', csvs.getTaskCsvReportUrl);
module.exports = router