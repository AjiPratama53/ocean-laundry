import { Router } from "express";
import { orderIdParamSchema, getOrdersQuerySchema } from "../schemas/orders.js";
import { findOrderById, findOrders } from "../store/orders.js";
import { toOrderResponse } from "../representations/orders.js";
import { problem } from "../problem.js";

export const ordersRouter = Router();

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