const mongoose = require('mongoose');
const { BUDGET_CATEGORIES } = require('../config/constants');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
        message: (props) => `${props.value} is not a valid month format (expected YYYY-MM)`,
      },
    },
    category: {
      type: String,
      required: true,
      enum: BUDGET_CATEGORIES,
    },
    limit: {
      type: Number,
      required: true,
      min: [0.01, 'Limit must be greater than 0'],
    },
    alertThreshold: {
      type: Number,
      default: 80,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
