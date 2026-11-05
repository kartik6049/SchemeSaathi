/**
 * Application error type.
 *
 * Throw `AppError` (or use the helpers) from routes/services; the central
 * error handler turns it into a consistent JSON response:
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details"?: ... } }
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const badRequest = (message: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
