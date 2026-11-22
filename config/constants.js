const ROLES = { USER: 'user', ADMIN: 'admin' };
const INCOME_CATEGORIES = ['Salary', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Transport', 'Education', 'Bills', 'Entertainment', 'Healthcare', 'Other'];
const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];
const BUDGET_CATEGORIES = [...EXPENSE_CATEGORIES, 'Overall'];
module.exports = { ROLES, INCOME_CATEGORIES, EXPENSE_CATEGORIES, ALL_CATEGORIES, BUDGET_CATEGORIES };
