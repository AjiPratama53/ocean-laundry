import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder } from "../../helpers/db.js";

describe("Layer 3 — a courier cannot pick up another courier's delivery", () => {
  let app: any;
  let pool: any;
  let order: any;
  let tokenCourierB: string;

  const courierA = randomUUID();
  const courierB = randomUUID();

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    order = await seedOrder(pool, {
      customerId: randomUUID(),
      courierId: courierA,
      status: "placed",
    });
    tokenCourierB = await tokenFor(courierB, { scopes: ["deliveries:write"] });
  });

  afterAll(async () => {
    await deleteOrder(pool, order.id);
    await closeTestContext();
  });

  it("refuses with 404 and does not mutate the order", async () => {
    const res = await request(app)
      .post(`/v1/orders/${order.id}/pickup`)
      .set("Authorization", `Bearer ${tokenCourierB}`);
    expect(res.status).toBe(404);

    const { rows } = await pool.query(
      `SELECT status, courier_id FROM orders WHERE id = $1`,
      [order.id],
    );
    expect(rows[0].status).toBe("placed");
    expect(rows[0].courier_id).toBe(courierA);
  });
});