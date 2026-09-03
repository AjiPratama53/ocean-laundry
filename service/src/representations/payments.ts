import type { PaymentRow } from "../store/payments.ts";

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  createdAt: string;
}

export function toPaymentResponse(row: PaymentRow): PaymentResponse {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}