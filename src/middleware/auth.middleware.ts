import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';
import { TokenPayload } from '../types/express';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. Missing token.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. Invalid or expired token.');
  }
};

export const requireRole = (roles: Array<'contributor' | 'maintainer'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, StatusCodes.FORBIDDEN, 'Access denied. Insufficient permissions.');
    }

    next();
  };
};