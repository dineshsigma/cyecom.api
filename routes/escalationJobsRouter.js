const express = require('express');
const router = express.Router();

const jobs = require("../jobs/escalationJobs");

router.post('/selfEscalationJob', jobs.selfEscalationJob);

router.post('/escalation1Job', jobs.escalation_1Job);

router.post('/escalation2Job', jobs.escalation_2Job);

router.post('/escalation3Job', jobs.escalation_3Job);



module.exports = router
