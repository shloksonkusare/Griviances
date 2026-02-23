const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { adminController } = require('../controllers');
const { auth, authorize, validate } = require('../middleware');

// Initialize first super admin (works only once)
router.post(
  '/initialize',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  validate,
  adminController.initializeSuperAdmin
);

// Admin login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  adminController.login
);

// Protected routes
router.use(auth);

// Get current admin profile
router.get('/profile', adminController.getProfile);

// Update current admin profile
router.patch(
  '/profile',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone'),
    body('preferredLanguage')
      .optional()
      .isIn(['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa']),
  ],
  validate,
  adminController.updateProfile
);

// Change password
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  adminController.changePassword
);

// Logout
router.post('/logout', adminController.logout);

// Super admin only routes
router.get(
  '/all',
  authorize('super_admin'),
  adminController.getAllAdmins
);

router.post(
  '/',
  authorize('super_admin'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .isIn(['super_admin', 'admin', 'moderator', 'viewer'])
      .withMessage('Invalid role'),
    body('department')
      .optional()
      .isIn(['roads', 'electricity', 'water', 'sanitation', 'general', 'all'])
      .withMessage('Invalid department'),
  ],
  validate,
  adminController.createAdmin
);

router.patch(
  '/:id',
  authorize('super_admin'),
  [
    param('id').isMongoId().withMessage('Invalid admin ID'),
  ],
  validate,
  adminController.updateAdmin
);

router.delete(
  '/:id',
  authorize('super_admin'),
  [
    param('id').isMongoId().withMessage('Invalid admin ID'),
  ],
  validate,
  adminController.deleteAdmin
);

module.exports = router;
