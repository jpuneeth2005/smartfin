'use strict';

const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTransactionValidator,
  updateTransactionValidator,
  idParamValidator,
  listQueryValidator,
} = require('../middleware/transactionValidators');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

// All transaction routes require authentication
router.use(ensureAuth);

// POST /api/transactions
router.post('/', createTransactionValidator, validate, createTransaction);

// GET /api/transactions
router.get('/', listQueryValidator, validate, getTransactions);

// GET /api/transactions/:id
router.get('/:id', idParamValidator, validate, getTransactionById);

// PUT /api/transactions/:id
router.put('/:id', idParamValidator, updateTransactionValidator, validate, updateTransaction);

// DELETE /api/transactions/:id
router.delete('/:id', idParamValidator, validate, deleteTransaction);

module.exports = router;
