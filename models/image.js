const mongoose = require("mongoose");

const schema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    rooms: [{
        type: String
    }]
});

module.exports = mongoose.model('Image', schema);
