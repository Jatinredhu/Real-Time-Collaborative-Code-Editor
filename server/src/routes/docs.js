import express from 'express';
import mongoose from 'mongoose';
import Doc from '../models/Doc.js';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();
router.use(requireAuth);

async function loadDoc(req, res, next) {
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
        req.doc = doc;
        req.role = role;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

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

router.get('/:id', loadDoc, (req, res) => {
    const { doc, role } = req;
    res.json({
        doc: { id: doc._id, title: doc.title, language: doc.language, owner: doc.owner },
        role,
    });
});



const LANGUAGES = ['javascript', 'python', 'cpp', 'java'];

router.patch('/:id', loadDoc, async (req, res) => {
    try {
        if (req.role === 'viewer') {
            return res.status(403).json({ message: 'Viewers cannot edit document details' });
        }
        const { title, language } = req.body;
        if (typeof title === 'string' && title.trim()) {
            req.doc.title = title;
        }
        if (language !== undefined) {
            if (!LANGUAGES.includes(language)) {
                return res.status(400).json({ message: 'Unsupported language' });
            }
            req.doc.language = language;
        }
        await req.doc.save();
        res.json({ doc: { id: req.doc._id, title: req.doc.title, language: req.doc.language } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id/share', loadDoc, async (req, res) => {
    try {
        if (req.role !== 'owner') {
            return res.status(403).json({ message: 'Only the owner can share this document' });
        }
        const { email, role = 'editor' } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        if (!['editor', 'viewer'].includes(role)) {
            return res.status(400).json({ message: 'Role must be editor or viewer' });
        }

        const target = await User.findOne({ email: email.toLowerCase() });
        if (!target) {
            return res.status(404).json({ message: 'No user with that email' });
        }
        if (String(target._id) === String(req.doc.owner)) {
            return res.status(400).json({ message: 'You already own this document' });
        }

        const existing = req.doc.collaborators.find((c) => String(c.user) === String(target._id));
        if (existing) {
            existing.role = role;
        } else {
            req.doc.collaborators.push({ user: target._id, role });
        }
        await req.doc.save();
        res.json({ message: 'Shared', collaborators: req.doc.collaborators });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', loadDoc, async (req, res) => {
    try {
        if (req.role !== 'owner') {
            return res.status(403).json({ message: 'Only the owner can delete this document' });
        }
        await req.doc.deleteOne();
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;