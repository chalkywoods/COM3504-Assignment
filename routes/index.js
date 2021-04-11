const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Image = require('../models/image');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

router.post('/upload', async function(req, res, next) {
  const {
    title, description, author, image: base64
  } = req.body;

  try {
    await Image.create({ title, description, author, base64 });
  } catch(err) {
    if(err instanceof mongoose.Error.ValidationError) {
      res.sendStatus(422);
      return;
    }

    res.sendStatus(500);
    return;
  }

  res.sendStatus(201);
});



module.exports = router;
