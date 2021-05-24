  const express = require('express');
const router = express.Router();

const { createImage, searchImages, getImage, checkRoom, addRoom} = require('../controllers/imageController');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

// POST endpoint for uploading image and storing it in the DB
router.post('/upload', createImage);

// POST endpoint for checking whether a room has an associated image
router.post('/checkRoom', checkRoom);

// POST endpoint to search for images added by author
router.post('/search', searchImages);

// POST endpoint to add an existing image to a new room
router.post('/add', addRoom);

// GET endpoint to get an image by its ID
router.get('/image/:id', getImage);

module.exports = router;
