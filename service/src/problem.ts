import { Response } from 'express';

export type ProblemType =
  | "validation-error"
  | "not-found"
  | "conflict"
  | "idempotency-key-reuse"
  | "internal-server-error";

const titles: Record<ProblemType, string> = {
  "validation-error": "Request validation failed",
  "not-found": "Resource not found",
  "conflict": "Order state conflict",
  "idempotency-key-reuse": "Idempotency-Key was reused with a different body",
  "internal-server-error": "Internal server error",
};

export function problem(
  status: number,
  type: ProblemType,
  detail: string,
  instance: string,
  extensions?: Record<string, unknown>,
) {
  return {
    ...extensions,
    type: `https://oceanlaundry.api/problems/${type}`,
    title: titles[type],
    status,
    detail,
    instance,
  };
}

// service/src/problem.js
export function unauthorized(res: Response, instance: string, error = 'invalid_token') {
 res.set('WWW-Authenticate', `Bearer error="${error}"`);
 return res.status(401).json(
    problem(
      401,
      "unauthenticated" as ProblemType,
      "Authentication is required or the access token is invalid.",
      instance,
    ),
  );
}
export function forbidden(res: Response, instance: string, needed: string[]) {
  res.set('WWW-Authenticate',
  `Bearer error="insufficient_scope", scope="${needed.join(' ')}"`);
  return res.status(403).json(
    problem(
      403,
      "insufficient-scope" as ProblemType,
      "The access token does not have the required scope.",
      instance,
    ),
  );
}
