import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashed });

        res.status(201).json({
            token: signToken(user),
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        const ok = user && (await bcrypt.compare(password, user.password));
        if (!ok) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            token: signToken(user),
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', requireAuth, (req, res) => {
    res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email } });
});


export default router;