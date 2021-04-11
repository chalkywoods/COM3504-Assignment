const mongoose = require('mongoose');

const CONNECTION_STRING = 'mongodb://localhost:27017/images';

mongoose.Promise = global.Promise;

const init = () => {
  try {
      mongoose.connect(CONNECTION_STRING, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          checkServerIdentity: false,
      });

      console.log('Connected to the database successfully');
  } catch {
      console.error('Error while connecting to the database!');
  }
};

module.exports = { init };