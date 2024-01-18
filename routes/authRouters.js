const express = require('express');
const router = express.Router();

const auth = require('../controllers/authcontrollers')

router.post('/userLoginGraphql', auth.userLoginGraphql);//user login api

router.post('/otpAuthentication', auth.otpAuthentication);

router.post('/verifyAuthentication', auth.verifyAuthentication);

router.post('/tokenGenaration', auth.HausaraAccessToken);

router.post('/orgination/epotps', auth.epots);

//router.get('/dashboard-guest-token', auth.call1);

router.post('/forgetPassword', auth.forgetPassword);

router.post('/setPassword', auth.setPassword);

router.post('/resetPassword', auth.resetPassword);

router.post('/emailOtp', auth.emailOtp);


module.exports = router