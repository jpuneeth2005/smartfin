const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({ field: err.path, msg: err.msg }));
    return sendError(res, 'Validation failed', 400, errors);
  }
  next();
};

module.exports = validate;
