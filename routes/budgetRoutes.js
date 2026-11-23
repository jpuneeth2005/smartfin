'use strict';

const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBudgetValidator,
  updateBudgetValidator,
  budgetIdValidator,
  budgetMonthQueryValidator,
} = require('../middleware/budgetValidators');
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');

router.use(ensureAuth);

// POST /api/budgets
router.post('/', createBudgetValidator, validate, createBudget);

// GET /api/budgets
router.get('/', budgetMonthQueryValidator, validate, getBudgets);

// PUT /api/budgets/:id
router.put('/:id', budgetIdValidator, updateBudgetValidator, validate, updateBudget);

// DELETE /api/budgets/:id
router.delete('/:id', budgetIdValidator, validate, deleteBudget);

module.exports = router;
