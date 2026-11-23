'use strict';

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const {
  getISTParts,
  monthRange,
} = require('../utils/dateRange');

/**
 * Get lifetime total income, total expense, and balance (income - expense).
 * Balance is calculated dynamically and never stored.
 */
async function getLifetimeTotals(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const stats = await Transaction.aggregate([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let income = 0;
  let expense = 0;

  stats.forEach((item) => {
    if (item._id === 'income') income = item.total;
    if (item._id === 'expense') expense = item.total;
  });

  const balance = income - expense;
  return { income, expense, balance };
}

/**
 * Get total income, total expense, and savings for a specific date range.
 */
async function getTotalsForRange(userId, startDate, endDate) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const stats = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let income = 0;
  let expense = 0;

  stats.forEach((item) => {
    if (item._id === 'income') income = item.total;
    if (item._id === 'expense') expense = item.total;
  });

  return {
    income,
    expense,
    savings: income - expense,
  };
}

/**
 * Get total expense for a specific date range.
 */
async function getExpenseForRange(userId, startDate, endDate) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const stats = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return stats.length > 0 ? stats[0].total : 0;
}

/**
 * Get recent transactions for the user, sorted newest first.
 */
async function getRecentTransactions(userId, limit = 5) {
  return Transaction.find({ user: userId })
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get monthly income vs expense for the last N months (default 6),
 * zero-filled, and grouped in IST timezone.
 */
async function getMonthlyIncomeVsExpense(userId, monthsCount = 6) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const parts = getISTParts(now);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const keys = [];
  const labels = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    let targetYear = parts.year;
    let targetMonth = parts.month - i;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const labelStr = `${monthNames[targetMonth - 1]} ${targetYear}`;
    keys.push(monthStr);
    labels.push(labelStr);
  }

  const rangeStart = monthRange(keys[0]).start;
  const rangeEnd = monthRange(keys[keys.length - 1]).end;

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date',
              timezone: '+05:30',
            },
          },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const incomeMap = {};
  const expenseMap = {};

  agg.forEach((item) => {
    if (item._id && item._id.month) {
      if (item._id.type === 'income') {
        incomeMap[item._id.month] = item.total;
      } else if (item._id.type === 'expense') {
        expenseMap[item._id.month] = item.total;
      }
    }
  });

  const income = keys.map((k) => incomeMap[k] || 0);
  const expense = keys.map((k) => expenseMap[k] || 0);

  return {
    labels,
    keys,
    income,
    expense,
  };
}

module.exports = {
  getLifetimeTotals,
  getTotalsForRange,
  getExpenseForRange,
  getRecentTransactions,
  getMonthlyIncomeVsExpense,
};
