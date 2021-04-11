const express = require('express');
const router = express.Router();

const Image = require('../models/image');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

router.post('/upload', async function(req, res, next) {

  res.sendStatus(200);
});



module.exports = router;
