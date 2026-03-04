const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { auth, authorize, validate } = require('../middleware');

// Public: list all departments
router.get('/', departmentController.getAllDepartments);

// Public: get single department by code
router.get('/:code', departmentController.getDepartmentByCode);

// Admin only: create department
router.post(
  '/',
  auth,
  authorize('super_admin', 'admin'),
  [
    body('name').notEmpty().withMessage('Department name is required'),
    body('description').optional().isString(),
    body('subcategories').optional().isArray().withMessage('Subcategories must be an array'),
    body('subcategories.*.name').notEmpty().withMessage('Subcategory name is required').isString().trim(),
    body('subcategories.*.sla').optional().isString().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  departmentController.createDepartment
);

// Admin only: update department
router.patch(
  '/:id',
  auth,
  authorize('super_admin', 'admin'),
  [
    param('id').isMongoId().withMessage('Invalid department ID'),
    body('name').optional().notEmpty(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  departmentController.updateDepartment
);

// Admin only: delete (deactivate) department
router.delete(
  '/:id',
  auth,
  authorize('super_admin', 'admin'),
  [param('id').isMongoId().withMessage('Invalid department ID')],
  validate,
  departmentController.deleteDepartment
);

module.exports = router;
