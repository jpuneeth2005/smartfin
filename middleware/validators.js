'use strict';

const validate = require('./validate');
const transactionValidators = require('./transactionValidators');
const budgetValidators = require('./budgetValidators');
const analyticsValidators = require('./analyticsValidators');

module.exports = {
  validate,
  ...transactionValidators,
  ...budgetValidators,
  ...analyticsValidators,
};
