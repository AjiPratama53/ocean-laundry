import { Router } from "express";
import { createHash, randomUUID } from "crypto";
import { requireScope } from "../auth/require-scope.js";
import { mayReadPayment, mayModifyPayment } from "../auth/ownership.js";
import { paymentIdParamSchema, createPaymentSchema } from "../schemas/payments.js";
import { findPaymentWithOrderById, createPayment, findOrderById, proceedPayment, cancelPayment } from "../store/payments.js";import { toPaymentResponse } from "../representations/payments.js";
import { findKey, saveKey } from "../store/idempotency.js";
import { problem } from "../problem.js";
import {
  etagFor,
  invalidParams,
  sendConditional,
} from "../middleware/http-cache.js";
import { z } from "zod";

export const paymentsRouter = Router();

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

// GET /v1/payments/{paymentId}
paymentsRouter.get(
  "/payments/:paymentId", 
  requireScope("payments:read"),
  async (req, res) => {
    // 2. Validation
    const parsed = paymentIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid payment id", req.originalUrl,
            invalidParams(parsed.error.issues)),
        );
    }

    // 3. Work
    const row = await findPaymentWithOrderById(parsed.data.paymentId);
    if (!row || !mayReadPayment(req.principal!, row, row.order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Payment not found", req.originalUrl));
    }

    // 4. Representation + 5. Response (conditional read, A.7)
    const body = toPaymentResponse(row);
    sendConditional(req, res, body, etagFor(row));
    return;
}
);

// POST /v1/payments
paymentsRouter.post(
  "/payments", 
  requireScope("payments:write"),
  async (req, res) => {
    // 2. Validation
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(422)
        .json(
          problem(
            422,
            "validation-error",
            "Invalid request body",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    const idempotencyKey = req.header("Idempotency-Key");

    // Idempotency-Key missing / malformed
    if (!idempotencyKey || !isUuid(idempotencyKey)) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid or missing Idempotency-Key",
            req.originalUrl,
          ),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayModifyPayment(req.principal!, order)) {
      return res
        .status(422)   // was 404
        .json(problem(422, "validation-error", "orderId does not reference an accessible order", req.originalUrl));
    }

    const bodyHash = hashBody(req.body);

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

    if (order.status !== "awaiting_payment") {
      return res.status(409).json(
        problem(409, "conflict", `Order status must be 'awaiting_payment' to accept payment, current status: ${order.status}`, req.originalUrl)
      );
    }

    // 3. Work
    const payment = await createPayment({
      id: `pay_${randomUUID()}`,
      orderId: parsed.data.orderId,
      amount: parsed.data.amount,

      status: "pending",
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
  }
);

// POST /v1/payments/{paymentId}/proceed
paymentsRouter.post(
  "/payments/:paymentId/proceed",
  requireScope("payments:write"),
  async (req, res) => {
    // 2. Validation
    const parsed = paymentIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "validation-error", "Invalid payment id", req.originalUrl));
    }

    // 3. Work
    const row = await findPaymentWithOrderById(parsed.data.paymentId);
    if (!row || !mayModifyPayment(req.principal!, row.order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Payment not found", req.originalUrl));
    }

    if (row.status !== "pending") {
      return res
        .status(409)
        .json(problem(409, "conflict", `Payment is ${row.status}, cannot proceed`, req.originalUrl));
    }

    const updated = await proceedPayment(row.id); // pending->paid + order->washing, guarded
    if (!updated) {
      return res
        .status(409)
        .json(problem(409, "conflict", "Payment status changed concurrently", req.originalUrl));
    }

    // 4/5. Representation + Response
    return res.status(200).json(toPaymentResponse(updated));
  }
);

// POST /v1/payments/{paymentId}/cancel
paymentsRouter.post(
  "/payments/:paymentId/cancel",
  requireScope("payments:write"),
  async (req, res) => {
    const parsed = paymentIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "validation-error", "Invalid payment id", req.originalUrl));
    }

    const row = await findPaymentWithOrderById(parsed.data.paymentId);
    if (!row || !mayModifyPayment(req.principal!, row.order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Payment not found", req.originalUrl));
    }

    if (row.status !== "pending") {
      return res
        .status(409)
        .json(problem(409, "conflict", `Payment is ${row.status}, cannot cancel`, req.originalUrl));
    }

    const updated = await cancelPayment(row.id); // pending->failed, guarded
    if (!updated) {
      return res
        .status(409)
        .json(problem(409, "conflict", "Payment status changed concurrently", req.originalUrl));
    }

    return res.status(200).json(toPaymentResponse(updated));
  }
);