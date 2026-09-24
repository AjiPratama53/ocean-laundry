import { Router, type Request, type Response } from "express";
import { createHash } from "crypto";
import { requireScope } from "../auth/require-scope.js";
import {
  mayReadOrder,
  mayWriteOrder,
  mayFulfilOrder,
  mayDeliverOrder,
  mayClaimOrder,

} from "../auth/ownership.js";
import {
  orderIdParamSchema,
  getOrdersQuerySchema,
  createOrderSchema,
} from "../schemas/orders.js";
import {
  createOrder,
  findOrderById,
  findOrdersForPrincipal,
  packageExists,
  updateOrderStatus,
  assignCourierAndUpdateStatus
} from "../store/orders.js";
import { toOrderResponse } from "../representations/orders.js";
import { problem } from "../problem.js";
import {
  checkPrecondition,
  etagFor,
  invalidParams,
  orderVersion,
  sendConditional,
} from "../middleware/http-cache.js";
import { findKey, saveKey } from "../store/idempotency.js";
import { z } from "zod";
import { findPackageById } from "../store/packages.js";

export const ordersRouter = Router();

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const isUuid = (s: string) => z.string().uuid().safeParse(s).success;

// GET /v1/orders/{orderId}
ordersRouter.get(
  "/orders/:orderId", 
  requireScope("orders:read"),
  async (req, res) => {
    
    // 2. Validation
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl,
            invalidParams(parsed.error.issues)),
        );
    }

    // 3. Work
    const row = await findOrderById(parsed.data.orderId);
    if (!row || !mayReadOrder(req.principal!, row)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // 4. Representation + 5. Response (conditional read, A.7)
    const body = toOrderResponse(row);
    sendConditional(req, res, body, orderVersion(row));
    return;
  }
);

// GET /v1/orders
ordersRouter.get(
  "/orders", 
  requireScope("orders:read"),
  async (req, res) => {
    // 2. Validation
    const parsed = getOrdersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid query parameters",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    // 3. Work
    const rows = await findOrdersForPrincipal(req.principal!, parsed.data);

    // 4. Representation + 5. Response (conditional read, A.7)
    const body = rows.map(toOrderResponse);
    sendConditional(req, res, body, etagFor(body));
    return;
  }
);

// POST /v1/orders
ordersRouter.post(
  "/orders",
  requireScope("orders:write"), 
  async (req, res) => {
    // 2. Validation
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "Invalid request body",
            req.originalUrl,
            invalidParams(parsed.error.issues),
          ),
        );
    }

    const idempotencyKey = req.header("Idempotency-Key");

    // Only end-users may create orders; service accounts (e.g. the expiration job)
    // may only cancel existing orders.
    if (req.principal!.kind !== "user") {
      return res
        .status(403)
        .json(
          problem(
            403,
            "insufficient-scope",
            "Only authenticated users may create orders",
            req.originalUrl,
          ),
        );
    }

    // The order must be placed on behalf of the authenticated principal.
    if (parsed.data.customerId !== req.principal!.subject) {
      return res
        .status(400)
        .json(
          problem(
            400,
            "validation-error",
            "customerId does not match the authenticated user",
            req.originalUrl,
          ),
        );
    }

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

    const orderInput = {
      ...parsed.data,
      customerId: req.principal!.subject,
    };

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

    if (!(await packageExists(parsed.data.packageId))) {
      return res
        .status(422)
        .json(
          problem(
            422,
            "validation-error",
            "packageId does not reference an existing package",
            req.originalUrl,
          ),
        );
    }

    try {
      // 3. Work
      const newOrder = await createOrder(orderInput);

      // 4. Representation
      const responseBody = toOrderResponse(newOrder);

      await saveKey({
        key: idempotencyKey,
        bodyHash,
        responseStatus: 201,
        responseBody,
      });

      res.setHeader("Location", `/v1/orders/${newOrder.id}`);
      res.setHeader("ETag", orderVersion(newOrder));

      // 5. Response
      return res.status(201).json(responseBody);
    } catch (error) {
      req.log.error({ err: error }, "Error creating order");
      return res
        .status(500)
        .json(
          problem(
            500,
            "internal-server-error",
            "Failed to create order",
            req.originalUrl,
          ),
        );
    }
  }
);

// POST /v1/orders/{orderId}/pickup
ordersRouter.post(
  "/orders/:orderId/pickup",
  requireScope("deliveries:write"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(problem(400, "validation-error", "Invalid order id", req.originalUrl));
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayClaimOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "placed") {
      return res
        .status(409)
        .json(problem(409, "conflict", `Order status must be 'placed' to pick up, current status: ${order.status}`, req.originalUrl));
    }

    const updated = await assignCourierAndUpdateStatus(order.id, req.principal!.subject, "picked_up");
    if (!updated) {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            "Order was claimed by another courier or its status changed concurrently",
            req.originalUrl,
          ),
        );
    }
    res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST /v1/orders/{orderId}/weigh
ordersRouter.post(
  "/orders/:orderId/weigh",
  requireScope("orders:fulfil"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayFulfilOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "picked_up") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'picked_up' to weigh, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const packageRow = await findPackageById(order.package_id);
    if (!packageRow || packageRow.price === null) {
      return res
        .status(500)
        .json(
          problem(
            500,
            "internal-server-error",
            "Failed to retrieve package price",
            req.originalUrl,
          ),
        );
    }

    const { price } = packageRow;
    const weight = req.body.weightGrams;
    if (typeof weight !== "number" || weight <= 0) {
      return res
        .status(422)
        .json(
          problem(
            422,
            "validation-error",
            "weightGrams must be greater than 0",
            req.originalUrl,
          ),
        );
    }

    const totalAmount = (price * weight) / 1000; // Convert grams to kilograms
    const updated = await updateOrderStatus(order.id, "awaiting_payment", {
      weighGrams: weight,
      totalAmount: totalAmount,
    });
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/wash
ordersRouter.post(
  "/orders/:orderId/wash",
  requireScope("orders:fulfil"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayFulfilOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "awaiting_payment") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'awaiting_payment' to wash, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "washing");
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/ready
ordersRouter.post(
  "/orders/:orderId/ready",
  requireScope("orders:fulfil"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayFulfilOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "washing") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'washing to be readied, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "ready");
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/delivery
ordersRouter.post(
  "/orders/:orderId/delivery",
  requireScope("deliveries:write"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayDeliverOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "ready") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'ready' to be delivered, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "delivering");
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/complete
ordersRouter.post(
  "/orders/:orderId/complete",
  requireScope("deliveries:write"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayDeliverOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "delivering") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'delivered' to be completed, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "completed");
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);

// POST	/v1/orders/{orderId}/cancel
ordersRouter.post(
  "/orders/:orderId/cancel",
  requireScope("orders:write"),
  async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          problem(400, "validation-error", "Invalid order id", req.originalUrl),
        );
    }

    const order = await findOrderById(parsed.data.orderId);
    if (!order || !mayWriteOrder(req.principal!, order)) {
      return res
        .status(404)
        .json(problem(404, "not-found", "Order not found", req.originalUrl));
    }

    // Conditional write (A.8): refuse stale preconditions with 412.
    if (checkPrecondition(req, res, orderVersion(order))) return;

    if (order.status !== "placed" && order.status !== "awaiting_payment") {
      return res
        .status(409)
        .json(
          problem(
            409,
            "conflict",
            `Order status must be 'placed' or 'awaiting_payment' to be cancelled, current status: ${order.status}`,
            req.originalUrl,
          ),
        );
    }

    const updated = await updateOrderStatus(order.id, "cancelled");
    if (updated) res.set("ETag", orderVersion(updated));
    return res.status(200).json(toOrderResponse(updated));
  },
);
