'use strict';

const express = require('express');
const { param, body } = require('express-validator');
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
router.get('/users', getUsers);

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
