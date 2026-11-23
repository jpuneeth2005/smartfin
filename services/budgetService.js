'use strict';

const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { currentMonthKey, monthRange } = require('../utils/dateRange');

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/**
 * Get budgets with spent progress, remaining, status, alerts, and summary for a user and month.
 */
async function getBudgetsWithProgress(userId, monthKey) {
  const targetMonth = monthKey || currentMonthKey();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const { start, end } = monthRange(targetMonth);

  // 1. Fetch all user budgets for this month
  const budgets = await Budget.find({ user: userObjectId, month: targetMonth })
    .sort({ category: 1 })
    .lean();

  // 2. Single aggregation of expenses per category for the month (IST via monthRange)
  const expenseAgg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: 'expense',
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);

  const spentByCategory = {};
  let totalExpenses = 0;

  expenseAgg.forEach((item) => {
    spentByCategory[item._id] = item.totalSpent;
    totalExpenses += item.totalSpent;
  });

  const alerts = [];
  const summary = {
    total: budgets.length,
    ok: 0,
    warning: 0,
    exceeded: 0,
  };

  const budgetResults = budgets.map((b) => {
    const spent = b.category === 'Overall' ? totalExpenses : (spentByCategory[b.category] || 0);
    const limit = b.limit;
    const remaining = Number((limit - spent).toFixed(2));
    const percentUsed = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

    let status = 'ok';
    if (spent > limit) {
      status = 'exceeded';
    } else if (percentUsed >= b.alertThreshold && spent <= limit) {
      status = 'warning';
    }

    summary[status] = (summary[status] || 0) + 1;

    if (status === 'warning') {
      alerts.push({
        category: b.category,
        status: 'warning',
        message: `${b.category} budget is ${percentUsed}% used`,
      });
    } else if (status === 'exceeded') {
      const overAmount = spent - limit;
      alerts.push({
        category: b.category,
        status: 'exceeded',
        message: `${b.category} budget exceeded by ${currencyFormatter.format(overAmount)}`,
      });
    }

    return {
      _id: b._id,
      user: b.user,
      month: b.month,
      category: b.category,
      limit: b.limit,
      alertThreshold: b.alertThreshold,
      spent: Number(spent.toFixed(2)),
      remaining,
      percentUsed,
      status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  });

  return {
    month: targetMonth,
    budgets: budgetResults,
    alerts,
    summary,
  };
}

/**
 * Create a new budget
 */
async function createBudget(userId, data) {
  const { month, category, limit, alertThreshold } = data;
  const budget = new Budget({
    user: userId,
    month,
    category,
    limit,
    alertThreshold: alertThreshold !== undefined ? alertThreshold : 80,
  });
  return budget.save();
}

/**
 * Update budget limit and alertThreshold
 */
async function updateBudget(userId, id, data) {
  const { limit, alertThreshold } = data;
  const updateData = {};
  if (limit !== undefined) updateData.limit = limit;
  if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;

  const budget = await Budget.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true }
  );
  return budget;
}

/**
 * Delete a budget
 */
async function deleteBudget(userId, id) {
  return Budget.findOneAndDelete({ _id: id, user: userId });
}

module.exports = {
  getBudgetsWithProgress,
  createBudget,
  updateBudget,
  deleteBudget,
};
