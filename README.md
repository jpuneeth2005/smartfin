# SmartFin

A full-stack, secure Personal Finance Management Platform built with Node.js, Express, MongoDB, and modern MVC architecture.

---

## Features by Module

### 1. Authentication & Session Management
- **Secure Registration & Login**: User registration with input validation, strong password requirements, and bcrypt hashing (salt rounds: 12).
- **Session-Based Authentication**: Managed with `express-session` and `connect-mongo` for persistent sessions. Session regeneration on login, registration, and logout prevents session fixation.
- **Role-Based Access Control (RBAC)**: Distinct access tiers for `user` and `admin`. Admin routes and console pages are strictly guarded; unauthorized access returns 403 Forbidden.
- **Account Status Enforcement**: Deactivated accounts are prohibited from logging in or making API requests.

### 2. Dashboard
- **Financial Summary Cards**: Real-time cards displaying lifetime Net Balance, Total Income, Total Expense, and Current Month Savings.
- **Today's & Monthly Spend**: Immediate insight into today's expenditure and current monthly progress.
- **Recent Activity**: The 5 latest transactions displayed with categorization badges and amounts.
- **Interactive Visual Trend**: 6-month monthly income vs. expense chart rendered using Chart.js.
- **Proactive Budget Alerts**: Real-time warning and exceeded notification banners for category spending.

### 3. Transactions
- **Full CRUD Support**: Create, view, update, and delete income and expense transactions.
- **Category Validation**: Strict schema checks ensuring income categories (Salary, Freelance, Investment, Gift, Other) and expense categories (Food, Shopping, Transport, Education, Bills, Entertainment, Healthcare, Other) align with transaction types.
- **Live Filtering & Debounced Search**: 400ms debounced search on descriptions and categories, filterable by type, category, and date range in Indian Standard Time (IST).
- **Pagination & Sorting**: Paginated table view with server-side sorting by date and amount.
- **Modal Confirmation**: Modal-driven deletion safeguards against accidental record removal.

### 4. Budgets
- **Monthly Category Limits**: Set spending thresholds for individual expense categories or across all categories combined ("Overall").
- **Visual Progress Tracking**: Color-coded progress bars (green on track, amber warning threshold, red exceeded limit).
- **Configurable Alert Thresholds**: Customizable percentage alerts (default: 80%) with dual slider and numeric input synchronization.
- **Month-by-Month Navigation**: Effortlessly review historical budget performances and plan upcoming months.

### 5. Financial Analytics
- **Spending & Income Trends**: Dynamic line chart displaying financial velocity grouped by day, week, month, or year.
- **Category Breakdown**: Doughnut chart showing expense distribution and percentages across categories.
- **Grouped Comparison**: Bar chart directly comparing income versus expense over chosen ranges.
- **Monthly Savings & Savings Rate**: Complete 12-month savings history and percentage savings rate calculation.

### 6. Admin Console
- **System Metrics (Counts Only)**: High-level overview of total registered users, active users, new users in the last 7 days, and total system records (transactions and budgets count).
- **Privacy Protection**: Admins cannot inspect, browse, or read other users' private financial transactions or budgets.
- **User Directory**: Searchable, paginated user management table with role badges, active/inactive badges, and last login timestamps.
- **Account Status Toggles**: Admin ability to activate or deactivate accounts with confirmation modals; admins cannot deactivate their own accounts.

---

## Tech Stack

### Frontend
- **Templating**: EJS (Embedded JavaScript) with `express-ejs-layouts`
- **UI Frameworks**: Bootstrap 5.3.3, Tailwind CSS (Play CDN with custom config)
- **Icons & Typography**: Bootstrap Icons 1.11.3, Inter font (Google Fonts)
- **Client Scripting**: jQuery 3.7.1, vanilla JavaScript (ES6+)
- **Data Visualization**: Chart.js 4.4.3

### Backend
- **Runtime & Framework**: Node.js (>= 18), Express.js 4
- **Database & ODM**: MongoDB, Mongoose 8
- **Session Store**: `express-session`, `connect-mongo`

### Security
- **Data Hashing**: `bcrypt` (12 rounds)
- **CSRF Protection**: `csrf-sync` (session-synchronized tokens)
- **HTTP Headers & CSP**: `helmet` 8 with tailored Content Security Policy
- **Rate Limiting**: `express-rate-limit` (general API and specialized auth limiters)
- **Data Sanitization**: `express-mongo-sanitize`, `express-validator`

---

## MVC Architecture and Folder Structure

SmartFin adheres to the Model-View-Controller (MVC) architectural pattern:

```
smartfin/
├── config/                 # Application configuration
│   ├── constants.js        # Category enums and role constants
│   ├── db.js               # MongoDB Mongoose connection
│   └── session.js          # express-session and connect-mongo setup
├── controllers/            # Controller layer (request handling & response)
│   ├── adminController.js
│   ├── analyticsController.js
│   ├── authController.js
│   ├── budgetController.js
│   ├── dashboardController.js
│   └── transactionController.js
├── middleware/             # Express middlewares
│   ├── analyticsValidators.js
│   ├── auth.js             # ensureAuth, ensureGuest, authorize
│   ├── authorize.js        # authorize re-export
│   ├── budgetValidators.js
│   ├── csrf.js             # csrf-sync protection & token generation
│   ├── errorHandler.js     # Global 404 & centralized error handler
│   ├── security.js         # Express rate limiters (auth & API)
│   ├── transactionValidators.js
│   ├── validate.js         # express-validator result handler
│   └── validators.js       # Validator aggregator
├── models/                 # Mongoose schemas & data models
│   ├── Budget.js
│   ├── Transaction.js
│   └── User.js
├── public/                 # Static assets
│   ├── css/
│   │   └── main.css        # Core custom styles, variables, responsive rules
│   └── js/
│       ├── admin.js        # Admin console client script
│       ├── analytics.js    # Chart.js rendering & controls
│       ├── auth.js         # Login/register AJAX & client validation
│       ├── budgets.js      # Budget management client script
│       ├── common.js       # SmartFin global utilities & CSRF ajaxSetup
│       ├── dashboard.js    # Dashboard stats & chart loader
│       ├── transactionModal.js # Reusable transaction modal
│       └── transactions.js # Transactions table client script
├── routes/                 # Express route definitions
│   ├── adminRoutes.js      # /api/admin/*
│   ├── analyticsRoutes.js  # /api/analytics/*
│   ├── authRoutes.js       # /api/auth/*
│   ├── budgetRoutes.js     # /api/budgets/*
│   ├── dashboardRoutes.js  # /api/dashboard/*
│   ├── pageRoutes.js       # HTML view routes (/, /dashboard, etc.)
│   └── transactionRoutes.js# /api/transactions/*
├── scripts/                # Utility & database seeding scripts
│   ├── seedAdmin.js        # Seed initial admin user
│   └── seedDemoData.js     # Seed demo user with realistic data
├── services/               # Business logic & complex MongoDB aggregations
│   ├── budgetService.js    # Budget progress calculation & threshold alerts
│   └── statsService.js     # Timezone-aware aggregations (IST)
├── utils/                  # Reusable utility helpers
│   ├── apiResponse.js      # Standardized JSON response helpers
│   ├── asyncHandler.js     # Async wrapper catching controller errors
│   └── dateRange.js        # IST timezone date calculation utilities
├── views/                  # EJS templates
│   ├── layouts/
│   │   ├── auth.ejs        # Centered auth layout
│   │   └── main.ejs        # Dashboard & inner pages layout with sidebar
│   ├── pages/
│   │   ├── 404.ejs
│   │   ├── admin.ejs
│   │   ├── analytics.ejs
│   │   ├── budgets.ejs
│   │   ├── dashboard.ejs
│   │   ├── error.ejs
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   └── transactions.ejs
│   └── partials/
│       ├── budgetModal.ejs
│       ├── head.ejs
│       └── transactionModal.ejs
├── docs/
│   └── screenshots/        # Application screenshot assets
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json
└── server.js               # Application entry point
```

---

## Setup Steps

### Prerequisites
- Node.js >= 18.0.0
- MongoDB instance (Local or MongoDB Atlas URI)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd smartfin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your MongoDB connection URI and secrets.

4. **Seed the initial admin account:**
   ```bash
   npm run seed:admin
   ```

5. **(Optional) Seed realistic demo data:**
   ```bash
   npm run seed:demo
   ```

6. **Start the application:**
   - Development mode with nodemon:
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

7. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable Name | Description | Example / Notes |
|---|---|---|
| `PORT` | Web server port | `3000` |
| `NODE_ENV` | Application environment | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/smartfin` |
| `SESSION_SECRET` | Secret key for signing session cookies | Secure random string |
| `ADMIN_NAME` | Default admin display name for seed script | `SmartFin Admin` |
| `ADMIN_EMAIL` | Default admin email for seed script | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin password for seed script | Strong password |

---

## REST API Reference

All `/api/*` endpoints return a consistent JSON response:
- Success: `{ "success": true, "data": ..., "message": "..." }`
- Error: `{ "success": false, "message": "...", "errors": [...] }`

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Public | Register new account (name, email, password, confirmPassword) |
| `POST` | `/api/auth/login` | No | Public | Authenticate user & initialize session |
| `POST` | `/api/auth/logout` | No | Public | Terminate session & clear cookies |
| `GET` | `/api/auth/me` | Yes | Any | Return profile information of logged-in user |

### Transaction Endpoints (`/api/transactions`)
| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/transactions` | Yes | User | Create a new transaction (income / expense) |
| `GET` | `/api/transactions` | Yes | User | List transactions with search, filters, sorting, and pagination |
| `GET` | `/api/transactions/:id`| Yes | User | Fetch a single transaction by ID |
| `PUT` | `/api/transactions/:id`| Yes | User | Update an existing transaction |
| `DELETE`| `/api/transactions/:id`| Yes | User | Delete a transaction |

### Budget Endpoints (`/api/budgets`)
| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/budgets` | Yes | User | Create a monthly category budget |
| `GET` | `/api/budgets` | Yes | User | List budgets for month with spending progress and threshold alerts |
| `PUT` | `/api/budgets/:id` | Yes | User | Update budget limit and/or alert threshold |
| `DELETE`| `/api/budgets/:id` | Yes | User | Delete a budget record |

### Dashboard & Analytics Endpoints (`/api/dashboard`, `/api/analytics`)
| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/dashboard` | Yes | User | Summary stats, today/month totals, recent txns, 6-mo chart |
| `GET` | `/api/analytics/trend` | Yes | User | Spending or income trend points over custom date range |
| `GET` | `/api/analytics/categories` | Yes | User | Category breakdown totals and percentages |
| `GET` | `/api/analytics/income-vs-expense`| Yes| User | Grouped income vs expense comparison |
| `GET` | `/api/analytics/savings`| Yes | User | Monthly savings amounts and savings rates |

### Admin Endpoints (`/api/admin`)
| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/stats` | Yes | Admin | System counts: total users, active users, 7-day new users, txns, budgets |
| `GET` | `/api/admin/users` | Yes | Admin | Searchable, paginated user list (passwords excluded) |
| `PUT` | `/api/admin/users/:id/status` | Yes | Admin | Update user active status (cannot deactivate self) |

---

## Security Measures Actually Implemented

1. **Session-Synchronized CSRF Protection**:
   - Implemented via `csrf-sync` with tokens stored in session state.
   - Enforced on all mutating HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`), including login and registration.
   - Tokens injected via `<meta name="csrf-token">` and transmitted in the `x-csrf-token` header by jQuery's `$.ajaxSetup`.
   - Fresh tokens generated upon session regeneration. Invalid or missing tokens trigger HTTP 403 `Invalid CSRF token`.

2. **Content Security Policy (CSP) & Security Headers**:
   - Configured via `helmet` allowing `'self'`, trusted CDNs (`cdn.jsdelivr.net`, `cdn.tailwindcss.com`, `code.jquery.com`, `fonts.googleapis.com`, `fonts.gstatic.com`), and `data:` URIs for images.
   - `unsafe-inline` strictly retained for scripts and styles to support Tailwind CSS Play CDN runtime stylesheet compilation.
   - `x-powered-by` header disabled to mitigate server fingerprinting.

3. **Multi-Tier Rate Limiting**:
   - Global rate limiter on `/api/*` restricting requests to 300 per 15 minutes.
   - Strict brute-force protection limiter on authentication endpoints (`/api/auth/login`, `/api/auth/register`) restricting requests to 10 per 15 minutes.

4. **Strict User Scoping & Isolation**:
   - Financial data (transactions, budgets, analytics, dashboards) is strictly scoped to `req.session.userId`. Users can never query or manipulate other users' data.
   - Admins can view system-wide counts only and cannot read any user's personal financial records.

5. **Password Protection**:
   - Passwords hashed with `bcrypt` (work factor: 12).
   - Password field marked with `{ select: false }` in Mongoose to prevent accidental exposure in queries.

6. **Input Validation & Injection Prevention**:
   - Request bodies, parameters, and query strings validated with `express-validator`.
   - `express-mongo-sanitize` scrubs prohibited operators (`$` and `.`) from user inputs to prevent NoSQL injection.
   - User search queries escaped against regex injection vulnerabilities.

7. **Production Error Shielding**:
   - Stack traces hidden in production mode (`NODE_ENV === 'production'`).
   - Internal 500 error messages sanitized to generic text.

8. **Repository Hygiene**:
   - Sensitive files (`.env`, logs) included in `.gitignore` and verified uncommitted to version control.

---

## Screenshots

Place application screenshots in `docs/screenshots/`:

| Dashboard | Transactions |
|---|---|
| ![Dashboard Overview](docs/screenshots/dashboard.png) | ![Transactions Manager](docs/screenshots/transactions.png) |

| Budgets | Analytics |
|---|---|
| ![Budgets Tracking](docs/screenshots/budgets.png) | ![Financial Analytics](docs/screenshots/analytics.png) |

| Admin Console |
|---|
| ![Admin Console](docs/screenshots/admin.png) |

---

## Roadmap

- [ ] **AI Financial Assistant**: Natural language conversational assistant for financial advice and transaction inquiries.
- [ ] **Smart Expense Categorization**: Machine learning auto-categorization based on transaction descriptions.
- [ ] **Expense Prediction**: Predictive forecasting for future spending based on seasonal historical trends.
- [ ] **Financial Health Score**: Algorithmic financial score based on savings rate, debt-to-income, and budget adherence.
- [ ] **Recurring Payments**: Automated tracking and reminders for monthly subscriptions and utilities.
- [ ] **Savings Goals**: Goal-oriented savings tracking with target dates and milestone progress.
- [ ] **Advanced Reports**: Exportable PDF and CSV financial statements.

---

## How to Extend

The codebase is built following modular MVC design patterns, making extension straightforward:

1. **Adding a New Module**:
   - Create a model in `models/` (e.g., `models/Goal.js`).
   - Create service helpers in `services/` (e.g., `services/goalService.js`) to encapsulate queries and business logic.
   - Create a controller in `controllers/` using `asyncHandler` and `sendSuccess`/`sendError` helpers.
   - Add validation rules in `middleware/` using `express-validator`.
   - Mount routes in `routes/` and register them in `server.js`.
   - Add views in `views/pages/` and client logic in `public/js/`.

2. **Transaction Extensibility**:
   - `Transaction.source`: Ready for automated ingest (e.g., `'manual'`, `'csv'`, `'bank_sync'`).
   - `Transaction.categorySource`: Differentiates manual categorization from automated ML categorization (`'user'` vs `'ai'`).

3. **Reusing Stats & Timezone Logic**:
   - Reuse `services/statsService.js` for date aggregation pipelines.
   - Use `utils/dateRange.js` to ensure consistent Indian Standard Time (IST / Asia/Kolkata) boundaries across all queries.
