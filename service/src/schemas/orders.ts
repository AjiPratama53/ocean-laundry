import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
});

export const getOrdersQuerySchema = z.object({
  status: z.enum([
    "placed", "picked_up", "weighed", "awaiting_payment",
    "paid", "washing", "ready", "delivering", "completed",
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "customerId required"),
  packageId: z.string().min(1, "packageId required"),
  pickupAddress: z.string().min(1, "pickupAddress required"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;