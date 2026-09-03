import { Router } from "express";
import { createHash, randomUUID } from "crypto";
import { paymentIdParamSchema, createPaymentSchema } from "../schemas/payments.ts";
import { findPaymentById, createPayment, orderExists } from "../store/payments.ts";
import { toPaymentResponse } from "../representations/payments.ts";
import { findKey, saveKey } from "../store/idempotency.ts";
import { problem } from "../problem.ts";
import { z } from "zod";

export const paymentsRouter = Router();

function hashBody(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

// GET /v1/payments/{paymentId}
paymentsRouter.get("/payments/:paymentId", async (req, res) => {
  // 2. Validation
  const parsed = paymentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(400, "validation-error", "Invalid payment id", req.originalUrl));
  }

  // 3. Work
  const row = await findPaymentById(parsed.data.paymentId);
  if (!row) {
    return res
      .status(404)
      .json(problem(404, "not-found", "Payment not found", req.originalUrl));
  }

  // 4. Representation + 5. Response
  return res.status(200).json(toPaymentResponse(row));
});


// POST /v1/payments
paymentsRouter.post("/payments", async (req, res) => {
  // 2. Validation
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(422, "validation-error", "Invalid request body", req.originalUrl));
  }

  const idempotencyKey = req.header("Idempotency-Key");

  // Idempotency-Key missing / malformed 
  if (!idempotencyKey || !isUuid(idempotencyKey)) {
    return res
      .status(400)
      .json(problem(400, "validation-error", "Invalid or missing Idempotency-Key", req.originalUrl));
  }

  if (!(await orderExists(parsed.data.orderId))) {
    return res
      .status(422)
      .json(problem(422, "validation-error", "orderId does not reference an existing order", req.originalUrl));
  }

  const bodyHash = hashBody(parsed.data);

  const existingKey = await findKey(idempotencyKey);
  if (existingKey) {
    // Key sama tetapi request body berbeda
    if (existingKey.bodyHash !== bodyHash) {
      return res
        .status(409)
        .json(
          problem(
            409,
            "idempotency-key-reuse",
            "Idempotency-Key was already used with a different request body",
            req.originalUrl,
          ),
        );
    }

    // Key dan request body sama
    // Kembalikan response sebelumnya
    return res
      .status(existingKey.responseStatus)
      .json(existingKey.responseBody);
  }

  // 3. Work
  const payment = await createPayment({
    id: `pay_${randomUUID()}`,
    orderId: parsed.data.orderId,
    amount: parsed.data.amount,

    // TODO: Ganti ketika integrasi payment gateway
    status: "paid",
  });

  // 4. Representation
  const responseBody = toPaymentResponse(payment);

  await saveKey({
    key: idempotencyKey,
    bodyHash,
    responseStatus: 201,
    responseBody,
  });

  // 5. Response
  return res.status(201).json(responseBody);
});