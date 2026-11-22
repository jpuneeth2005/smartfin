const mongoose = require('mongoose');
const { ALL_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../config/constants');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      max: 10000000,
    },
    category: {
      type: String,
      required: true,
      enum: ALL_CATEGORIES,
      validate: {
        validator: function (v) {
          if (this.type === 'income') return INCOME_CATEGORIES.includes(v);
          if (this.type === 'expense') return EXPENSE_CATEGORIES.includes(v);
          return false;
        },
        message: (props) => `Category "${props.value}" is not valid for the given transaction type`,
      },
    },
    description: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'manual',
    },
    categorySource: {
      type: String,
      default: 'user',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, category: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
