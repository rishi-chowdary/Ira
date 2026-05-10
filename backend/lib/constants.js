export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const OTP_TTL_MINUTES = 10;
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
export const DEMO_OTP = process.env.DEMO_OTP || '123456';
export const COUNTRY_CODE = '91';
export const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 100,
};

export const ALLOWED_COLLEGE_EMAIL_SUFFIXES = ['.edu', '.edu.in', '.ac.in'];

export const SHRI_TIERS = [
  { min: 0, max: 399, name: 'Starter', multiplier: 1.15 },
  { min: 400, max: 599, name: 'Rising', multiplier: 1.0 },
  { min: 600, max: 749, name: 'Steady', multiplier: 0.92 },
  { min: 750, max: 899, name: 'Trusted', multiplier: 0.85 },
  { min: 900, max: 1000, name: 'Prime', multiplier: 0.8 },
];

export const BASE_INTEREST_SCHEDULE = [
  { maxDays: 7, rate: 3.2 },
  { maxDays: 15, rate: 4.4 },
  { maxDays: 30, rate: 6.2 },
  { maxDays: 60, rate: 7.8 },
  { maxDays: 90, rate: 9.5 },
];
