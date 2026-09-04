import { z } from "zod";

const orderStatusEnum = z.enum([
  "placed",
  "picked_up",
  "awaiting_payment",
  "paid",
  "washing",
  "ready",
  "delivering",
  "completed",
]);

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
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
