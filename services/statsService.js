'use strict';

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const {
  getISTParts,
  monthRange,
  parseDateInput,
  endOfDayIST,
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Helper to compute ISO week key and label for a UTC Date
 */
function getISOWeekKeyAndLabel(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Nearest Thursday
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const weekNo = 1 + Math.ceil((firstThursday - target) / 604800000);
  const isoYear = new Date(firstThursday).getUTCFullYear();
  const weekStr = String(weekNo).padStart(2, '0');
  const key = `${isoYear}-W${weekStr}`;
  const label = `W${weekNo} ${isoYear}`;
  return { key, label };
}

/**
 * Generate all periods between fromStr and toStr for a given groupBy.
 * Guaranteed zero-fill chronological sequence.
 */
function generatePeriods(fromStr, toStr, groupBy = 'day') {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);

  if (groupBy === 'day') {
    let cur = new Date(Date.UTC(fy, fm - 1, fd));
    const end = new Date(Date.UTC(ty, tm - 1, td));
    const periods = [];
    while (cur <= end) {
      const y = cur.getUTCFullYear();
      const m = cur.getUTCMonth() + 1;
      const d = cur.getUTCDate();
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const label = `${String(d).padStart(2, '0')} ${MONTH_NAMES[m - 1]}`;
      periods.push({ key, label });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return periods;
  }

  if (groupBy === 'week') {
    let cur = new Date(Date.UTC(fy, fm - 1, fd));
    const end = new Date(Date.UTC(ty, tm - 1, td));
    const periods = [];
    const seen = new Set();
    while (cur <= end) {
      const { key, label } = getISOWeekKeyAndLabel(cur);
      if (!seen.has(key)) {
        seen.add(key);
        periods.push({ key, label });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return periods;
  }

  if (groupBy === 'month') {
    let curY = fy;
    let curM = fm;
    const periods = [];
    while (curY < ty || (curY === ty && curM <= tm)) {
      const key = `${curY}-${String(curM).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[curM - 1]} ${curY}`;
      periods.push({ key, label });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return periods;
  }

  if (groupBy === 'year') {
    const periods = [];
    for (let y = fy; y <= ty; y++) {
      periods.push({ key: String(y), label: String(y) });
    }
    return periods;
  }

  return [];
}

/**
 * Get spending or income trend points and summary
 */
async function getTrend(userId, { from, to, groupBy = 'day', type = 'expense' }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startDate = parseDateInput(from);
  const endDate = endOfDayIST(parseDateInput(to));

  let formatStr = '%Y-%m-%d';
  if (groupBy === 'week') formatStr = '%G-W%V';
  else if (groupBy === 'month') formatStr = '%Y-%m';
  else if (groupBy === 'year') formatStr = '%Y';

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: type,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: formatStr,
            date: '$date',
            timezone: 'Asia/Kolkata',
          },
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = {};
  agg.forEach((item) => {
    if (item._id) {
      map[item._id] = {
        total: Number(item.total.toFixed(2)),
        count: item.count,
      };
    }
  });

  const periods = generatePeriods(from, to, groupBy);
  let grandTotal = 0;
  let highest = 0;

  const points = periods.map((p) => {
    const data = map[p.key] || { total: 0, count: 0 };
    grandTotal += data.total;
    if (data.total > highest) highest = data.total;
    return {
      key: p.key,
      label: p.label,
      total: data.total,
      count: data.count,
    };
  });

  const countPoints = points.length;
  const average = countPoints > 0 ? Number((grandTotal / countPoints).toFixed(2)) : 0;

  return {
    points,
    summary: {
      total: Number(grandTotal.toFixed(2)),
      average,
      highest: Number(highest.toFixed(2)),
    },
  };
}

/**
 * Get category breakdown for date range
 */
async function getCategoryBreakdown(userId, { from, to, type = 'expense' }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startDate = parseDateInput(from);
  const endDate = endOfDayIST(parseDateInput(to));

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: type,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  let grandTotal = 0;
  agg.forEach((item) => {
    grandTotal += item.total;
  });

  const categories = agg.map((item) => {
    const total = Number(item.total.toFixed(2));
    const percent = grandTotal > 0 ? Number(((total / grandTotal) * 100).toFixed(1)) : 0;
    return {
      category: item._id,
      total,
      count: item.count,
      percent,
    };
  });

  return {
    categories,
    total: Number(grandTotal.toFixed(2)),
  };
}

/**
 * Get grouped income vs expense with net difference
 */
async function getIncomeVsExpense(userId, { from, to, groupBy = 'month' }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const startDate = parseDateInput(from);
  const endDate = endOfDayIST(parseDateInput(to));

  let formatStr = '%Y-%m-%d';
  if (groupBy === 'week') formatStr = '%G-W%V';
  else if (groupBy === 'month') formatStr = '%Y-%m';
  else if (groupBy === 'year') formatStr = '%Y';

  const agg = await Transaction.aggregate([
    {
      $match: {
        user: userObjectId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          period: {
            $dateToString: {
              format: formatStr,
              date: '$date',
              timezone: 'Asia/Kolkata',
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
    if (item._id && item._id.period) {
      if (item._id.type === 'income') {
        incomeMap[item._id.period] = item.total;
      } else if (item._id.type === 'expense') {
        expenseMap[item._id.period] = item.total;
      }
    }
  });

  const periods = generatePeriods(from, to, groupBy);

  return periods.map((p) => {
    const income = Number((incomeMap[p.key] || 0).toFixed(2));
    const expense = Number((expenseMap[p.key] || 0).toFixed(2));
    const net = Number((income - expense).toFixed(2));
    return {
      key: p.key,
      label: p.label,
      income,
      expense,
      net,
    };
  });
}

/**
 * Get monthly savings and savings rate (default last 12 months)
 */
async function getMonthlySavings(userId, monthsCount = 12) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const parts = getISTParts(now);

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
    const labelStr = `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
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
              timezone: 'Asia/Kolkata',
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

  return keys.map((monthKey, idx) => {
    const income = Number((incomeMap[monthKey] || 0).toFixed(2));
    const expense = Number((expenseMap[monthKey] || 0).toFixed(2));
    const savings = Number((income - expense).toFixed(2));
    let savingsRate = 0;
    if (income > 0) {
      savingsRate = Number(((savings / income) * 100).toFixed(1));
    } else if (savings < 0) {
      savingsRate = -100;
    }

    return {
      month: monthKey,
      label: labels[idx],
      income,
      expense,
      savings,
      savingsRate,
    };
  });
}

module.exports = {
  getLifetimeTotals,
  getTotalsForRange,
  getExpenseForRange,
  getRecentTransactions,
  getMonthlyIncomeVsExpense,
  getTrend,
  getCategoryBreakdown,
  getIncomeVsExpense,
  getMonthlySavings,
};
