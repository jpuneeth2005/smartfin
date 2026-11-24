'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { register, login } = require('../controllers/authController');

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

function createSession() {
  return {
    csrfToken: 'pre-auth-token',
    regenerate(callback) {
      callback();
    },
    save(callback) {
      callback();
    },
  };
}

function restoreAfter(testContext, originals) {
  testContext.after(() => {
    for (const [object, key, value] of originals) {
      object[key] = value;
    }
  });
}

test('registration regenerates the session and returns its fresh CSRF token', async (t) => {
  const originals = [
    [User, 'findOne', User.findOne],
    [User, 'create', User.create],
    [AuditLog, 'create', AuditLog.create],
  ];
  restoreAfter(t, originals);

  const user = {
    _id: 'registered-user',
    name: 'New User',
    email: 'new@example.com',
    role: 'user',
  };
  User.findOne = async () => null;
  User.create = async () => user;
  AuditLog.create = async () => ({});

  const req = {
    body: { name: user.name, email: user.email, password: 'password123' },
    session: createSession(),
  };
  const res = createResponse();

  await register(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.user._id, user._id);
  assert.equal(req.session.userId, user._id);
  assert.notEqual(req.session.csrfToken, 'pre-auth-token');
  assert.equal(res.body.data.csrfToken, req.session.csrfToken);
});

test('login regenerates the session and returns its fresh CSRF token', async (t) => {
  const originals = [
    [User, 'findOne', User.findOne],
    [User, 'updateOne', User.updateOne],
    [bcrypt, 'compare', bcrypt.compare],
    [AuditLog, 'create', AuditLog.create],
  ];
  restoreAfter(t, originals);

  const user = {
    _id: 'existing-user',
    name: 'Existing User',
    email: 'user@example.com',
    role: 'user',
    isActive: true,
    password: 'hashed-password',
  };
  User.findOne = () => ({ select: async () => user });
  User.updateOne = async () => ({ acknowledged: true });
  bcrypt.compare = async () => true;
  AuditLog.create = async () => ({});

  const req = {
    body: { email: user.email, password: 'password123' },
    session: createSession(),
  };
  const res = createResponse();

  await login(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.user._id, user._id);
  assert.equal(req.session.userId, user._id);
  assert.notEqual(req.session.csrfToken, 'pre-auth-token');
  assert.equal(res.body.data.csrfToken, req.session.csrfToken);
});
