# IRA Platform - React Frontend

This is the React-based frontend for the IRA (Student P2P Lending) Platform.

## Project Structure

```
src/
├── pages/
│   ├── LandingPage.tsx          # Home page
│   ├── LoginPage.tsx             # User login
│   ├── SignUpPage.tsx            # User registration
│   ├── StudentDashboard.tsx      # Main dashboard
│   ├── ProfilePage.tsx           # User profile
│   ├── OnboardingPage.tsx        # Account setup
│   ├── RepaymentPage.tsx         # Loan repayments
│   ├── LoanDetailPage.tsx        # Loan details
│   ├── CollegePortal.tsx         # College admin portal
│   ├── CollegeRegistration.tsx   # College registration
│   └── AdminDashboard.tsx        # Admin dashboard
├── contexts/
│   └── AuthContext.tsx           # Authentication context
├── services/
│   └── api.ts                    # API client
├── types/
│   └── index.ts                  # TypeScript types
├── App.tsx                       # Main app component
├── App.css                       # App styles
├── main.tsx                      # Entry point
├── index.css                     # Global styles
└── vite-env.d.ts                 # Vite type definitions
```

## Installation

```bash
# Install dependencies
npm install

# For backend dependencies
npm run install-backend
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- **Student P2P Lending**: Request and provide loans to fellow students
- **Trust Score System**: Build your reputation through timely repayments
- **Daily Interest Accrual**: Only pay for days you hold a loan
- **Friend Network**: Connect with other students
- **Notifications**: Real-time updates on loan status and requests
- **College Portal**: Institutional management interface

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework

## API Integration

The frontend communicates with the Express backend at `http://localhost:5000` when running locally.

### Environment

- Rename `.env.example` to `.env` in the project root for frontend values.
- Copy `backend/.env.example` to `backend/.env` for backend runtime values.
- Backend env keys include `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `FROM_EMAIL`.

### Key Endpoints

- `GET /api/stats` - Platform statistics
- `GET /api/loans` - Get user loans
- `POST /api/loans` - Create new loan
- `GET /api/investments` - Get user investments
- `POST /api/investments` - Create investment
- `GET /api/users/:id` - Get user details

## Authentication

Authentication is handled through localStorage:

- `ira_user` - User session data
- `ira_profile` - User profile information

## Development Tips

1. Check browser console for API errors
2. Use React DevTools extension for component debugging
3. Tailwind IntelliSense VSCode extension for CSS classes
4. Built-in ESLint configuration for code quality

## License

© 2024 IRA Platform
