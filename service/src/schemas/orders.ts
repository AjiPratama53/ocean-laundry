import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1), // contract only says type: string, nothing more to enforce
});

export const getOrdersQuerySchema = z.object({
  status: z.enum([
    "placed", "picked_up", "weighed", "awaiting_payment",
    "paid", "washing", "ready", "delivering", "completed",
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const orderStatusEnum = z.enum([
  "placed", "picked_up", "weighed", "awaiting_payment",
  "paid", "washing", "ready", "delivering", "completed",
]);

export const createOrderSchema = z.object({
  customer_id: z.string().min(1, "customer_id required"),
  package_id: z.string().min(1, "package_id required"),
  pickup_address: z.string().min(1, "pickup_address required"),
  courier_id: z.string().nullable().optional(),
  weight_grams: z.number().int().nonnegative().nullable().optional(),
  total_amount: z.number().int().nonnegative().nullable().optional(),
  status: orderStatusEnum.default("placed"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;