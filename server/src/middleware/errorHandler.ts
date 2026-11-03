import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
    return;
  }

  // PostgreSQL constraint violations
  const pgErr = err as { code?: string; constraint?: string; detail?: string };
  if (pgErr.code === '23505') {
    res.status(409).json({
      success: false,
      error: 'A record with this value already exists',
      details: pgErr.detail,
    });
    return;
  }
  if (pgErr.code === '23503') {
    res.status(409).json({
      success: false,
      error: 'Referenced record does not exist',
      details: pgErr.detail,
    });
    return;
  }
  if (pgErr.code === '23514') {
    res.status(422).json({
      success: false,
      error: 'Data constraint violation',
      details: pgErr.detail,
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred',
  });
}
