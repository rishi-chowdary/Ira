import { createHash } from 'crypto';

import bcrypt from 'bcrypt';

import { ALLOWED_COLLEGE_EMAIL_SUFFIXES } from './constants.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function normaliseEmail(email = '') {
  return email.trim().toLowerCase();
}

export function normalisePhone(phone = '') {
  return phone.replace(/\D/g, '').slice(-10);
}

export function hashSensitiveValue(value = '') {
  return createHash('sha256').update(String(value).trim().toUpperCase()).digest('hex');
}

export function isAllowedCollegeEmail(email = '') {
  const normalised = normaliseEmail(email);
  return ALLOWED_COLLEGE_EMAIL_SUFFIXES.some((suffix) => normalised.endsWith(suffix));
}
