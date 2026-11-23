'use strict';

require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { currentMonthKey, getISTParts } = require('../utils/dateRange');

async function seedDemoData() {
  await connectDB();

  console.log('Seeding demo data...');

  // 1. Find or create demo user
  const email = 'demo@smartfin.local';
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: email,
      password: 'Demo@1234',
      role: 'user',
      isActive: true,
    });
    console.log(`Created demo user: ${user.name} (${user.email})`);
  } else {
    user.name = 'Demo User';
    user.password = 'Demo@1234';
    user.isActive = true;
    await user.save();
    console.log(`Found and updated demo user: ${user.name} (${user.email})`);
  }

  // 2. Delete old transactions and budgets for this user
  const deletedTx = await Transaction.deleteMany({ user: user._id });
  const deletedBudgets = await Budget.deleteMany({ user: user._id });
  console.log(`Cleared ${deletedTx.deletedCount} old transactions and ${deletedBudgets.deletedCount} old budgets`);

  // 3. Generate ~150 realistic transactions over last 12 months
  const now = new Date();
  const istNow = getISTParts(now);

  const transactions = [];

  const expenseTemplates = [
    // Food
    { category: 'Food', desc: 'Supermarket Groceries', min: 800, max: 2200 },
    { category: 'Food', desc: 'Swiggy Dinner Order', min: 250, max: 750 },
    { category: 'Food', desc: 'Zomato Lunch Order', min: 200, max: 550 },
    { category: 'Food', desc: 'Weekend Restaurant Dining', min: 1200, max: 3200 },
    { category: 'Food', desc: 'Cafe Coffee & Snacks', min: 150, max: 450 },

    // Transport
    { category: 'Transport', desc: 'Petrol Refuel', min: 500, max: 1500 },
    { category: 'Transport', desc: 'Metro Card Recharge', min: 200, max: 600 },
    { category: 'Transport', desc: 'Uber Ride to Office', min: 180, max: 480 },
    { category: 'Transport', desc: 'Auto Rickshaw Fare', min: 60, max: 180 },

    // Shopping
    { category: 'Shopping', desc: 'Amazon Household Essentials', min: 600, max: 2400 },
    { category: 'Shopping', desc: 'Clothing & Apparel Store', min: 1200, max: 4500 },
    { category: 'Shopping', desc: 'Electronics Accessories', min: 450, max: 1800 },

    // Education
    { category: 'Education', desc: 'Online Course Subscription', min: 600, max: 2200 },
    { category: 'Education', desc: 'Technical Books Purchase', min: 400, max: 1200 },

    // Bills
    { category: 'Bills', desc: 'Electricity Bill Payment', min: 900, max: 2800 },
    { category: 'Bills', desc: 'Broadband Internet Bill', min: 799, max: 1299 },
    { category: 'Bills', desc: 'Mobile Postpaid Recharge', min: 399, max: 799 },

    // Entertainment
    { category: 'Entertainment', desc: 'Movie Tickets & Popcorn', min: 350, max: 1100 },
    { category: 'Entertainment', desc: 'Netflix Subscription', min: 199, max: 649 },
    { category: 'Entertainment', desc: 'Weekend Outing & Games', min: 500, max: 1800 },

    // Healthcare
    { category: 'Healthcare', desc: 'Pharmacy Medicines', min: 250, max: 950 },
    { category: 'Healthcare', desc: 'Doctor Consultation Fee', min: 500, max: 1500 },

    // Other
    { category: 'Other', desc: 'Laundry & Dry Cleaning', min: 200, max: 650 },
    { category: 'Other', desc: 'Home Maintenance & Repairs', min: 350, max: 1500 },
  ];

  // Helper for random float in range
  function randomAmount(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  // Iterate over 12 months (11 months ago to current month 0)
  for (let mOffset = 11; mOffset >= 0; mOffset--) {
    let year = istNow.year;
    let month = istNow.month - mOffset;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const isCurrentMonth = mOffset === 0;
    const maxDay = isCurrentMonth ? Math.min(istNow.day, 22) : 28;

    // 1st of month: Salary 60,000
    const salaryDate = new Date(`${monthStr}-01T10:00:00.000+05:30`);
    transactions.push({
      user: user._id,
      type: 'income',
      amount: 60000,
      category: 'Salary',
      description: 'Monthly Salary',
      date: salaryDate,
    });

    // Occasional bonus or other income in certain months
    if (mOffset === 8 || mOffset === 4 || mOffset === 1) {
      const bonusDay = Math.min(15, maxDay);
      const bonusDate = new Date(`${monthStr}-${String(bonusDay).padStart(2, '0')}T14:30:00.000+05:30`);
      const bonusAmt = mOffset === 8 ? 8500 : mOffset === 4 ? 12000 : 5000;
      transactions.push({
        user: user._id,
        type: 'income',
        amount: bonusAmt,
        category: 'Other',
        description: mOffset === 4 ? 'Quarterly Performance Bonus' : 'Freelance Consulting Payment',
        date: bonusDate,
      });
    }

    // Pick 11-12 diverse expenses for this month
    // Ensure all 8 expense categories are represented across the cycle
    const selectedTemplates = [
      expenseTemplates[0], // Supermarket
      expenseTemplates[1], // Swiggy
      expenseTemplates[3], // Restaurant
      expenseTemplates[5], // Petrol
      expenseTemplates[6], // Metro
      expenseTemplates[9], // Amazon
      expenseTemplates[14], // Electricity
      expenseTemplates[15], // Broadband
      expenseTemplates[17], // Movie
      expenseTemplates[20], // Pharmacy
      expenseTemplates[22], // Laundry
    ];

    // Add 1 or 2 extra random items
    if (mOffset % 2 === 0) {
      selectedTemplates.push(expenseTemplates[10]); // Clothing
      selectedTemplates.push(expenseTemplates[12]); // Education
    } else {
      selectedTemplates.push(expenseTemplates[2]); // Zomato
      selectedTemplates.push(expenseTemplates[18]); // Netflix
    }

    selectedTemplates.forEach((tmpl, idx) => {
      // Distribute dates evenly across the month up to maxDay
      const day = Math.min(Math.max(2, Math.floor((idx + 1) * (maxDay / (selectedTemplates.length + 1)))), maxDay);
      const hour = 10 + (idx % 11);
      const min = (idx * 7) % 60;
      const txDate = new Date(`${monthStr}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000+05:30`);

      transactions.push({
        user: user._id,
        type: 'expense',
        amount: randomAmount(tmpl.min, tmpl.max),
        category: tmpl.category,
        description: tmpl.desc,
        date: txDate,
      });
    });
  }

  console.log(`Generated ${transactions.length} realistic transactions`);
  await Transaction.insertMany(transactions);

  // 4. Create current-month budgets
  // Overall 40000, Food 8000, Transport 3000, Shopping 6000, Entertainment 2500
  const curMonth = currentMonthKey();
  const budgets = [
    { user: user._id, month: curMonth, category: 'Overall', limit: 40000 },
    { user: user._id, month: curMonth, category: 'Food', limit: 8000 },
    { user: user._id, month: curMonth, category: 'Transport', limit: 3000 },
    { user: user._id, month: curMonth, category: 'Shopping', limit: 6000 },
    { user: user._id, month: curMonth, category: 'Entertainment', limit: 2500 },
  ];

  await Budget.insertMany(budgets);
  console.log(`Created ${budgets.length} budgets for ${curMonth}:`);
  budgets.forEach((b) => console.log(` - ${b.category}: ₹${b.limit}`));

  console.log('Demo data seed completed successfully!');
  process.exit(0);
}

seedDemoData().catch((err) => {
  console.error('Demo data seeding failed:', err);
  process.exit(1);
});
