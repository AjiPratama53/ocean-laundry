import { z } from "zod";

const orderStatusEnum = z.enum([
  "placed",
  "picked_up",
  "weighed",
  "awaiting_payment",
  "washing",
  "ready",
  "delivering",
  "completed",
  "cancelled",
]);

export const orderIdParamSchema = z.object({
  // Accept both generated ids (ord_<uuid>) and legacy/seed ids (e.g. ord_001).
  // The openapi contract only says type: string, so anything with the ord_
  // prefix is "well-formed" (→ 404 when absent); anything else is a client
  // defect (→ 400), keeping the two distinguishable.
  orderId: z.string().regex(/^ord_[A-Za-z0-9-]{1,64}$/i, "Invalid order id"),
});

export const getOrdersQuerySchema = z.object({
  status: orderStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "customerId required"),
  packageId: z.string().min(1, "packageId required"),
  pickupAddress: z.string().min(1, "pickupAddress required"),
});

export const weightOrderSchema = z.object({
  weightGrams: z.number().int().min(1, "weightGrams must be positive"),
  totalAmount: z.number().int().min(0, "totalAmount must be non-negative"),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
