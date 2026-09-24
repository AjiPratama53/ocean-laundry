import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder, seedPayment, deletePayment } from "../../helpers/db.js";

describe("Layer 3 — payment mutation ownership (proceed, cancel)", () => {
  let app: any;
  let pool: any;

  const customerA = randomUUID();
  const customerB = randomUUID();

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
  });

  afterAll(async () => {
    await closeTestContext();
  });

  it("customer A cannot proceed customer B's payment", async () => {
    const order = await seedOrder(pool, { customerId: customerB, status: "awaiting_payment" });
    const payment = await seedPayment(pool, { orderId: order.id, amount: 15000 });
    // payments:write only — no payments:read — to catch the ownership-check
    // regression where proceed/cancel wrongly required payments:read
    const tokenA = await tokenFor(customerA, { scopes: ["payments:write"] });

    const res = await request(app)
      .post(`/v1/payments/${payment.id}/proceed`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);

    await deletePayment(pool, payment.id);
    await deleteOrder(pool, order.id);
  });

  it("customer A cannot cancel customer B's payment", async () => {
    const order = await seedOrder(pool, { customerId: customerB, status: "awaiting_payment" });
    const payment = await seedPayment(pool, { orderId: order.id, amount: 15000 });
    const tokenA = await tokenFor(customerA, { scopes: ["payments:write"] });

    const res = await request(app)
      .post(`/v1/payments/${payment.id}/cancel`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);

    await deletePayment(pool, payment.id);
    await deleteOrder(pool, order.id);
  });

  it("the owning customer CAN proceed their own payment with only payments:write", async () => {
    const order = await seedOrder(pool, { customerId: customerA, status: "awaiting_payment" });
    const payment = await seedPayment(pool, { orderId: order.id, amount: 15000 });
    const tokenA = await tokenFor(customerA, { scopes: ["payments:write"] });

    const res = await request(app)
      .post(`/v1/payments/${payment.id}/proceed`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");

    await deletePayment(pool, payment.id);
    await deleteOrder(pool, order.id);
  });
});