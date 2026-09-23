import type { Express } from "express";
import type { Pool } from "pg";
import { startTestAuthServer, stopTestAuthServer } from "./tokens.js";

let cached: Promise<{ app: Express; pool: Pool }> | null = null;

/**
 * Lazily starts the local JWKS server, points OIDC_* env vars at it (before
 * config.ts / verify.ts are ever imported), then imports the real app.
 * Cached so every test in a file shares one app instance and one DB pool.
 */
export function getTestContext() {
  if (!cached) {
    cached = (async () => {
      const { issuer, jwksUri, audience } = await startTestAuthServer();
      process.env.OIDC_ISSUER = issuer;
      process.env.OIDC_JWKS_URI = jwksUri;
      process.env.OIDC_AUDIENCE = audience;

      const mod = await import("../../src/app.js");
      return { app: mod.default, pool: mod.pool };
    })();
  }
  return cached;
}

export async function closeTestContext(): Promise<void> {
  if (cached) {
    const { pool } = await cached;
    await pool.end();
  }
  await stopTestAuthServer();
}