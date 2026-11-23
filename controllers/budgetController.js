'use strict';

const budgetService = require('../services/budgetService');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { currentMonthKey } = require('../utils/dateRange');

/**
 * POST /api/budgets
 * Create a new budget
 */
const createBudget = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { month, category, limit, alertThreshold } = req.body;

  // Check for duplicate
  const existing = await Budget.findOne({ user: userId, month, category });
  if (existing) {
    return sendError(res, 'A budget already exists for this category and month', 409);
  }

  try {
    const budget = await budgetService.createBudget(userId, {
      month,
      category,
      limit,
      alertThreshold,
    });
    return sendSuccess(res, budget, 'Budget created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'A budget already exists for this category and month', 409);
    }
    throw error;
  }
});

/**
 * GET /api/budgets?month=YYYY-MM
 * Get budgets with progress, alerts, and summary
 */
const getBudgets = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const month = req.query.month || currentMonthKey();

  const data = await budgetService.getBudgetsWithProgress(userId, month);
  return sendSuccess(res, data);
});

/**
 * PUT /api/budgets/:id
 * Update budget limit and/or alertThreshold
 */
const updateBudget = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  const { limit, alertThreshold } = req.body;

  const budget = await budgetService.updateBudget(userId, id, { limit, alertThreshold });
  if (!budget) {
    return sendError(res, 'Budget not found', 404);
  }

  return sendSuccess(res, budget, 'Budget updated successfully');
});

/**
 * DELETE /api/budgets/:id
 * Delete a budget
 */
const deleteBudget = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  const budget = await budgetService.deleteBudget(userId, id);
  if (!budget) {
    return sendError(res, 'Budget not found', 404);
  }

  return sendSuccess(res, null, 'Budget deleted successfully');
});

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
};
