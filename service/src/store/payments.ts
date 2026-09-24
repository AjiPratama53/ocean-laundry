import { pool } from "../app.js";
import type { OrderRow } from "./orders.js";

export interface PaymentRow {
  id: string;
  order_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: Date;
}

export async function findPaymentById(id: string): Promise<PaymentRow | null> {
  const { rows } = await pool.query<PaymentRow>(
    `SELECT * FROM payments WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface PaymentWithOrderRow extends PaymentRow {
  order: OrderRow;
}

export async function findPaymentWithOrderById(
  id: string,
): Promise<PaymentWithOrderRow | null> {
  const { rows } = await pool.query<PaymentWithOrderRow>(
    `SELECT 
       p.*,
       to_jsonb(o.*) as "order"
     FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE p.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  // pg returns the JSONB column as a plain object; cast it back to OrderRow shape.
  return { ...row, order: row.order as unknown as OrderRow };
}

export async function createPayment(data: {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "paid" | "failed";
}): Promise<PaymentRow> {
  const { rows } = await pool.query<PaymentRow>(
    `
      INSERT INTO payments (id, order_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [data.id, data.orderId, data.amount, data.status],
  );

  return rows[0];
}

export async function orderExists(orderId: string): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM orders WHERE id = $1`, [
    orderId,
  ]);
  return rows.length > 0;
}

export async function findOrderById(orderId: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId],
  );
  return rows[0] ?? null;
}

// pending -> paid, atomically with orders: awaiting_payment -> washing.
// Returns null if either row wasn't in the expected starting state
// (already handled elsewhere, or changed concurrently) — caller maps that to 409.
export async function proceedPayment(paymentId: string): Promise<PaymentRow | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: paymentRows } = await client.query<PaymentRow>(
      `UPDATE payments
          SET status = 'paid'
        WHERE id = $1 AND status = 'pending'
        RETURNING *`,
      [paymentId],
    );
    const payment = paymentRows[0];
    if (!payment) {
      await client.query("ROLLBACK");
      return null;
    }

    const { rows: orderRows } = await client.query(
      `UPDATE orders
          SET status = 'washing', updated_at = now()
        WHERE id = $1 AND status = 'awaiting_payment'
        RETURNING id`,
      [payment.order_id],
    );
    if (!orderRows[0]) {
      // order wasn't where we expected it — abort the whole transition
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("COMMIT");
    return payment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// pending -> failed. Order is left untouched (still awaiting_payment),
// so the customer can retry with a new payment. Single-table write, no transaction needed.
export async function cancelPayment(paymentId: string): Promise<PaymentRow | null> {
  const { rows } = await pool.query<PaymentRow>(
    `UPDATE payments
        SET status = 'failed'
      WHERE id = $1 AND status = 'pending'
      RETURNING *`,
    [paymentId],
  );
  return rows[0] ?? null;
}