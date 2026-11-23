'use strict';

const { body, param, query } = require('express-validator');
const { ALL_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../config/constants');
const { parseDateInput, endOfDayIST } = require('../utils/dateRange');

const validateDateAhead = (val) => {
  let date;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    date = parseDateInput(val);
  } else {
    date = new Date(val);
  }
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }

  // Not more than 1 day ahead (end of tomorrow in IST)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const maxAllowed = endOfDayIST(tomorrow);
  if (date.getTime() > maxAllowed.getTime()) {
    throw new Error('Date cannot be more than 1 day in the future');
  }
  return true;
};

const createTransactionValidator = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between 0.01 and 10,000,000')
    .toFloat(),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .custom((val, { req }) => {
      const type = req.body.type;
      if (type === 'income' && !INCOME_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not valid for income`);
      }
      if (type === 'expense' && !EXPENSE_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not valid for expense`);
      }
      if (!type && !ALL_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not a valid category`);
      }
      return true;
    }),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
    .trim()
    .escape(),

  body('date')
    .optional({ nullable: true, checkFalsy: true })
    .custom(validateDateAhead),
];

const updateTransactionValidator = [
  body('type')
    .optional()
    .trim()
    .isIn(['income', 'expense'])
    .withMessage('Type must be income or expense'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01, max: 10000000 })
    .withMessage('Amount must be between 0.01 and 10,000,000')
    .toFloat(),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .custom((val, { req }) => {
      const type = req.body.type;
      if (type === 'income' && !INCOME_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not valid for income`);
      }
      if (type === 'expense' && !EXPENSE_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not valid for expense`);
      }
      if (!type && !ALL_CATEGORIES.includes(val)) {
        throw new Error(`Category "${val}" is not a valid category`);
      }
      return true;
    }),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
    .trim()
    .escape(),

  body('date')
    .optional({ nullable: true, checkFalsy: true })
    .custom(validateDateAhead),
];

const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID format'),
];

const listQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['date', 'amount'])
    .withMessage('sortBy must be date or amount'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('order must be asc or desc'),

  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('type must be income or expense'),

  query('category')
    .optional()
    .isIn(ALL_CATEGORIES)
    .withMessage('Invalid category'),

  query('from')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('from must be a valid date (YYYY-MM-DD)'),

  query('to')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('to must be a valid date (YYYY-MM-DD)'),

  query('search')
    .optional()
    .trim(),
];

module.exports = {
  createTransactionValidator,
  updateTransactionValidator,
  idParamValidator,
  listQueryValidator,
};
