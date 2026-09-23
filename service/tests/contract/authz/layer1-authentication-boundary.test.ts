import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";

describe("Layer 1 — Authentication boundary", () => {
  let app: any;

  beforeAll(async () => {
    ({ app } = await getTestContext());
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it("refuses request without Authorization header with 401", async () => {
    const res = await request(app).get(`/v1/orders/ord_${randomUUID()}`);
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe('Bearer error="invalid_token"');
    expect(res.body.status).toBe(401);
    expect(res.body.title).toBe("Unauthenticated");
    expect(res.body.type).toContain("unauthenticated");
  });

  it("refuses request with malformed token with 401", async () => {
    const res = await request(app)
      .get(`/v1/orders/ord_${randomUUID()}`)
      .set("Authorization", "Bearer not-a-token");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe('Bearer error="invalid_token"');
  });

  it("refuses request with an edited token payload with 401", async () => {
    const validToken = await tokenFor("customer-test", { scopes: ["orders:read"] });
    const parts = validToken.split(".");
    expect(parts.length).toBe(3);

    // Tamper with one character in payload
    const originalPayload = parts[1];
    const tamperedPayload =
      originalPayload.slice(0, -1) + (originalPayload.endsWith("a") ? "b" : "a");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const res = await request(app)
      .get(`/v1/orders/ord_${randomUUID()}`)
      .set("Authorization", `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe('Bearer error="invalid_token"');
  });

  it("permits public endpoint /health without a token", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
