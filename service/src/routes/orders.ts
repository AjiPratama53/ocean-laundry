import { Router, type Request, type Response } from "express";
import { createHash } from "crypto";
import {
  orderIdParamSchema,
  getOrdersQuerySchema,
  createOrderSchema,
} from "../schemas/orders.ts";
import {
  createOrder,
  findOrderById,
  findOrders,
  packageExists,
  updateOrderStatus,
} from "../store/orders.ts";
import { toOrderResponse } from "../representations/orders.ts";
import { problem } from "../problem.ts";
import { findKey, saveKey } from "../store/idempotency.ts";
import { z } from "zod";

export const ordersRouter = Router();

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

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
  if (!idempotencyKey || !isUuid(idempotencyKey)) {
    return res
      .status(400)
      .json(
        problem(400, "Invalid or missing Idempotency-Key", req.originalUrl),
      );
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

  if (!(await packageExists(parsed.data.packageId))) {
    return res
      .status(422)
      .json(
        problem(
          422,
          "packageId does not reference an existing package",
          req.originalUrl,
        ),
      );
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

    res.setHeader("Location", `/v1/orders/${newOrder.id}`);

    // 5. Response
    return res.status(201).json(responseBody);
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json(problem(500, "Failed to create order", req.originalUrl));
  }
});

// POST /v1/orders/{orderId}/pickup
ordersRouter.post(
  "/orders/:orderId/pickup",
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) {
      return res
        .status(404)
        .json(problem(404, "Order not found", req.originalUrl));
    }

    if (order.status !== "placed") {
      return res
        .status(409)
        .json(
          problem(
            409,
            `Order status must be 'placed' to pick up, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "picked_up");
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST /v1/orders/{orderId}/weigh
ordersRouter.post(
  "/orders/:orderId/weigh",
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) {
      return res
        .status(404)
        .json(problem(404, "Order not found", req.originalUrl));
    }

    if (order.status !== "picked_up") {
      return res
        .status(409)
        .json(
          problem(
            409,
            `Order status must be 'picked_up' to weigh, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    // For simplicity, let's assume the weight is provided in the request body as `weight_grams`.
    const weight = req.body.weight_grams;
    if (typeof weight !== "number" || weight <= 0) {
      return res
        .status(400)
        .json(problem(400, "Invalid weight provided", req.originalUrl));
    }

    const updated = await updateOrderStatus(order.id, "weighed", weight);
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/wash

// POST	/v1/orders/{orderId}/ready
ordersRouter.post(
  "/orders/:orderId/ready",
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) {
      return res
        .status(404)
        .json(problem(404, "Order not found", req.originalUrl));
    }

    if (order.status !== "washed") {
      return res
        .status(409)
        .json(
          problem(
            409,
            `Order status must be 'washed' to be readied, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }


    const updated = await updateOrderStatus(order.id, "ready");
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/delivery
ordersRouter.post(
  "/orders/:orderId/delivery",
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) {
      return res
        .status(404)
        .json(problem(404, "Order not found", req.originalUrl));
    }

    if (order.status !== "ready") {
      return res
        .status(409)
        .json(
          problem(
            409,
            `Order status must be 'ready' to be delivered, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }


    const updated = await updateOrderStatus(order.id, "delivering");
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/complete
ordersRouter.post(
  "/orders/:orderId/complete",
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order) {
      return res
        .status(404)
        .json(problem(404, "Order not found", req.originalUrl));
    }

    if (order.status !== "delivering") {
      return res
        .status(409)
        .json(
          problem(
            409,
            `Order status must be 'delivered' to be completed, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }


    const updated = await updateOrderStatus(order.id, "completed");
    return res.status(200).json(toOrderResponse(updated));
  },
);