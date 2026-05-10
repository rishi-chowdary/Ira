import express from 'express';
import Joi from 'joi';

import { ApiError, assert } from '../lib/errors.js';
import { mutateStore, sanitiseCollege } from '../lib/store.js';
import { createAccessToken, createRefreshToken } from '../lib/tokens.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { sendEmail } from '../lib/notifications.js';

const router = express.Router();

const loginSchema = Joi.object({
  loginCode: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

const changePasswordSchema = Joi.object({
  loginCode: Joi.string().required(),
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
});

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/college-auth',
  });
}

router.post('/login', async (req, res, next) => {
  try {
    const payload = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const result = await mutateStore(async (store) => {
      const college = store.colleges.find((entry) => entry.loginCode === payload.loginCode);
      assert(college, 401, 'Invalid program ID or password');
      const passwordMatches = await verifyPassword(payload.password, college.passwordHash);
      assert(passwordMatches, 401, 'Invalid program ID or password');

      const accessToken = createAccessToken({
        id: college.id,
        role: 'college_admin',
        kind: 'college',
        email: college.contactEmail,
      });
      const refresh = createRefreshToken({
        id: college.id,
        role: 'college_admin',
        kind: 'college',
        email: college.contactEmail,
      });
      store.refreshTokens.push({
        id: store.meta.nextIds.refreshTokens++,
        tokenId: refresh.tokenId,
        subjectType: 'college',
        subjectId: college.id,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      });
      setRefreshCookie(res, refresh.token);

      return {
        accessToken,
        college: sanitiseCollege(college),
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const payload = await changePasswordSchema.validateAsync(req.body, { abortEarly: false });
    await mutateStore(async (store) => {
      const college = store.colleges.find((entry) => entry.loginCode === payload.loginCode);
      assert(college, 404, 'College account not found');
      const passwordMatches = await verifyPassword(payload.currentPassword, college.passwordHash);
      assert(passwordMatches, 401, 'Current password is incorrect');
      college.passwordHash = await hashPassword(payload.newPassword);
      college.updatedAt = new Date().toISOString();

      await sendEmail({
        to: college.contactEmail,
        subject: 'IRA college password updated',
        text: 'Your college dashboard password has been changed successfully.',
      });
    });

    res.json({ ok: true });
  } catch (error) {
    next(error instanceof ApiError ? error : error);
  }
});

export default router;
