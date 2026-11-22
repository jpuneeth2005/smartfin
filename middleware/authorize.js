/**
 * middleware/authorize.js
 *
 * Thin re-export so routes can import authorize from either
 * '../middleware/authorize' or '../middleware/auth' — both resolve
 * to the same implementation in auth.js.
 *
 * Do NOT add logic here; keep auth.js the single source of truth.
 */
const { authorize } = require('./auth');

module.exports = { authorize };
