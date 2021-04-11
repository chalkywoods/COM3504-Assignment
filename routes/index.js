const express = require('express');
const router = express.Router();

const { createImage } = require('../controllers/imageController');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

router.post('/upload', createImage);



module.exports = router;
