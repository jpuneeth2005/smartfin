'use strict';

const Transaction = require('../models/Transaction');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateInput, endOfDayIST } = require('../utils/dateRange');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * POST /api/transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  const txData = {
    user: userId,
    type: req.body.type,
    amount: req.body.amount,
    category: req.body.category,
    description: req.body.description ? req.body.description.trim() : '',
    date: req.body.date ? parseDateInput(req.body.date) : new Date(),
  };

  const transaction = await Transaction.create(txData);
  return sendSuccess(res, transaction, 'Transaction created successfully', 201);
});

/**
 * GET /api/transactions
 */
const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const filter = { user: userId };

  const { search, type, category, from, to } = req.query;

  // Search filter on description and category
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { description: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Type filter
  if (type && ['income', 'expense'].includes(type)) {
    filter.type = type;
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Date range filter (inclusive of the whole 'to' day in IST)
  if (from || to) {
    filter.date = {};
    if (from) {
      filter.date.$gte = parseDateInput(from);
    }
    if (to) {
      filter.date.$lte = endOfDayIST(parseDateInput(to));
    }
  }

  // Sort whitelist
  const allowedSortBy = ['date', 'amount'];
  const sortBy = allowedSortBy.includes(req.query.sortBy) ? req.query.sortBy : 'date';
  const order = req.query.order === 'asc' ? 1 : -1;
  const sortObj = { [sortBy]: order };
  if (sortBy === 'date') {
    sortObj._id = -1; // tie breaker
  }

  // Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await Transaction.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  const transactions = await Transaction.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .lean();

  return sendSuccess(res, {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

/**
 * GET /api/transactions/:id
 */
const getTransactionById = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: userId,
  }).lean();

  if (!transaction) {
    return sendError(res, 'Transaction not found', 404);
  }

  return sendSuccess(res, transaction);
});

/**
 * PUT /api/transactions/:id
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: userId,
  });

  if (!transaction) {
    return sendError(res, 'Transaction not found', 404);
  }

  // Assign fields; ignore any user field
  const { type, amount, category, description, date } = req.body;
  if (type !== undefined) transaction.type = type;
  if (amount !== undefined) transaction.amount = amount;
  if (category !== undefined) transaction.category = category;
  if (description !== undefined) transaction.description = description.trim();
  if (date !== undefined) {
    transaction.date = date ? parseDateInput(date) : transaction.date;
  }

  // Save to trigger Mongoose schema validation
  await transaction.save();

  return sendSuccess(res, transaction, 'Transaction updated successfully');
});

/**
 * DELETE /api/transactions/:id
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    user: userId,
  });

  if (!transaction) {
    return sendError(res, 'Transaction not found', 404);
  }

  return sendSuccess(res, null, 'Transaction deleted successfully');
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
