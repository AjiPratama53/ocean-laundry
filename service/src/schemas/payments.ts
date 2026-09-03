import { z } from "zod";

export const paymentIdParamSchema = z.object({
  paymentId: z.string().min(1),
});

export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().int().min(1),
});