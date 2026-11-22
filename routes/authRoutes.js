const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/security');
const { ensureAuth } = require('../middleware/auth');
const { register, login, logout, getMe } = require('../controllers/authController');

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2-50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password min 8 chars')
      .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/)
      .withMessage('Password must contain a letter and a number'),
    body('confirmPassword').custom((val, { req }) => {
      if (val !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', ensureAuth, getMe);

module.exports = router;
