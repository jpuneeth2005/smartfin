'use strict';

const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const { getDashboardData } = require('../controllers/dashboardController');

// GET /api/dashboard
router.get('/', ensureAuth, getDashboardData);

module.exports = router;
