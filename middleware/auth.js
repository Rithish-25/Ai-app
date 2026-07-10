import { adminAuth } from '../config/firebase.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    let decodedToken;

    if (adminAuth) {
      // Production path: verify with Firebase Admin
      decodedToken = await adminAuth.verifyIdToken(token);
    } else {
      // Local development/mock path when Firebase is not configured
      // Allow any token starting with 'dev_' or falling back to a default mock user
      logger.debug(`Firebase Auth is bypassed. Using mock verification for token: ${token}`);
      
      const mockUid = token.startsWith('mock_') ? token : 'dev_user_123';
      decodedToken = {
        uid: mockUid,
        email: `${mockUid}@studyassistant.com`,
        name: mockUid === 'dev_user_123' ? 'Developer Student' : `Student ${mockUid.replace('mock_', '')}`,
        picture: '',
      };
    }

    // Check if user exists in MongoDB; if not, create on the fly to sync user account
    let user = await User.findById(decodedToken.uid);
    if (!user) {
      user = await User.create({
        _id: decodedToken.uid,
        email: decodedToken.email || `${decodedToken.uid}@unspecified.com`,
        displayName: decodedToken.name || 'AI Student',
        photoURL: decodedToken.picture || '',
        darkMode: false,
        notificationSettings: {
          dailyReminders: true,
          quizAlerts: true,
        },
      });
      logger.info(`Synchronized new user to MongoDB: ${user._id}`);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Auth middleware verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token invalid or expired',
    });
  }
};
