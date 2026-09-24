
import {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { unauthorized, forbidden } from '../problem.js';

export function requireScope(...needed: string[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    const p = req.principal;
    if (!p) return unauthorized(res, req.url); // no valid token
    const ok = needed.every((s) => p.scopes.includes(s));
    if (!ok) return forbidden(res, req.url, needed); // valid token, missing permission
    return next();
  };
}
