const express = require('express');
const router = express.Router();

const { createImage, searchImages } = require('../controllers/imageController');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

// POST endpoint for uploading image and storing it in the DB
router.post('/upload', createImage);

// GET endpoint to search for images added by author
router.get('/search/:author', searchImages);

module.exports = router;
