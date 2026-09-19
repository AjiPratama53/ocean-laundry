import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './verify.js';
import { principalFrom, Principal } from './principal.js';
import { unauthorized } from '../problem.js';

declare global {
  namespace Express {
    interface Request {
      principal: Principal | null;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    req.principal = null; // anonymous; the routes decide whether that is allowed
    return next();
  }
  try {
    req.principal = principalFrom(await verifyAccessToken(header.slice(7)));
    return next();
  } catch (err: any) {
    // the reason for refusal is logged; the token never is
    console.warn("Invalid token");
    return unauthorized(res, 'invalid_token');
  }
}