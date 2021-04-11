const mongoose = require('mongoose');

const Image = require('../models/image');

exports.createImage = async (req, res) => {
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
};