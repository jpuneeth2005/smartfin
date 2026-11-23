'use strict';

const express = require('express');
const { param, body, query } = require('express-validator');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  getStats,
  getUsers,
  updateUserStatus,
} = require('../controllers/adminController');

// All admin routes require ensureAuth + authorize('admin')
router.use(ensureAuth, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', getStats);

// GET /api/admin/users
router.get(
  '/users',
  [
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string')
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search cannot exceed 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000000 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt(),
  ],
  validate,
  getUsers
);

// PUT /api/admin/users/:id/status
router.put(
  '/users/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ],
  validate,
  updateUserStatus
);

module.exports = router;
