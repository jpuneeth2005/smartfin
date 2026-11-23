require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

async function seedAdmin() {
  await connectDB();
  
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD env vars are required');
    process.exit(1);
  }
  
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    process.exit(0);
  }
  
  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: ROLES.ADMIN,
    isActive: true,
  });
  
  console.log(`Admin user created: ${admin.name} <${admin.email}>`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.name);
  process.exit(1);
});
