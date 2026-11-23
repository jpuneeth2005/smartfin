const express = require('express');
const router = express.Router();

const { ensureAuth, ensureGuest } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// GET / — redirect based on session
router.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

// GET /login — only for guests (not logged in)
router.get('/login', ensureGuest, (req, res) => {
  res.render('pages/login', {
    layout: 'layouts/auth',
    title: 'Login',
  });
});

// GET /register — only for guests
router.get('/register', ensureGuest, (req, res) => {
  res.render('pages/register', {
    layout: 'layouts/auth',
    title: 'Register',
  });
});

// GET /dashboard — requires authentication
router.get('/dashboard', ensureAuth, (req, res) => {
  res.render('pages/dashboard', {
    title: 'Dashboard',
    path: '/dashboard',
    scripts: ['/js/transactionModal.js', '/js/dashboard.js'],
  });
});

// GET /transactions — requires authentication
router.get('/transactions', ensureAuth, (req, res) => {
  res.render('pages/transactions', {
    title: 'Transactions',
    path: '/transactions',
    scripts: ['/js/transactionModal.js', '/js/transactions.js'],
  });
});

// GET /budgets — requires authentication
router.get('/budgets', ensureAuth, (req, res) => {
  res.render('pages/budgets', {
    title: 'Budgets',
    path: '/budgets',
    scripts: ['/js/transactionModal.js', '/js/budgets.js'],
  });
});

// GET /analytics — requires authentication
router.get('/analytics', ensureAuth, (req, res) => {
  res.render('pages/analytics', {
    title: 'Analytics',
    path: '/analytics',
    scripts: ['/js/analytics.js'],
  });
});

// GET /admin — admin only, others see 403 page
router.get('/admin', ensureAuth, authorize('admin'), (req, res) => {
  res.render('pages/admin', {
    title: 'Admin',
    path: '/admin',
    scripts: ['/js/admin.js'],
  });
});

module.exports = router;
