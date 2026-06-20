import { Request } from 'express';

export interface TokenPayload {
  id: number;
  name: string;
  role: 'contributor' | 'maintainer';
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}