import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'linkvault-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    const user = await User.create({ email: email.toLowerCase().trim(), password });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, email: user.email },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, email: user.email },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

router.get('/me', protect, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
