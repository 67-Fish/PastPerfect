import express from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { paperController } from './controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, authorize, requireRole } from '../../shared/middleware/auth.js';
import { rateLimiters } from '../../shared/middleware/rateLimit.js';

const router = express.Router();

// Multer config for PDF upload (memory storage for BLOB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// List papers (all roles)
router.get('/', paperController.list);

// Get grades for filters
router.get('/grades', paperController.getGrades);

// Get related papers
router.get('/:id/related', paperController.getRelated);

// Get paper by ID
router.get('/:id', paperController.getById);

// Download paper
router.get('/:id/download', paperController.download);

// View paper (inline)
router.get('/:id/view', paperController.view);

// Upload paper (schoolAdmin, teacher)
router.post('/', 
  rateLimiters.upload,
  upload.single('file'),
  [
    body('subjectId').isInt({ min: 1 }),
    body('examSeriesId').isInt({ min: 1 }),
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('gradeLevel').optional().trim().isLength({ max: 50 }),
    body('paperType').optional().isIn(['exam', 'mark_scheme', 'examiner_report', 'syllabus', 'other']),
    body('durationMinutes').optional().isInt({ min: 1, max: 600 }),
    body('totalMarks').optional().isInt({ min: 1, max: 1000 }),
    body('publish').optional().isBoolean(),
  ],
  validate,
  paperController.create
);

// Update paper (schoolAdmin, teacher - own papers only)
router.put('/:id',
  upload.single('file'),
  [
    body('subjectId').optional().isInt({ min: 1 }),
    body('examSeriesId').optional().isInt({ min: 1 }),
    body('title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('gradeLevel').optional().trim().isLength({ max: 50 }),
    body('paperType').optional().isIn(['exam', 'mark_scheme', 'examiner_report', 'syllabus', 'other']),
    body('durationMinutes').optional().isInt({ min: 1, max: 600 }),
    body('totalMarks').optional().isInt({ min: 1, max: 1000 }),
    body('publish').optional().isBoolean(),
  ],
  validate,
  paperController.update
);

// Delete paper (schoolAdmin, teacher - own papers only)
router.delete('/:id', paperController.delete);

export default router;