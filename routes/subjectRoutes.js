import express from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subjectController.js';
import { protect } from '../middleware/auth.js';
import { subjectValidator, validate } from '../validators/inputValidators.js';

const router = express.Router();

router.route('/')
  .get(protect, getSubjects)
  .post(protect, subjectValidator, validate, createSubject);

router.route('/:id')
  .put(protect, updateSubject)
  .delete(protect, deleteSubject);

export default router;
