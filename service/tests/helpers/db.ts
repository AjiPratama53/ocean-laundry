import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export async function seedOrder(
  pool: Pool,
  overrides: {
    customerId: string;
    courierId?: string | null;
    packageId?: string;
    status?: string;
  },
) {
  const id = `ord_${randomUUID()}`;
  const { rows } = await pool.query(
    `INSERT INTO orders (id, customer_id, courier_id, package_id, pickup_address, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      id,
      overrides.customerId,
      overrides.courierId ?? null,
      overrides.packageId ?? "pkg_001",
      "Test address",
      overrides.status ?? "placed",
    ],
  );
  return rows[0];
}

export async function deleteOrder(pool: Pool, id: string) {
  await pool.query(`DELETE FROM orders WHERE id = $1`, [id]);
}

export async function seedPayment(
  pool: Pool,
  overrides: { orderId: string; amount?: number; status?: "pending" | "paid" | "failed" },
) {
  const id = `pay_${randomUUID()}`;
  const { rows } = await pool.query(
    `INSERT INTO payments (id, order_id, amount, status) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, overrides.orderId, overrides.amount ?? 10000, overrides.status ?? "paid"],
  );
  return rows[0];
}

export async function deletePayment(pool: Pool, id: string) {
  await pool.query(`DELETE FROM payments WHERE id = $1`, [id]);
}