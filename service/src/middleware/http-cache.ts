import type { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { sendProblem } from "../problem.js";

/**
 * Explicit CORS allowlist (A.4.4). Never reflect Origin back: only origins
 * in CORS_ALLOWED_ORIGINS (comma-separated) get ACAO. Vary: Origin keeps
 * caches from serving one origin's grant to another.
 */
const ALLOWED = (process.env.CORS_ALLOWED_ORIGINS ??
  "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Credentials", "true");
    res.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Idempotency-Key, If-Match, If-None-Match",
    );
    res.set("Access-Control-Expose-Headers", "ETag, Location");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
}

/** Opaque version marker for a representation (A.7.1). */
export function etagFor(payload: unknown): string {
  const hash = createHash("sha1").update(JSON.stringify(payload)).digest("hex");
  return `"${hash.slice(0, 27)}"`;
}

/** Version of a single order row: changes on every status/measure update. */
export function orderVersion(row: {
  id: string;
  status: string;
  updated_at: unknown;
  weight_grams: unknown;
  total_amount: unknown;
}): string {
  const updated =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : String(row.updated_at ?? "");
  return etagFor([row.id, row.status, updated, row.weight_grams, row.total_amount]);
}

/**
 * Conditional GET: if the client already holds this version
 * (If-None-Match), answer 304 with no body (A.7). Returns true when the
 * caller must stop (304 sent).
 */
export function sendConditional(
  req: Request,
  res: Response,
  body: unknown,
  etag: string,
): boolean {
  const inm = req.headers["if-none-match"];
  if (typeof inm === "string" && inm.split(",").map((s) => s.trim()).includes(etag)) {
    res.set("ETag", etag);
    return void res.sendStatus(304) as unknown as boolean;
  }
  if (inm === "*") {
    res.set("ETag", etag);
    return void res.sendStatus(304) as unknown as boolean;
  }
  res.set("ETag", etag);
  res.status(200).json(body);
  return true;
}

/**
 * Conditional write: with If-Match the server refuses a write that would
 * overwrite somebody else's change (A.8.1). Returns true when the caller
 * must stop (412 sent). Absent If-Match stays backward compatible.
 */
export function checkPrecondition(
  req: Request,
  res: Response,
  currentEtag: string,
): boolean {
  const im = req.headers["if-match"];
  if (im === undefined) return false;
  const tags = String(im)
    .split(",")
    .map((s) => s.trim());
  if (tags.includes("*") || tags.includes(currentEtag)) return false;
  sendProblem(
    res,
    412,
    "precondition-failed",
    "The order changed since you last loaded it. Reload to see the current state, then try again.",
    req.originalUrl,
  );
  return true;
}

/** Zod issues → RFC 9457 invalid-params extension (A.6.1). */
export function invalidParams(issues: Array<{ path: unknown; message: string }>) {
  return {
    "invalid-params": issues.map((i) => ({
      name: Array.isArray(i.path) && i.path.length ? String(i.path.join(".")) : "(body)",
      reason: i.message,
    })),
  };
}
