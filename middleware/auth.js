const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

// Helper: detect API requests by original URL so sub-router stripping
// of the prefix does not fool the check (req.path inside /api/admin is
// just '/ping', not '/api/admin/ping').
const isApiRequest = (req) => req.originalUrl.startsWith('/api');

const ensureAuth = (req, res, next) => {
  const userId = req.session && req.session.userId;

  if (!userId) {
    if (isApiRequest(req)) return sendError(res, 'Unauthorized', 401);
    return res.redirect('/login');
  }

  User.findById(userId)
    .then((user) => {
      if (!user) {
        if (isApiRequest(req)) return sendError(res, 'Unauthorized', 401);
        return res.redirect('/login');
      }

      if (!user.isActive) {
        if (isApiRequest(req)) {
          req.session.destroy(() => {});
          return res.status(403).json({ success: false, message: 'Account is inactive' });
        }
        req.session.destroy(() => res.redirect('/login?error=inactive'));
        return;
      }

      req.user = user;
      return next();
    })
    .catch(next);
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
      const err = new Error('Forbidden - Access denied');
      err.status = 403;
      return next(err);
    }
    next();
  };
};

module.exports = { ensureAuth, ensureGuest, authorize };
