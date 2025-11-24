const express = require('express');
const router = express.Router();
const Place = require('../models/Place');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
        const places = await Place.find();
        res.json(places);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    try {
        const place = await Place.findById(id);
        if (!place) return res.status(404).json({ error: 'Place not found' });
        res.json(place);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    // Accept both 'description' and 'descripcion' from the client
    const { name, descripcion, description, latitude, longitude } = req.body;
    const desc = descripcion || description || '';
    try{
        const place = new Place({
            name,
            descripcion: desc,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        });
        const saved = await place.save();
        res.json(saved);
    } catch (err) {
        res.status(400).json({error: err.message});
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, descripcion, description, latitude, longitude } = req.body;
    const desc = descripcion || description;
    try {
        const update = {};
        if (name !== undefined) update.name = name;
        if (desc !== undefined) update.descripcion = desc;
        if (latitude !== undefined && longitude !== undefined) {
            update.location = { type: 'Point', coordinates: [longitude, latitude] };
        }

        const updated = await Place.findByIdAndUpdate(id, update, { new: true });
        if (!updated) return res.status(404).json({ error: 'Place not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
    try {
        const removed = await Place.findByIdAndDelete(id);
        if (!removed) return res.status(404).json({ error: 'Place not found' });
        res.json({ message: 'Deleted', id: removed._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;