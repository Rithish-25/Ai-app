import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info('Firebase Admin SDK initialized successfully via JSON credentials.');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    logger.info('Firebase Admin SDK initialized successfully via GOOGLE_APPLICATION_CREDENTIALS path.');
  } else {
    // In development mode, allow starting up without Firebase SDK configured, logging a warning.
    logger.warn('WARNING: Firebase credentials not found. Authentication middleware will run in DEMO/DEVELOPMENT mode.');
    firebaseApp = null;
  }
} catch (error) {
  logger.error(`Error initializing Firebase Admin: ${error.message}`);
  firebaseApp = null;
}

export const adminAuth = firebaseApp ? admin.auth() : null;
export default firebaseApp;
