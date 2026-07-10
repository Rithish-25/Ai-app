import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

let genAIInstance = null;

if (process.env.GEMINI_API_KEY) {
  try {
    // Initializing Gemini SDK (Note: support the official GoogleGenerativeAI structure)
    genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    logger.info('Gemini AI SDK client initialized successfully.');
  } catch (error) {
    logger.error(`Error initializing Gemini AI SDK: ${error.message}`);
  }
} else {
  logger.warn('WARNING: GEMINI_API_KEY is not defined. AI features will fail or run in fallback modes.');
}

export const getGeminiInstance = () => genAIInstance;
