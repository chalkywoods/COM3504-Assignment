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
    base64: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Image', schema);
