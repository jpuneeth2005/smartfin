'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const User = require('../models/User');
const { csrfProtection } = require('../middleware/csrf');
const { updateUserStatus, getUsers } = require('../controllers/adminController');
const { ensureAuth } = require('../middleware/auth');
const { safeMetadata } = require('../utils/auditLogger');

function runCsrf(req) {
  return new Promise((resolve) => csrfProtection(req, {}, resolve));
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('CSRF protection rejects missing and incorrect tokens with 403', async () => {
  const missingError = await runCsrf({
    method: 'POST',
    headers: {},
    body: {},
    session: {},
  });
  assert.equal(missingError.status, 403);
  assert.equal(missingError.message, 'Invalid CSRF token');

  const incorrectError = await runCsrf({
    method: 'PUT',
    headers: { 'x-csrf-token': 'wrong' },
    body: {},
    session: { csrfToken: 'expected' },
  });
  assert.equal(incorrectError.status, 403);
  assert.equal(incorrectError.message, 'Invalid CSRF token');
});

test('admin cannot deactivate their own account', async () => {
  const adminId = new mongoose.Types.ObjectId();
  const req = {
    params: { id: adminId.toString() },
    body: { isActive: false },
    session: { userId: adminId },
  };
  const res = createResponse();

  await updateUserStatus(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'An admin cannot deactivate themselves');
});

test('admin status update returns 404 for an unknown account', async (t) => {
  const originalFindById = User.findById;
  t.after(() => {
    User.findById = originalFindById;
  });
  User.findById = () => ({ select: async () => null });

  const req = {
    params: { id: new mongoose.Types.ObjectId().toString() },
    body: { isActive: true },
    session: { userId: new mongoose.Types.ObjectId() },
  };
  const res = createResponse();

  await updateUserStatus(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'User not found');
});

test('admin user search escapes regex input and excludes passwords', async (t) => {
  const originalCountDocuments = User.countDocuments;
  const originalFind = User.find;
  t.after(() => {
    User.countDocuments = originalCountDocuments;
    User.find = originalFind;
  });

  let observedFilter;
  let selectedFields;
  User.countDocuments = async (filter) => {
    observedFilter = filter;
    return 0;
  };
  User.find = (filter) => {
    observedFilter = filter;
    return {
      select(fields) {
        selectedFields = fields;
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => [],
    };
  };

  const req = { query: { search: 'name+test', page: '2', limit: '10' } };
  const res = createResponse();
  await getUsers(req, res, (error) => {
    throw error;
  });

  assert.equal(observedFilter.$or[0].name.$regex, 'name\\+test');
  assert.equal(selectedFields, '-password');
  assert.equal(res.body.data.pagination.page, 2);
});

test('audit metadata removes passwords, tokens, cookies and session ids', () => {
  const safe = safeMetadata({
    password: 'secret',
    confirmPassword: 'secret',
    csrfToken: 'token',
    token: 'token',
    cookie: 'cookie',
    sessionId: 'session',
    amount: 125,
  });

  assert.deepEqual(safe, { amount: 125 });
});

test('deactivated users cannot continue through ensureAuth', async (t) => {
  const originalFindById = User.findById;
  t.after(() => {
    User.findById = originalFindById;
  });
  User.findById = async () => ({ isActive: false, role: 'user' });

  let destroyed = false;
  const req = {
    originalUrl: '/api/dashboard',
    session: {
      userId: new mongoose.Types.ObjectId(),
      destroy(callback) {
        destroyed = true;
        callback();
      },
    },
  };
  const res = createResponse();

  await ensureAuth(req, res, (error) => {
    if (error) throw error;
  });

  assert.equal(destroyed, true);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Account is inactive');
});
