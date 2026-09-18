import type { OrderRow } from "../store/orders.js";

export interface OrderResponse {
  id: string;
  customerId: string;
  courierId: string | null;
  packageId: string;
  pickupAddress: string;
  status: string;
  weightGrams: number | null;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export function toOrderResponse(row: OrderRow): OrderResponse {
  return {
    id: row.id,
    customerId: row.customer_id,
    courierId: row.courier_id,
    packageId: row.package_id,
    pickupAddress: row.pickup_address,
    status: row.status,
    weightGrams: row.weight_grams,
    totalAmount: row.total_amount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null, 
    // any internal-only column (e.g. a soft-delete flag) simply isn't listed here
  };
}
