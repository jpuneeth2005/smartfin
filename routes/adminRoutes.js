const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/admin/ping — sanity-check for admin-only access
router.get('/ping', ensureAuth, authorize('admin'), (req, res) => {
  sendSuccess(res, { pong: true }, 'Admin ping');
});

module.exports = router;
