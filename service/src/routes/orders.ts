import { Router } from "express";
import { createHash } from "crypto";
import { orderIdParamSchema, getOrdersQuerySchema, createOrderSchema } from "../schemas/orders.ts";
import { createOrder, findOrderById, findOrders } from "../store/orders.ts";
import { toOrderResponse } from "../representations/orders.ts";
import { problem } from "../problem.ts";
import { findKey, saveKey } from "../store/idempotency.ts";

export const ordersRouter = Router();

function hashBody(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

// GET /v1/orders/{orderId}
ordersRouter.get("/orders/:orderId", async (req, res) => {
  // 2. Validation
  const parsed = orderIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(400, "Invalid order id", req.originalUrl));
  }

  // 3. Work
  const row = await findOrderById(parsed.data.orderId);
  if (!row) {
    return res
      .status(404)
      .json(problem(404, "Order not found", req.originalUrl));
  }

  // 4. Representation + 5. Response
  return res.status(200).json(toOrderResponse(row));
});

// GET /v1/orders
ordersRouter.get("/orders", async (req, res) => {
  // 2. Validation
  const parsed = getOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(400, "Invalid query parameters", req.originalUrl));
  }

  // 3. Work
  const rows = await findOrders(parsed.data);

  // 4. Representation + 5. Response
  return res.status(200).json(rows.map(toOrderResponse));
});

// POST /v1/orders
ordersRouter.post("/orders", async (req, res) => {
  // 2. Validation
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json(problem(400, "Invalid request body", req.originalUrl));
  }

  const idempotencyKey = req.header("Idempotency-Key");
  
  // Idempotency-Key missing / malformed 
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return res
      .status(400)
      .json(problem(400, "Invalid or missing Idempotency-Key", req.originalUrl));
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

  try {
    // 3. Work
    const newOrder = await createOrder(parsed.data);

    // 4. Representation 
    const responseBody = toOrderResponse(newOrder);
    
    await saveKey({
      key: idempotencyKey,
      bodyHash,
      responseStatus: 201,
      responseBody,
    });

    // 5. Response
    return res.status(201).json(responseBody);
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json(problem(500, "Failed to create order", req.originalUrl));
  }
});