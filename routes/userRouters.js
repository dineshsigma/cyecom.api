const express = require('express');
const router = express.Router();
const users = require('../controllers/userscontrollers')

router.post('/graphqlCreateUser', users.graphqlCreateUser);
router.post('/userLogs', users.userLogs);
router.post('/userOrgLogs', users.userOrgLogs);
router.get('/urlpath', users.urlpath);
router.get('/url_path', users.url_path);
router.post('/userExistCheckInCreate', users.userExistCheckInCreate);



module.exports = router;
