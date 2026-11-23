'use strict';

const { body, param, query } = require('express-validator');
const { BUDGET_CATEGORIES } = require('../config/constants');

const createBudgetValidator = [
  body('month')
    .trim()
    .notEmpty()
    .withMessage('Month is required')
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Month must be in YYYY-MM format'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(BUDGET_CATEGORIES)
    .withMessage(`Category must be one of: ${BUDGET_CATEGORIES.join(', ')}`),

  body('limit')
    .notEmpty()
    .withMessage('Limit is required')
    .isFloat({ min: 0.01 })
    .withMessage('Limit must be greater than 0')
    .toFloat(),

  body('alertThreshold')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 1, max: 100 })
    .withMessage('Alert threshold must be between 1 and 100')
    .toFloat(),
];

const updateBudgetValidator = [
  body('month').custom((val) => {
    if (val !== undefined) throw new Error('Month cannot be changed');
    return true;
  }),

  body('category').custom((val) => {
    if (val !== undefined) throw new Error('Category cannot be changed');
    return true;
  }),

  body('limit')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Limit must be greater than 0')
    .toFloat(),

  body('alertThreshold')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Alert threshold must be between 1 and 100')
    .toFloat(),

  body().custom((value, { req }) => {
    if (req.body.limit === undefined && req.body.alertThreshold === undefined) {
      throw new Error('At least limit or alertThreshold must be provided to update');
    }
    return true;
  }),
];

const budgetIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid budget ID format'),
];

const budgetMonthQueryValidator = [
  query('month')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('Month must be in YYYY-MM format'),
];

module.exports = {
  createBudgetValidator,
  updateBudgetValidator,
  budgetIdValidator,
  budgetMonthQueryValidator,
};
