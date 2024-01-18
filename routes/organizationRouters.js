const express = require('express');
const router = express.Router();

const organization = require('../controllers/organization')

router.post('/graphqlOrganizationRegister', organization.graphqlOrganizationRegister);
router.post('/graphqlAddOrganization', organization.graphqlAddOrganization);
router.post('/changeOrganizationGraphql', organization.changeOrganizationGraphql);
router.post('/organizationLogs', organization.organizationLogs);
router.post('/changeAsAliasUser', organization.changeAsAliasUser);
router.post('/userExistCheckInOrg', organization.userExistCheckInOrg);
router.post('/paymentGateway', organization.paymentGateway)
router.get('/razorpycallbackurl', organization.getPaymentLink)

//router.get('/personalTodo',organization.personalTodo);
module.exports = router