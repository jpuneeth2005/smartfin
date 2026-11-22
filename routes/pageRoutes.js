const express = require('express');
const router = express.Router();

const { ensureAuth, ensureGuest } = require('../middleware/auth');

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
  });
});

module.exports = router;
