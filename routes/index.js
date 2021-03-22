var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Image Browsing' });
});

router.post('/upload', function(req, res, next) {
  var body = req.body;
  console.log(body['title'])
  // TODO save image to MongoDB
  res.sendStatus(200);
});



module.exports = router;
