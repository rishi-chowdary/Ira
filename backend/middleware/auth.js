import { ApiError } from '../lib/errors.js';
import { readStore, sanitiseCollege, sanitiseUser } from '../lib/store.js';
import { verifyAccessToken } from '../lib/tokens.js';

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required');
  }

  return header.slice('Bearer '.length);
}

export async function authenticate(req, _res, next) {
  try {
    const token = getTokenFromRequest(req);
    const payload = verifyAccessToken(token);
    const store = await readStore();

    if (payload.kind === 'college') {
      const college = store.colleges.find((entry) => entry.id === Number(payload.sub));
      if (!college) {
        throw new ApiError(401, 'College account not found');
      }
      req.auth = {
        ...payload,
        college: sanitiseCollege(college),
      };
      next();
      return;
    }

    const user = store.users.find((entry) => entry.id === Number(payload.sub));
    if (!user) {
      throw new ApiError(401, 'User account not found');
    }

    req.auth = {
      ...payload,
      user: sanitiseUser(user),
    };
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token'));
  }
}

export function requireUser(req, _res, next) {
  if (!req.auth?.user) {
    next(new ApiError(403, 'User access required'));
    return;
  }

  next();
}

export function requireCollege(req, _res, next) {
  if (!req.auth?.college) {
    next(new ApiError(403, 'College access required'));
    return;
  }

  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth?.user || !roles.includes(req.auth.user.role)) {
      next(new ApiError(403, 'You do not have permission for this action'));
      return;
    }

    next();
  };
}
