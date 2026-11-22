const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

// Helper: detect API requests by original URL so sub-router stripping
// of the prefix does not fool the check (req.path inside /api/admin is
// just '/ping', not '/api/admin/ping').
const isApiRequest = (req) => req.originalUrl.startsWith('/api');

const ensureAuth = async (req, res, next) => {
  const userId = req.session && req.session.userId;

  if (!userId) {
    if (isApiRequest(req)) return sendError(res, 'Unauthorized', 401);
    return res.redirect('/login');
  }

  const user = await User.findById(userId);
  if (!user) {
    if (isApiRequest(req)) return sendError(res, 'Unauthorized', 401);
    return res.redirect('/login');
  }

  if (!user.isActive) {
    if (isApiRequest(req)) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }
    return res.redirect('/login?error=inactive');
  }

  req.user = user;
  next();
};

const ensureGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (isApiRequest(req)) return sendError(res, 'Forbidden', 403);
      return res.redirect('/dashboard');
    }
    next();
  };
};

module.exports = { ensureAuth, ensureGuest, authorize };
