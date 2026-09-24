import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getTestContext, closeTestContext } from "../../helpers/app.js";
import { tokenFor } from "../../helpers/tokens.js";
import { seedOrder, deleteOrder } from "../../helpers/db.js";

// Keep in sync with components.schemas.Order in openapi.yaml
const ORDER_FIELDS = [
  "id",
  "customerId",
  "courierId",
  "packageId",
  "pickupAddress",
  "status",
  "weightGrams",
  "totalAmount",
  "createdAt",
  "updatedAt",
];

describe("Contract — /orders", () => {
  let app: any;
  let pool: any;
  let packageId: string; // a real package, needed only for the POST /orders flows below

  const customer = randomUUID();
  const staff = randomUUID();

  let customerReadToken: string;
  let customerWriteToken: string;
  let staffFulfilToken: string;

  const seededOrderIds: string[] = [];

  beforeAll(async () => {
    ({ app, pool } = await getTestContext());
    customerReadToken = await tokenFor(customer, { scopes: ["orders:read"] });
    customerWriteToken = await tokenFor(customer, {
      scopes: ["orders:write", "orders:read"],
    });
    staffFulfilToken = await tokenFor(staff, {
      scopes: ["orders:fulfil", "orders:read"],
    });

    const pkgWriteToken = await tokenFor(randomUUID(), {
      scopes: ["packages:write"],
    });
    const pkgRes = await request(app)
      .post("/v1/packages")
      .set("Authorization", `Bearer ${pkgWriteToken}`)
      .send({
        packageName: "Order Contract Test Package",
        packageDesc: "x",
        packagePrice: 5000,
      });
    packageId = pkgRes.body.id;
  });

  afterAll(async () => {
    for (const id of seededOrderIds) {
      await deleteOrder(pool, id).catch(() => {});
    }
    await closeTestContext();
  });

  describe("GET /orders/{orderId}", () => {
    it("returns 400 for a malformed order id", async () => {
      const res = await request(app)
        .get("/v1/orders/not-a-valid-id")
        .set("Authorization", `Bearer ${customerReadToken}`);
      // 400, not 404: an invalid-shaped id is a client defect, distinct
      // from "well-formed but absent". Merging the two lets a caller not
      // tell its own bug apart from missing data.
      expect(res.status).toBe(400);
    });

    it("returns 404 for a well-formed id that does not exist", async () => {
      const res = await request(app)
        .get(`/v1/orders/ord_${randomUUID()}`)
        .set("Authorization", `Bearer ${customerReadToken}`);
      expect(res.status).toBe(404);
    });

    it("returns only the documented fields", async () => {
      const order = await seedOrder(pool, { customerId: customer });
      seededOrderIds.push(order.id);

      const res = await request(app)
        .get(`/v1/orders/${order.id}`)
        .set("Authorization", `Bearer ${customerReadToken}`);

      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual([...ORDER_FIELDS].sort());
    });
  });

  describe("GET /orders", () => {
    it("returns 200 with an array, never 404, when nothing matches", async () => {
      const res = await request(app)
        .get("/v1/orders")
        .query({ status: "cancelled", limit: 1 })
        .set("Authorization", `Bearer ${customerReadToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("respects the limit parameter", async () => {
      const a = await seedOrder(pool, { customerId: customer });
      const b = await seedOrder(pool, { customerId: customer });
      seededOrderIds.push(a.id, b.id);

      const res = await request(app)
        .get("/v1/orders")
        .query({ limit: 1 })
        .set("Authorization", `Bearer ${customerReadToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });

    it("rejects a limit above the documented maximum with 400", async () => {
      const res = await request(app)
        .get("/v1/orders")
        .query({ limit: 101 })
        .set("Authorization", `Bearer ${customerReadToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /orders", () => {
    it("requires an Idempotency-Key header, before touching the database", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .send({ customerId: customer, packageId, pickupAddress: "Jl. Test" });
      expect(res.status).toBe(400);
    });

    it("returns 422 when every field is individually valid but the whole is unusable (unknown packageId)", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", randomUUID())
        .send({
          customerId: customer,
          packageId: `pkg_${randomUUID()}`,
          pickupAddress: "Jl. Test",
        });
      expect(res.status).toBe(422);
    });

    it("creates an order: 201, Location header, server-filled fields present", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", randomUUID())
        .send({
          customerId: customer,
          packageId,
          pickupAddress: "Jl. Contract Test 1",
        });

      expect(res.status).toBe(201);
      expect(res.headers.location).toContain(res.body.id);
      expect(res.body.status).toBe("placed");
      expect(res.body.createdAt).toBeTruthy();
      seededOrderIds.push(res.body.id);
    });

    it("idempotency: same key + same body → one row, identical response", async () => {
      const key = randomUUID();
      const body = {
        customerId: customer,
        packageId,
        pickupAddress: "Jl. Contract Test 2",
      };

      const before = await pool.query(
        "SELECT count(*)::int AS n FROM orders WHERE customer_id = $1 AND pickup_address = $2",
        [customer, body.pickupAddress],
      );

      const first = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", key)
        .send(body);
      seededOrderIds.push(first.body.id);

      const second = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", key)
        .send(body);

      expect(second.status).toBe(201);
      expect(second.body).toEqual(first.body);

      const after = await pool.query(
        "SELECT count(*)::int AS n FROM orders WHERE customer_id = $1 AND pickup_address = $2",
        [customer, body.pickupAddress],
      );
      expect(after.rows[0].n).toBe(before.rows[0].n + 1);
    });

    it("idempotency: same key + different body → 409 idempotency-key-reuse", async () => {
      const key = randomUUID();

      const first = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", key)
        .send({
          customerId: customer,
          packageId,
          pickupAddress: "Jl. Contract Test 3a",
        });
      seededOrderIds.push(first.body.id);

      const second = await request(app)
        .post("/v1/orders")
        .set("Authorization", `Bearer ${customerWriteToken}`)
        .set("Idempotency-Key", key)
        .send({
          customerId: customer,
          packageId,
          pickupAddress: "Jl. Contract Test 3b — different",
        });

      expect(second.status).toBe(409);
      expect(second.body.type).toContain("idempotency-key-reuse");
    });
  });

  describe("Status transitions", () => {
    it("pickup on an order that is not 'placed' returns 409", async () => {
      const courier = randomUUID();
      const order = await seedOrder(pool, {
        customerId: customer,
        courierId: null,
        status: "picked_up",
      });
      seededOrderIds.push(order.id);
      const courierToken = await tokenFor(courier, {
        scopes: ["deliveries:write"],
      });

      const res = await request(app)
        .post(`/v1/orders/${order.id}/pickup`)
        .set("Authorization", `Bearer ${courierToken}`);
      expect(res.status).toBe(409);
    });

    it("weigh with weightGrams <= 0 returns 422", async () => {
      const order = await seedOrder(pool, {
        customerId: customer,
        status: "picked_up",
      });
      seededOrderIds.push(order.id);

      const res = await request(app)
        .post(`/v1/orders/${order.id}/weigh`)
        .set("Authorization", `Bearer ${staffFulfilToken}`)
        .send({ weightGrams: 0 });
      expect(res.status).toBe(422);
    });
  });
});
