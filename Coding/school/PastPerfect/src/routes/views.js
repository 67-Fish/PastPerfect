import express from 'express';
import { authenticate } from '../shared/middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', (req, res) => {
  res.render('landing', { title: 'PastPerfect - School Past Papers Archive' });
});

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login - PastPerfect' });
});

router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register - PastPerfect' });
});

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password - PastPerfect' });
});

router.get('/reset-password', (req, res) => {
  res.render('auth/reset-password', { title: 'Reset Password - PastPerfect' });
});

// Protected routes - require authentication
router.get('/dashboard', authenticate, (req, res) => {
  res.render('dashboard/index', { 
    title: 'Dashboard - PastPerfect',
    user: req.user,
  });
});

// Papers routes
router.get('/papers', authenticate, (req, res) => {
  res.render('papers/index', { 
    title: 'Past Papers - PastPerfect',
    user: req.user,
  });
});

router.get('/papers/upload', authenticate, (req, res) => {
  res.render('papers/upload', { 
    title: 'Upload Paper - PastPerfect',
    user: req.user,
  });
});

router.get('/papers/:id', authenticate, (req, res) => {
  res.render('papers/show', { 
    title: 'Paper Details - PastPerfect',
    user: req.user,
    paperId: req.params.id,
  });
});

// Study routes (placeholder)
router.get('/study', authenticate, (req, res) => {
  res.render('study/index', { 
    title: 'Study - PastPerfect',
    user: req.user,
  });
});

router.get('/study/sessions', authenticate, (req, res) => {
  res.render('study/sessions', { 
    title: 'Study Sessions - PastPerfect',
    user: req.user,
  });
});

// Admin routes
router.get('/admin', authenticate, (req, res) => {
  if (!req.user?.roles.includes('admin')) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }
  res.render('admin/index', { 
    title: 'Admin Dashboard - PastPerfect',
    user: req.user,
  });
});

router.get('/admin/schools', authenticate, (req, res) => {
  if (!req.user?.roles.includes('admin')) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }
  res.render('admin/schools', { 
    title: 'Manage Schools - PastPerfect',
    user: req.user,
  });
});

router.get('/admin/users', authenticate, (req, res) => {
  if (!req.user?.roles.includes('admin')) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }
  res.render('admin/users', { 
    title: 'Manage Users - PastPerfect',
    user: req.user,
  });
});

// School admin routes
router.get('/school/settings', authenticate, (req, res) => {
  if (!req.user?.roles.includes('schoolAdmin') && !req.user?.roles.includes('admin')) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }
  res.render('school/settings', { 
    title: 'School Settings - PastPerfect',
    user: req.user,
  });
});

router.get('/school/users', authenticate, (req, res) => {
  if (!req.user?.roles.includes('schoolAdmin') && !req.user?.roles.includes('admin')) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }
  res.render('school/users', { 
    title: 'Manage Users - PastPerfect',
    user: req.user,
  });
});

router.get('/school/subjects', authenticate, (req, res) => {
  res.render('school/subjects', { 
    title: 'Manage Subjects - PastPerfect',
    user: req.user,
  });
});

router.get('/school/exam-series', authenticate, (req, res) => {
  res.render('school/exam-series', { 
    title: 'Manage Exam Series - PastPerfect',
    user: req.user,
  });
});

export default router;