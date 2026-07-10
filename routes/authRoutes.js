import express from 'express';
import { getProfile, registerOrLogin, updateSettings } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Synchronize Firebase Auth user with Mongoose DB
router.post('/register-or-login', protect, registerOrLogin);

// Fetch current user details
router.get('/profile', protect, getProfile);

// Update user preferences (theme settings, notifications)
router.put('/settings', protect, updateSettings);

export default router;
