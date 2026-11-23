'use strict';

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode;
  if (
    err.code === 'EBADCSRFTOKEN' ||
    err.message === 'Invalid CSRF token' ||
    err.message === 'invalid csrf token'
  ) {
    statusCode = 403;
  } else if (err.status || err.statusCode) {
    statusCode = err.status || err.statusCode;
  } else if (err.name === 'ValidationError' || err.name === 'CastError') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
  } else {
    statusCode = 500;
  }

  let message;
  if (
    err.code === 'EBADCSRFTOKEN' ||
    err.message === 'Invalid CSRF token' ||
    err.message === 'invalid csrf token'
  ) {
    message = 'Invalid CSRF token';
  } else if (err.code === 11000) {
    message = 'Duplicate value - resource already exists';
  } else if (err.name === 'CastError') {
    message = 'Invalid ID format';
  } else if (err.name === 'ValidationError') {
    message = err.message;
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  } else {
    message = err.message;
  }

  const isApi = (req.originalUrl || req.path || '').startsWith('/api');

  if (isApi) {
    const body = { success: false, message };
    if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
      body.stack = err.stack;
    }
    return res.status(statusCode).json(body);
  }

  if (statusCode === 404) {
    return res.status(404).render('pages/404', {
      layout: 'layouts/main',
      title: 'Page Not Found',
    });
  }

  return res.status(statusCode).render('pages/error', {
    layout: 'layouts/main',
    title: statusCode === 403 ? 'Access Denied' : 'Error',
    statusCode,
    message,
  });
};

module.exports = { notFound, errorHandler };
