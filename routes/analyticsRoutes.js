'use strict';

const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  analyticsDateValidator,
  savingsQueryValidator,
} = require('../middleware/analyticsValidators');
const {
  getTrend,
  getCategories,
  getIncomeVsExpense,
  getSavings,
} = require('../controllers/analyticsController');

router.use(ensureAuth);

// GET /api/analytics/trend
router.get('/trend', analyticsDateValidator, validate, getTrend);

// GET /api/analytics/categories
router.get('/categories', analyticsDateValidator, validate, getCategories);

// GET /api/analytics/income-vs-expense
router.get('/income-vs-expense', analyticsDateValidator, validate, getIncomeVsExpense);

// GET /api/analytics/savings
router.get('/savings', savingsQueryValidator, validate, getSavings);

module.exports = router;
