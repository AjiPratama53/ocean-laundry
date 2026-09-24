import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder } from "../../helpers/db.js";

describe("Layer 3 — a customer cannot read another customer's order", () => {
  let app: any;
  let pool: any;
  let orderOwnedByB: any;
  let tokenA: string;

  const customerA = randomUUID();
  const customerB = randomUUID();

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    orderOwnedByB = await seedOrder(pool, { customerId: customerB });
    tokenA = await tokenFor(customerA, { scopes: ["orders:read"] });
  });

  afterAll(async () => {
    await deleteOrder(pool, orderOwnedByB.id);
    await closeTestContext();
  });

  it("returns 404 for an order that belongs to a different customer", async () => {
    const res = await request(app)
      .get(`/v1/orders/${orderOwnedByB.id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty("customerId");
  });

  it("answers identically to a genuinely nonexistent order", async () => {
    const realRes = await request(app)
      .get(`/v1/orders/${orderOwnedByB.id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    const fakeRes = await request(app)
      .get(`/v1/orders/ord_${randomUUID()}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(realRes.status).toBe(fakeRes.status);
    expect(realRes.body.type).toBe(fakeRes.body.type);
    expect(realRes.body.title).toBe(fakeRes.body.title);
    expect(realRes.body.detail).toBe(fakeRes.body.detail);
    // `instance` legitimately differs — it echoes the request path.
  });
});