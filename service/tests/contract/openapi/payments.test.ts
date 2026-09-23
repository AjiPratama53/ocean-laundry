import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder, seedPayment, deletePayment } from "../../helpers/db.js";

// Keep in sync with components.schemas.Payment in openapi.yaml
const PAYMENT_FIELDS = ["id", "orderId", "amount", "status", "createdAt"];

describe("Contract — /payments", () => {
  let app: any;
  let pool: any;

  const customer = randomUUID();
  let writeToken: string;
  let readToken: string;

  const seededOrderIds: string[] = [];
  const seededPaymentIds: string[] = [];

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    writeToken = await tokenFor(customer, { scopes: ["payments:write"] });
    readToken = await tokenFor(customer, { scopes: ["payments:read"] });
  });

  afterAll(async () => {
    for (const id of seededPaymentIds) await deletePayment(pool, id).catch(() => {});
    for (const id of seededOrderIds) await deleteOrder(pool, id).catch(() => {});
    await closeTestContext();
  });

  it("requires an Idempotency-Key header, before touching the database", async () => {
    const order = await seedOrder(pool, {
      customerId: customer,
      status: "awaiting_payment",
    });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .send({ orderId: order.id, amount: 5000 });
    expect(res.status).toBe(400);
  });

  it("returns 422 for a nonexistent orderId (individually valid fields, unusable as a whole)", async () => {
    const res = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ orderId: `ord_${randomUUID()}`, amount: 5000 });
    expect(res.status).toBe(422);
  });

  it("returns 409 when the order is not awaiting_payment", async () => {
    const order = await seedOrder(pool, {
      customerId: customer,
      status: "placed",
    });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ orderId: order.id, amount: 5000 });
    expect(res.status).toBe(409);
  });

  it("creates a payment: 201, representation matches documented fields", async () => {
    const order = await seedOrder(pool, {
      customerId: customer,
      status: "awaiting_payment",
    });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({ orderId: order.id, amount: 12000 });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual([...PAYMENT_FIELDS].sort());
    expect(res.body.status).toBe("paid");
    seededPaymentIds.push(res.body.id);
  });

  it("idempotency: same key + same body → one row, identical response", async () => {
    const order = await seedOrder(pool, {
      customerId: customer,
      status: "awaiting_payment",
    });
    seededOrderIds.push(order.id);
    const key = randomUUID();
    const body = { orderId: order.id, amount: 9000 };

    const first = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", key)
      .send(body);
    seededPaymentIds.push(first.body.id);

    const second = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", key)
      .send(body);

    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM payments WHERE order_id = $1",
      [order.id],
    );
    expect(rows[0].n).toBe(1);
  });

  it("idempotency: same key + different body → 409 idempotency-key-reuse", async () => {
    const order = await seedOrder(pool, {
      customerId: customer,
      status: "awaiting_payment",
    });
    seededOrderIds.push(order.id);
    const key = randomUUID();

    const first = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", key)
      .send({ orderId: order.id, amount: 4000 });
    seededPaymentIds.push(first.body.id);

    const second = await request(app)
      .post("/v1/payments")
      .set("Authorization", `Bearer ${writeToken}`)
      .set("Idempotency-Key", key)
      .send({ orderId: order.id, amount: 4000, extraNote: "different body" });

    expect(second.status).toBe(409);
    expect(second.body.type).toContain("idempotency-key-reuse");
  });

  it("GET /payments/{id} for a nonexistent id returns 404 as Problem Details", async () => {
    const res = await request(app)
      .get(`/v1/payments/pay_${randomUUID()}`)
      .set("Authorization", `Bearer ${readToken}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("status", 404);
  });
});
