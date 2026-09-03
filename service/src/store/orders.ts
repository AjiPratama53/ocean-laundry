import { pool } from "../app.ts";

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

export interface CreateOrderInput {
  customer_id: string;
  package_id: string;
  pickup_address: string;
  courier_id?: string | null;
  weight_grams?: number | null;
  total_amount?: number | null;
  status?: string;
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1`,
    [id]
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
    values
  );
  return rows;
}

export async function createOrder(data: CreateOrderInput): Promise<OrderRow> {
  const { rows } = await pool.query<OrderRow>(
    `INSERT INTO orders (
      customer_id, 
      package_id, 
      pickup_address, 
      courier_id, 
      weight_grams, 
      total_amount, 
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      data.customer_id,
      data.package_id,
      data.pickup_address,
      data.courier_id ?? null,
      data.weight_grams ?? null,
      data.total_amount ?? null,
      data.status ?? 'pending'
    ]
  );

  return rows[0];
}