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