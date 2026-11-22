
# SmartFin - Project Development Rules

## Project Overview
SmartFin is a Personal Finance Management Platform.

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap
- Tailwind CSS
- jQuery
- EJS templates

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB
- Mongoose

### Other Technologies
- Git and GitHub
- Authentication and Authorization
- MVC Architecture

## Architecture
Follow MVC architecture.

Keep separate folders for:
- Models
- Views
- Controllers
- Routes
- Middleware
- Configuration
- Utilities

Use reusable EJS layouts and partials.

## Security Rules
- Hash passwords using bcrypt.
- Use secure session authentication.
- Protect private routes.
- Validate all user inputs.
- Store secrets in environment variables.
- Never expose passwords or secrets.
- Never upload .env to GitHub.
- Users must only access their own financial data.

## Development Rules
- Write clean and modular code.
- Use meaningful variable and function names.
- Handle errors properly.
- Follow REST API conventions.
- Test each module before moving forward.
- Do not overwrite existing code without checking it.
- Keep the application responsive on mobile and desktop.

## Core Features
1. Authentication
2. Dashboard
3. Income and Expense Transactions
4. Budget Management
5. Financial Analytics

## Future Expansion
Keep the architecture extensible for:
- AI Financial Assistant
- Smart Expense Categorization
- Expense Prediction
- Financial Health Score
- Savings Goals
- Recurring Payments
