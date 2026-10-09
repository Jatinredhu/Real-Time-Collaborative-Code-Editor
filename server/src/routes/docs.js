import express from 'express';
import mongoose from 'mongoose';
import Doc from '../models/Doc.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
    try {
        const { title, language } = req.body;
        const doc = await Doc.create({ title, language, owner: req.user._id });
        res.status(201).json({ doc: { id: doc._id, title: doc.title, language: doc.language } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/', async (req, res) => {
    try {
        const docs = await Doc.find({
            $or: [{ owner: req.user._id }, { 'collaborators.user': req.user._id }],
        })
            .select('title language owner updatedAt')
            .sort({ updatedAt: -1 });
        res.json({ docs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const doc = await Doc.findById(req.params.id).select('-state');
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const role = doc.getRole(req.user._id);
        if (!role) {
            return res.status(403).json({ message: 'You do not have access to this document' });
        }
        res.json({
            doc: { id: doc._id, title: doc.title, language: doc.language, owner: doc.owner },
            role,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;