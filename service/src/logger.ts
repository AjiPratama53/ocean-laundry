import pino from "pino";
import { pinoHttp } from "pino-http";

/**
 * Base structured logger for the service.
 *
 * Redaction rules ensure that access tokens, refresh tokens, cookies, and
 * other sensitive values are never written to logs.  The same logger is shared
 * with `pino-http` so request logs inherit the same redaction policy.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      // HTTP request headers logged by pino-http
      "req.headers.authorization",
      "req.headers.cookie",
      "request.headers.authorization",
      "request.headers.cookie",
      // Any nested object that might contain credentials
      "*.authorization",
      "*.cookie",
      "*.accessToken",
      "*.refreshToken",
      "*.access_token",
      "*.refresh_token",
      "*.token",
      "*.password",
    ],
    censor: "[Redacted]",
  },
});

/**
 * Express middleware that attaches a child logger (`req.log`) to every request
 * and logs incoming requests / outgoing responses.
 */
export const httpLogger = pinoHttp({ logger });
