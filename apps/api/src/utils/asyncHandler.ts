import { Request, Response, NextFunction } from 'express';

/**
 * Async wrapper to eliminate try/catch boilerplate in every controller.
 * Wraps an async route handler and passes any error to Express error handler.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
