const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const User = require('../models/User');
const { ROLES } = require('../config/constants');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/csrf');
const { recordAudit } = require('../utils/auditLogger');

/**
 * POST /api/auth/register
 * Body already validated by express-validator middleware.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return sendError(res, 'Email already registered', 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: ROLES.USER,
  });

  await new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve()))
  );
  req.session.userId = user._id;
  const newCsrfToken = generateToken(req, true);
  await new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve()))
  );
  recordAudit({
    actor: user._id,
    actorEmail: user.email,
    action: 'user.registered',
    targetType: 'user',
    targetId: user._id,
  });

  return sendSuccess(
    res,
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrfToken: newCsrfToken,
    },
    'Registration successful',
    201
  );
});

/**
 * POST /api/auth/login
 * Body already validated by express-validator middleware.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return sendError(res, 'Invalid email or password', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return sendError(res, 'Invalid email or password', 401);
  }

  if (!user.isActive) {
    return sendError(res, 'Account is deactivated', 403);
  }

  await new Promise((resolve, reject) =>
    req.session.regenerate((err) => (err ? reject(err) : resolve()))
  );
  req.session.userId = user._id;
  const newCsrfToken = generateToken(req, true);
  await new Promise((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve()))
  );
  recordAudit({
    actor: user._id,
    actorEmail: user.email,
    action: 'user.login',
    targetType: 'session',
  });

  // Non-blocking last-login timestamp update
  User.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).catch(
    () => console.error('Failed to update lastLoginAt')
  );

  return sendSuccess(
    res,
    {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      csrfToken: newCsrfToken,
    },
    'Login successful'
  );
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const actor = req.session && req.session.userId ? req.session.userId : null;
  const actorEmail = req.user ? req.user.email : null;
  await new Promise((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve()))
  );
  recordAudit({
    actor,
    actorEmail,
    action: 'user.logout',
    targetType: 'session',
  });
  res.clearCookie('smartfin.sid');
  return sendSuccess(res, {}, 'Logged out successfully');
});

/**
 * GET /api/auth/me  (requires ensureAuth)
 */
const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user }, 'User retrieved');
});

module.exports = { register, login, logout, getMe };
