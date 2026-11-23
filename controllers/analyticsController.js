'use strict';

const statsService = require('../services/statsService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/analytics/trend
 * Returns { points: [{ key, label, total, count }], summary: { total, average, highest } }
 */
const getTrend = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { from, to, groupBy = 'day', type = 'expense' } = req.query;

  const data = await statsService.getTrend(userId, { from, to, groupBy, type });
  return sendSuccess(res, data);
});

/**
 * GET /api/analytics/categories
 * Returns { categories: [{ category, total, count, percent }], total }
 */
const getCategories = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { from, to, type = 'expense' } = req.query;

  const data = await statsService.getCategoryBreakdown(userId, { from, to, type });
  return sendSuccess(res, data);
});

/**
 * GET /api/analytics/income-vs-expense
 * Returns [{ key, label, income, expense, net }]
 */
const getIncomeVsExpense = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { from, to, groupBy = 'month' } = req.query;

  const data = await statsService.getIncomeVsExpense(userId, { from, to, groupBy });
  return sendSuccess(res, data);
});

/**
 * GET /api/analytics/savings
 * Returns [{ month, label, income, expense, savings, savingsRate }]
 */
const getSavings = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const months = req.query.months ? parseInt(req.query.months, 10) : 12;

  const data = await statsService.getMonthlySavings(userId, months);
  return sendSuccess(res, data);
});

module.exports = {
  getTrend,
  getCategories,
  getIncomeVsExpense,
  getSavings,
};
