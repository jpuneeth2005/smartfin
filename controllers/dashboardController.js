'use strict';

const statsService = require('../services/statsService');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { todayRange, monthRange } = require('../utils/dateRange');

/**
 * GET /api/dashboard
 */
const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  // Lifetime totals
  const lifetime = await statsService.getLifetimeTotals(userId);

  // Today's range in IST
  const today = todayRange();
  const todayExpense = await statsService.getExpenseForRange(userId, today.start, today.end);

  // Current month's range in IST
  const month = monthRange();
  const monthTotals = await statsService.getTotalsForRange(userId, month.start, month.end);

  // Recent 5 transactions
  const recentTransactions = await statsService.getRecentTransactions(userId, 5);

  // Monthly income vs expense for last 6 months
  const monthlyChart = await statsService.getMonthlyIncomeVsExpense(userId, 6);

  return sendSuccess(res, {
    balance: lifetime.balance,
    totalIncome: lifetime.income,
    totalExpense: lifetime.expense,
    monthSavings: monthTotals.savings, // this month income - expense
    todayExpense,
    monthExpense: monthTotals.expense,
    recentTransactions,
    monthlyChart,
  });
});

module.exports = {
  getDashboardData,
};
