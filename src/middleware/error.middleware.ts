import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('💥 Centralized Interceptor Caught Error:', err.stack || err);

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'An unexpected operational malfunction occurred down-stream.';
  
  return sendError(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
};