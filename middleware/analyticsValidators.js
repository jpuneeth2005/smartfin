'use strict';

const { query } = require('express-validator');
const { getISTParts } = require('../utils/dateRange');

function getDefaultDateRange() {
  const parts = getISTParts(new Date());
  const y = parts.year;
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${d}`,
  };
}

const analyticsDateValidator = [
  query('from')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('from must be in YYYY-MM-DD format'),

  query('to')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('to must be in YYYY-MM-DD format'),

  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('groupBy must be day, week, month, or year'),

  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('type must be income or expense'),

  query().custom((value, { req }) => {
    const defaults = getDefaultDateRange();
    const fromStr = req.query.from || defaults.from;
    const toStr = req.query.to || defaults.to;

    const fromDate = new Date(`${fromStr}T00:00:00.000+05:30`);
    const toDate = new Date(`${toStr}T00:00:00.000+05:30`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    if (fromDate.getTime() > toDate.getTime()) {
      throw new Error('from date must be less than or equal to to date');
    }

    const fiveYearsMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > fiveYearsMs) {
      throw new Error('Date range cannot exceed 5 years');
    }

    req.query.from = fromStr;
    req.query.to = toStr;
    return true;
  }),
];

const savingsQueryValidator = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('months must be an integer between 1 and 60')
    .toInt(),
];

module.exports = {
  getDefaultDateRange,
  analyticsDateValidator,
  savingsQueryValidator,
};
