const express = require('express');
const router = express.Router();

const uploadcsvs = require('../controllers/uploadCSVs')


router.post('/location/:id', uploadcsvs.locGraphqlcsvupload);
router.post('/department/:id', uploadcsvs.depGraphqlcsvuploadValidation);
router.post('/designation/:id', uploadcsvs.desigGraphqlcsvupload);
router.post('/users/:id', uploadcsvs.userCsvValidation)

module.exports = router;
