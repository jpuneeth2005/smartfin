'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');
const { recordAudit } = require('../utils/auditLogger');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/admin/stats
 * Counts only - admins cannot view user transactions/budgets
 */
const getStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsersLast7Days,
    totalTransactions,
    totalBudgets,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Transaction.countDocuments(),
    Budget.countDocuments(),
  ]);

  return sendSuccess(res, {
    totalUsers,
    activeUsers,
    newUsersLast7Days,
    totalTransactions,
    totalBudgets,
  });
});

/**
 * GET /api/admin/users?search=&page=
 * Paginated list of users, passwords excluded, regex escaped
 */
const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const { search } = req.query;

  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const total = await User.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return sendSuccess(res, {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

/**
 * PUT /api/admin/users/:id/status
 * Body: { isActive: boolean }
 * Admin cannot deactivate themselves (400)
 * Unknown id returns 404
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return sendError(res, 'isActive must be a boolean', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return sendError(res, 'User not found', 404);
  }

  // Admin cannot deactivate themselves
  const currentUserId = req.session && req.session.userId ? req.session.userId.toString() : '';
  if (id === currentUserId && isActive === false) {
    return sendError(res, 'An admin cannot deactivate themselves', 400);
  }

  const user = await User.findById(id).select('-password');
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  user.isActive = isActive;
  await user.save();
  recordAudit({
    actor: req.session.userId,
    action: isActive ? 'user.reactivated' : 'user.deactivated',
    targetType: 'user',
    targetId: user._id,
    metadata: { isActive },
  });

  return sendSuccess(
    res,
    user,
    `User ${isActive ? 'activated' : 'deactivated'} successfully`
  );
});

/**
 * GET /api/admin/audit-logs
 * Admin-only paginated audit log access.
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const filter = {};

  if (req.query.action) {
    filter.action = String(req.query.action).slice(0, 100);
  }

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return sendSuccess(res, {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
});

module.exports = {
  getStats,
  getUsers,
  updateUserStatus,
  getAuditLogs,
};
