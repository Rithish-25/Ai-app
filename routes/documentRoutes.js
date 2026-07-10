import express from 'express';
import { uploadDocument, getDocumentsBySubject, getDocumentDetails, deleteDocument } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// File upload endpoint (accepts multipart/form-data with key 'file')
router.post('/upload', protect, upload.single('file'), uploadDocument);

// Get documents linked to a subject
router.get('/subject/:subjectId', protect, getDocumentsBySubject);

router.route('/:id')
  .get(protect, getDocumentDetails)
  .delete(protect, deleteDocument);

export default router;
