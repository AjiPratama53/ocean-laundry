import { pool } from "../app.ts";
import type { CreateOrderInput } from "../schemas/orders.js";
import { randomUUID } from "crypto";

export interface OrderRow {
  id: string;
  customer_id: string;
  courier_id: string | null;
  package_id: string;
  pickup_address: string;
  status: string;
  weight_grams: number | null;
  total_amount: number | null;
  created_at: Date;
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findOrders(params: {
  status?: string;
  limit: number;
  cursor?: string;
}): Promise<OrderRow[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }
  if (params.cursor) {
    values.push(params.cursor);
    conditions.push(`id > $${values.length}`); // simple cursor: id-based
  }

  values.push(params.limit);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query<OrderRow>(
    `SELECT * FROM orders ${where} ORDER BY id ASC LIMIT $${values.length}`,
    values,
  );
  return rows;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRow> {
  const id = `ord_${randomUUID()}`;
  const { rows } = await pool.query<OrderRow>(
    `INSERT INTO orders (id, customer_id, package_id, pickup_address, status)
     VALUES ($1, $2, $3, $4, 'placed')
     RETURNING *`,
    [id, input.customerId, input.packageId, input.pickupAddress],
  );
  return rows[0];
}

export async function updateOrderStatus(
  id: string,
  newStatus: string,
  extra?: { weighGrams?: number; totalAmount?: number },
) {
  const { rows } = await pool.query<OrderRow>(
    `UPDATE orders 
   SET 
    status = $1, 
    weight_grams = COALESCE($2, weight_grams), 
    total_amount = COALESCE($3, total_amount) 
  WHERE id = $4 
  RETURNING *`,
    [newStatus, extra?.weighGrams ?? null, extra?.totalAmount ?? null, id],
  );
  return rows[0] ?? null;
}

export async function packageExists(packageId: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM packages WHERE id = $1`, [
    packageId,
  ]);
  return rows.length > 0;
}
