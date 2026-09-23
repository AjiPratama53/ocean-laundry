import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder } from "../../helpers/db.js";

describe("Layer 2 — a customer cannot call a staff-only operation", () => {
  let app: any;
  let pool: any;
  let order: any;
  let tokenCustomer: string;

  const customer = randomUUID();

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    order = await seedOrder(pool, { customerId: customer, status: "picked_up" });
    // deliberately missing orders:fulfil
    tokenCustomer = await tokenFor(customer, { scopes: ["orders:read", "orders:write"] });
  });

  afterAll(async () => {
    await deleteOrder(pool, order.id);
    await closeTestContext();
  });

  it("refuses with 403 before touching the object", async () => {
    const res = await request(app)
      .post(`/v1/orders/${order.id}/weigh`)
      .set("Authorization", `Bearer ${tokenCustomer}`)
      .send({ weightGrams: 2000 });

    expect(res.status).toBe(403);
    expect(res.headers["www-authenticate"]).toContain("insufficient_scope");

    const { rows } = await pool.query(`SELECT status FROM orders WHERE id = $1`, [order.id]);
    expect(rows[0].status).toBe("picked_up"); // unchanged
  });
});