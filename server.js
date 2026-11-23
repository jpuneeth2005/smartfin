'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const connectDB = require('./config/db');
const sessionMiddleware = require('./config/session');
const { csrfProtection, generateToken } = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const pageRoutes = require('./routes/pageRoutes');

if (process.env.NODE_ENV === 'production') {
  const required = ['MONGODB_URI', 'SESSION_SECRET'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error('Production startup rejected: required environment configuration is missing');
    process.exit(1);
  }
}

const app = express();

// Disable x-powered-by
app.disable('x-powered-by');

// Trust proxy only in production and only when explicitly configured.
if (process.env.NODE_ENV === 'production') {
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy === 'true') {
    app.set('trust proxy', 1);
  } else if (/^\d+$/.test(trustProxy || '')) {
    app.set('trust proxy', parseInt(trustProxy, 10));
  }
}

// Security: Helmet with CSP allowing required CDNs and data: images
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://code.jquery.com',
          'https://cdn.jsdelivr.net',
          'https://cdn.tailwindcss.com',
        ],
        styleSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          // Inline style attributes remain in existing EJS views.
          "'unsafe-inline'",
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdn.jsdelivr.net',
        ],
        imgSrc: [
          "'self'",
          'data:',
        ],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);

app.use(compression());
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Mongo sanitize
app.use(mongoSanitize());

// Session
app.use(sessionMiddleware);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Set currentUser and csrfToken for all views
app.use(async (req, res, next) => {
  if (req.session) {
    res.locals.csrfToken = generateToken(req);
  } else {
    res.locals.csrfToken = '';
  }

  if (req.session && req.session.userId) {
    try {
      const User = require('./models/User');
      const user = await User.findById(req.session.userId);
      res.locals.currentUser = user;
    } catch (error) {
      return next(error);
    }
  } else {
    res.locals.currentUser = null;
  }
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// General rate limiter for all /api endpoints (300 requests per 15 min)
app.use('/api', apiLimiter);

// CSRF synchronised protection on all mutating requests (POST, PUT, DELETE, PATCH)
app.use(csrfProtection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/', pageRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`SmartFin server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});

module.exports = app;
