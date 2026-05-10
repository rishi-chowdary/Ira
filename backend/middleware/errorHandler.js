import { ApiError } from '../lib/errors.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Endpoint not found' });
}

export function errorHandler(error, _req, res, _next) {
  const status = error instanceof ApiError ? error.status : 500;
  if (!(error instanceof ApiError)) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || 'Internal server error',
  });
}
