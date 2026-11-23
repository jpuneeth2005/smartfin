'use strict';

const { csrfSync } = require('csrf-sync');

const {
  csrfSynchronisedProtection,
  generateToken,
  revokeToken,
} = csrfSync({
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  },
  getTokenFromState: (req) => {
    return req.session ? req.session.csrfToken : undefined;
  },
  storeTokenInState: (req, token) => {
    if (req.session) {
      req.session.csrfToken = token;
    }
  },
  size: 128,
  errorConfig: {
    statusCode: 403,
    message: 'Invalid CSRF token',
    code: 'EBADCSRFTOKEN',
  },
});

module.exports = {
  csrfProtection: csrfSynchronisedProtection,
  generateToken,
  revokeToken,
};
