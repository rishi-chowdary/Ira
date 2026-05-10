import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from './constants.js';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'ira-dev-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'ira-dev-refresh-secret';

export function createAccessToken(subject) {
  return jwt.sign(
    {
      sub: subject.id,
      role: subject.role,
      kind: subject.kind,
      email: subject.email,
    },
    accessSecret,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export function createRefreshToken(subject) {
  const tokenId = uuidv4();
  return {
    tokenId,
    token: jwt.sign(
      {
        sub: subject.id,
        role: subject.role,
        kind: subject.kind,
        email: subject.email,
        jti: tokenId,
      },
      refreshSecret,
      { expiresIn: REFRESH_TOKEN_TTL },
    ),
  };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}
