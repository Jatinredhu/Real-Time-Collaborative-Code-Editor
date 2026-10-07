import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = header.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(payload.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists' });
        }

        req.user = user;
        next(); 
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
