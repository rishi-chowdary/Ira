import express from 'express';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';

import { AUTH_RATE_LIMIT, DEMO_OTP, OTP_TTL_MINUTES } from '../lib/constants.js';
import { ApiError, assert } from '../lib/errors.js';
import { sendEmail, sendWhatsappMessage } from '../lib/notifications.js';
import { mutateStore, nextId, sanitiseUser } from '../lib/store.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../lib/tokens.js';
import {
  hashPassword,
  isAllowedCollegeEmail,
  normaliseEmail,
  normalisePhone,
  verifyPassword,
} from '../lib/passwords.js';
import {
  generateBorrowingAccountId,
  generateLendingAccountId,
} from '../utils/idGenerator.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT.windowMs,
  max: AUTH_RATE_LIMIT.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many auth requests. Please try again later.' });
  },
});

const signupSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(120).required(),
  college_email: Joi.string().email().required(),
  whatsapp_number: Joi.string().trim().min(10).max(15).required(),
  upi_id: Joi.string().trim().min(3).max(100).required(),
  password: Joi.string().min(6).max(128).required(),
});

const verifyOtpSchema = Joi.object({
  session_id: Joi.string().required(),
  email_otp: Joi.string().length(6).required(),
  whatsapp_otp: Joi.string().length(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  session_id: Joi.string().required(),
  reset_token: Joi.string().required(),
  password: Joi.string().min(6).max(128).required(),
});

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
  });
}

async function issueUserSession(store, user, res) {
  const accessToken = createAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
    kind: 'user',
  });
  const refresh = createRefreshToken({
    id: user.id,
    role: user.role,
    email: user.email,
    kind: 'user',
  });
  store.refreshTokens.push({
    id: nextId(store, 'refreshTokens'),
    tokenId: refresh.tokenId,
    subjectType: 'user',
    subjectId: user.id,
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });
  setRefreshCookie(res, refresh.token);
  return accessToken;
}

async function sendDualOtp({ email, whatsapp, purpose, emailOtp, whatsappOtp }) {
  await sendEmail({
    to: email,
    subject: `IRA ${purpose} OTP`,
    text: `Use ${emailOtp} to continue your ${purpose.toLowerCase()} flow.`,
  });
  await sendWhatsappMessage({
    to: whatsapp,
    body: `IRA ${purpose} OTP: ${whatsappOtp}`,
  });
}

router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const payload = await signupSchema.validateAsync(req.body, { abortEarly: false });
    const email = normaliseEmail(payload.college_email);
    const whatsapp = normalisePhone(payload.whatsapp_number);

    assert(isAllowedCollegeEmail(email), 400, 'College email must use a valid .edu or .ac.in domain');

    const sessionId = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    await mutateStore(async (store) => {
      const existingUser = store.users.find(
        (user) => user.email === email || user.college_email === email,
      );
      assert(!existingUser, 409, 'A user with this email already exists');

      store.otpSessions = store.otpSessions.filter(
        (session) => !(session.type === 'signup' && session.email === email),
      );

      const emailOtp = DEMO_OTP;
      const whatsappOtp = DEMO_OTP;
      store.otpSessions.push({
        id: nextId(store, 'otpSessions'),
        sessionId,
        type: 'signup',
        email,
        whatsapp,
        emailOtp,
        whatsappOtp,
        payload,
        expiresAt,
        usedAt: null,
      });

      await sendDualOtp({
        email,
        whatsapp,
        purpose: 'Sign-up',
        emailOtp,
        whatsappOtp,
      });
    });

    res.status(201).json({
      sessionId,
      message: 'OTP sent to college email and WhatsApp',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-signup', authLimiter, async (req, res, next) => {
  try {
    const payload = await verifyOtpSchema.validateAsync(req.body, { abortEarly: false });

    const result = await mutateStore(async (store) => {
      const session = store.otpSessions.find(
        (entry) => entry.sessionId === payload.session_id && entry.type === 'signup',
      );
      assert(session, 404, 'OTP session not found');
      assert(!session.usedAt, 400, 'OTP session already used');
      assert(new Date(session.expiresAt).getTime() > Date.now(), 400, 'OTP session expired');
      assert(session.emailOtp === payload.email_otp, 400, 'Incorrect email OTP');
      assert(session.whatsappOtp === payload.whatsapp_otp, 400, 'Incorrect WhatsApp OTP');

      const approvedCollege = store.colleges.find(
        (college) =>
          session.email.endsWith(`@${college.studentEmailDomain}`) ||
          session.email.split('@')[1] === college.studentEmailDomain,
      );

      const userId = nextId(store, 'users');
      const createdAt = new Date().toISOString();
      const defaultProgram = approvedCollege
        ? store.collegePrograms.find((program) => program.collegeId === approvedCollege.id)
        : null;

      const newUser = {
        id: userId,
        email: session.email,
        password_hash: await hashPassword(session.payload.password),
        full_name: session.payload.full_name,
        whatsapp: normalisePhone(session.payload.whatsapp_number),
        upi_id: session.payload.upi_id,
        college_email: session.email,
        shri_score: 520,
        batua_locked: 0,
        batua_unlocked: 0,
        tijori: 0,
        role: 'both',
        kyc_status: 'pending',
        college_verified: false,
        wallet_activated: false,
        mode: 'borrower',
        can_borrow: false,
        can_lend: true,
        stateCode: approvedCollege?.stateCode || '58',
        districtCode: approvedCollege?.districtCode || '101',
        sectorCode: approvedCollege?.sectorCode || '450',
        universityCode: approvedCollege?.universityCode || '001',
        collegeCode: approvedCollege?.collegeCode || '001',
        course_code: defaultProgram?.courseCode || '01',
        course_name: defaultProgram?.courseName || 'B.Tech',
        branch_name: defaultProgram?.branches?.[0] || 'General',
        year: 1,
        enrollment_number: null,
        collegeId: approvedCollege?.id || null,
        lending_account_id: generateLendingAccountId(
          userId,
          approvedCollege?.stateCode || '58',
          approvedCollege?.districtCode || '101',
          approvedCollege?.sectorCode || '450',
        ),
        borrowing_account_id: generateBorrowingAccountId(
          userId,
          approvedCollege?.stateCode || '58',
          approvedCollege?.districtCode || '101',
          approvedCollege?.universityCode || '001',
          approvedCollege?.collegeCode || '001',
          defaultProgram?.courseCode || '01',
        ),
        mock_upi_balance: 250,
        student_status: approvedCollege ? 'pending_college' : 'pending_assignment',
        created_at: createdAt,
        updated_at: createdAt,
      };

      store.users.push(newUser);
      session.usedAt = createdAt;

      const accessToken = await issueUserSession(store, newUser, res);
      return {
        accessToken,
        user: sanitiseUser(newUser),
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const payload = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const email = normaliseEmail(payload.email);

    const result = await mutateStore(async (store) => {
      const user = store.users.find(
        (entry) => entry.email === email || entry.college_email === email,
      );
      assert(user, 401, 'Invalid email or password');
      const passwordMatches = await verifyPassword(payload.password, user.password_hash);
      assert(passwordMatches, 401, 'Invalid email or password');

      const accessToken = await issueUserSession(store, user, res);
      return {
        accessToken,
        user: sanitiseUser(user),
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    assert(refreshToken, 401, 'Refresh token missing');

    const payload = verifyRefreshToken(refreshToken);
    const result = await mutateStore(async (store) => {
      const session = store.refreshTokens.find((entry) => entry.tokenId === payload.jti);
      assert(session, 401, 'Refresh session not found');
      if (session.revokedAt) {
        store.refreshTokens.forEach((entry) => {
          if (entry.subjectType === session.subjectType && entry.subjectId === session.subjectId) {
            entry.revokedAt = entry.revokedAt || new Date().toISOString();
          }
        });
        throw new ApiError(401, 'Refresh token has already been used');
      }

      session.revokedAt = new Date().toISOString();
      const user = store.users.find((entry) => entry.id === Number(payload.sub));
      assert(user, 401, 'User not found');

      const accessToken = await issueUserSession(store, user, res);
      return { accessToken, user: sanitiseUser(user) };
    });

    res.json(result);
  } catch (error) {
    clearRefreshCookie(res);
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid refresh token'));
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      await mutateStore(async (store) => {
        const session = store.refreshTokens.find((entry) => entry.tokenId === payload.jti);
        if (session && !session.revokedAt) {
          session.revokedAt = new Date().toISOString();
        }
      });
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (error) {
    clearRefreshCookie(res);
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid refresh token'));
  }
});

router.post('/forgot-password/request', authLimiter, async (req, res, next) => {
  try {
    const payload = await forgotSchema.validateAsync(req.body, { abortEarly: false });
    const email = normaliseEmail(payload.email);

    const response = await mutateStore(async (store) => {
      const user = store.users.find(
        (entry) => entry.email === email || entry.college_email === email,
      );
      assert(user, 404, 'User not found');

      const sessionId = `forgot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const emailOtp = DEMO_OTP;
      const whatsappOtp = DEMO_OTP;
      store.otpSessions.push({
        id: nextId(store, 'otpSessions'),
        sessionId,
        type: 'forgot_password',
        email,
        whatsapp: user.whatsapp,
        emailOtp,
        whatsappOtp,
        userId: user.id,
        verifiedAt: null,
        resetToken: null,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
      });

      await sendDualOtp({
        email,
        whatsapp: user.whatsapp,
        purpose: 'Password reset',
        emailOtp,
        whatsappOtp,
      });

      return { sessionId };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password/verify', authLimiter, async (req, res, next) => {
  try {
    const payload = await verifyOtpSchema.validateAsync(req.body, { abortEarly: false });

    const response = await mutateStore(async (store) => {
      const session = store.otpSessions.find(
        (entry) => entry.sessionId === payload.session_id && entry.type === 'forgot_password',
      );
      assert(session, 404, 'OTP session not found');
      assert(new Date(session.expiresAt).getTime() > Date.now(), 400, 'OTP session expired');
      assert(session.emailOtp === payload.email_otp, 400, 'Incorrect email OTP');
      assert(session.whatsappOtp === payload.whatsapp_otp, 400, 'Incorrect WhatsApp OTP');

      session.verifiedAt = new Date().toISOString();
      session.resetToken = `reset_${Math.random().toString(36).slice(2, 10)}`;
      return {
        sessionId: session.sessionId,
        resetToken: session.resetToken,
      };
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const payload = await resetSchema.validateAsync(req.body, { abortEarly: false });

    await mutateStore(async (store) => {
      const session = store.otpSessions.find(
        (entry) => entry.sessionId === payload.session_id && entry.type === 'forgot_password',
      );
      assert(session, 404, 'Reset session not found');
      assert(session.resetToken === payload.reset_token, 400, 'Invalid reset token');
      assert(session.verifiedAt, 400, 'Verify OTPs before resetting password');

      const user = store.users.find((entry) => entry.id === session.userId);
      assert(user, 404, 'User not found');
      user.password_hash = await hashPassword(payload.password);
      user.updated_at = new Date().toISOString();

      session.usedAt = new Date().toISOString();
      store.refreshTokens.forEach((entry) => {
        if (entry.subjectType === 'user' && entry.subjectId === user.id) {
          entry.revokedAt = entry.revokedAt || new Date().toISOString();
        }
      });
    });

    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
