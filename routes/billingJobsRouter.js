const express = require('express');
const router = express.Router();

const jobs = require("../jobs/billingJobs");


router.post('/runBillingStatement', jobs.runBillingStatement);

router.post('/runBillingMaster', jobs.runBillingMaster);

router.post('/orgbillInvoiceStatus', jobs.orgbillingInvoiceStatus);

module.exports = router