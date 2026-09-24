import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder, seedPayment, deletePayment } from "../../helpers/db.js";

describe("Layer 3 — a customer cannot read another customer's payment", () => {
  let app: any;
  let pool: any;
  let order: any;
  let payment: any;
  let tokenCustomerA: string;

  const customerA = randomUUID();
  const customerB = randomUUID();

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    order = await seedOrder(pool, { customerId: customerB, status: "awaiting_payment" });
    payment = await seedPayment(pool, { orderId: order.id, amount: 15000 });
    // customer A legitimately holds payments:read — the exact scope that,
    // before the ownership fix, was sufficient on its own to read ANY payment.
    tokenCustomerA = await tokenFor(customerA, { scopes: ["payments:read"] });
  });

  afterAll(async () => {
    await deletePayment(pool, payment.id);
    await deleteOrder(pool, order.id);
    await closeTestContext();
  });

  it("refuses with 404 even though the caller holds payments:read", async () => {
    const res = await request(app)
      .get(`/v1/payments/${payment.id}`)
      .set("Authorization", `Bearer ${tokenCustomerA}`);
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty("amount");
  });
});