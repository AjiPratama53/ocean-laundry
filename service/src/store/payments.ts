import { pool } from "../app.ts";

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
    [id]
  );
  return rows[0] ?? null;
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
    [
      data.id,
      data.orderId,
      data.amount,
      data.status,
    ]
  );

  return rows[0];
}