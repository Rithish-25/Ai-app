import { Chat } from '../models/Chat.js';
import { Document } from '../models/Document.js';
import { chatWithDocument, explainConcept } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Send message to AI Chat (Document-context or global)
export const sendChatMessage = async (req, res) => {
  try {
    const { message, documentId, subjectId } = req.body;
    const userId = req.user._id;

    if (!message || message.trim() === '') {
      return sendError(res, 'Message is required', 400);
    }

    // Find or create chat session
    const query = { userId };
    if (documentId) query.documentId = documentId;
    else if (subjectId) query.subjectId = subjectId;
    else query.documentId = null; // Global chat

    let chat = await Chat.findOne(query);
    if (!chat) {
      chat = await Chat.create({
        userId,
        documentId: documentId || null,
        subjectId: subjectId || null,
        messages: [],
      });
    }

    // Get context text from document if applicable
    let contextText = '';
    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, userId });
      if (doc) {
        contextText = doc.extractedText || '';
      }
    } else if (subjectId) {
      // Collect text summaries from all documents under this subject
      const docs = await Document.find({ subjectId, userId }).select('summary fileName');
      contextText = docs.map(d => `Document: ${d.fileName}\nSummary: ${d.summary}`).join('\n\n');
    }

    // Append user message to history
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Call Gemini API passing chat history & document context
    logger.info(`Sending chat query to Gemini. Context length: ${contextText.length}`);
    const assistantReply = await chatWithDocument(chat.messages, contextText, message);

    // Append AI assistant response to history
    chat.messages.push({
      role: 'model',
      content: assistantReply,
      timestamp: new Date(),
    });

    await chat.save();

    return sendSuccess(res, {
      reply: assistantReply,
      chatId: chat._id,
      messages: chat.messages,
    }, 'Message processed successfully');
  } catch (error) {
    logger.error(`Error in sendChatMessage: ${error.message}`);
    return sendError(res, 'Failed to process chat message', 500, error);
  }
};

// Fetch chat logs/history
export const getChatHistory = async (req, res) => {
  try {
    const { documentId, subjectId } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (documentId) query.documentId = documentId;
    else if (subjectId) query.subjectId = subjectId;
    else query.documentId = null; // Global

    const chat = await Chat.findOne(query);
    if (!chat) {
      return sendSuccess(res, [], 'No chat history found');
    }

    return sendSuccess(res, chat.messages, 'Chat history retrieved successfully');
  } catch (error) {
    logger.error(`Error in getChatHistory: ${error.message}`);
    return sendError(res, 'Failed to retrieve chat history', 500, error);
  }
};

// Explain a difficult academic concept (single turn query)
export const getConceptExplanation = async (req, res) => {
  try {
    const { concept, complexityLevel } = req.body; // level: beginner, intermediate, expert

    if (!concept || concept.trim() === '') {
      return sendError(res, 'Concept is required', 400);
    }

    const level = complexityLevel || 'beginner';
    logger.info(`Generating concept explanation for "${concept}" at "${level}" level`);
    
    const explanation = await explainConcept(concept, level);
    return sendSuccess(res, { concept, complexityLevel: level, explanation }, 'Explanation generated successfully');
  } catch (error) {
    logger.error(`Error in getConceptExplanation: ${error.message}`);
    return sendError(res, 'Failed to generate concept explanation', 500, error);
  }
};
