const mongoose = require('mongoose');
const fetch = require('node-fetch');

const Image = require('../models/image');

exports.createImage = async (req, res) => {
    const {
        title, description, author, url, rooms
    } = req.body;
    try {
        await Image.create({title, description, author, url, rooms});
    } catch(err) {
        console.log(err)
        if(err instanceof mongoose.Error.ValidationError) {
            res.sendStatus(422);
            return;
        }

        res.sendStatus(500);
        return;
    }

    res.sendStatus(201);
};

exports.searchImages = async (req, res) => {
    const { author } = req.body;

    try {
        const images = await Image.find({ author }, "title description author url");
        res.status(200).json(images);
        return;
    } catch(err) {
        res .send(500);
        return;
    }
};

exports.getImage = async (req, res) => {
    const { id } = req.params;

    try {
        const image = await Image.findById(id);

        if(!image) {
            res.sendStatus(404);
            return;
        }

        res.status(200).json(image);
    } catch(err) {
        if(err instanceof mongoose.Error.CastError) {
            res.sendStatus(404);
            return;
        }

        res.sendStatus(500);
        return;
    }
};

exports.checkRoom = async (req, res) => {
    const { room } = req.body;
    try {
        const image = await Image.findOne({ rooms: room}, 'title description author url');
        if(!image) {
            res.sendStatus(404);
            return;
        }

        res.status(200).json(image);
    } catch(err) {
        if(err instanceof mongoose.Error.CastError) {
            res.sendStatus(404);
            return;
        }

        res.sendStatus(500);
        return;
    }
};

exports.addRoom = async (req, res) => {
    const { id, room } = req.body;

    try {
        const updated = await Image.updateOne({ _id: id}, { "$addToSet": { "rooms": room} });
        if(updated.matchedCount === 0) {
            res.sendStatus(404);
            return;
        }

        res.sendStatus(200);
    } catch(err) {
        if(err instanceof mongoose.Error.CastError) {
            res.sendStatus(404);
            return;
        }

        res.sendStatus(500);
        return;
    }
}

exports.getImageAsProxy = async (req, res) => {
    const url = req.query.url;

    try {
        const response = await fetch(url);

        const type = response.headers.get('content-type');

        console.log("TYPE: ", response.headers.get('content-type'));

        const buffer = await response.buffer();

        res.set('content-type', type);
        res.status(200).send(buffer);
    } catch(err) {
        res.sendStatus(500);
        return;
    }
}