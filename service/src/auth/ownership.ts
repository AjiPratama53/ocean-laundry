import type { Principal } from "./principal.js";
import type { OrderRow } from "../store/orders.js";
import type { PaymentRow } from "../store/payments.js";

/**
 * Who may read a single order:
 * - the customer who placed it
 * - the courier assigned to it (and who holds deliveries:write)
 * - staff who may fulfil orders
 * - service accounts that need to read orders (e.g. the expiration job)
 */
export function mayReadOrder(p: Principal, order: OrderRow): boolean {
  if (order.customer_id === p.subject) return true;
  if (
    order.courier_id === p.subject &&
    p.scopes.includes("deliveries:write")
  ) {
    return true;
  }
  if (p.scopes.includes("orders:fulfil")) return true;
  if (p.kind === "service" && p.scopes.includes("orders:read")) return true;
  return false;
}

/**
 * Who may write (create/cancel) an order on behalf of a customer:
 * - the customer who owns it
 * - a service account (e.g. the order-expiration job)
 */
export function mayWriteOrder(p: Principal, order: OrderRow): boolean {
  if (
    order.customer_id === p.subject &&
    p.scopes.includes("orders:write")
  ) {
    return true;
  }
  if (p.kind === "service" && p.scopes.includes("orders:write")) return true;
  return false;
}

/**
 * Who may perform fulfilment operations (weigh, wash, ready):
 * - staff with the orders:fulfil scope
 */
export function mayFulfilOrder(p: Principal, _order: OrderRow): boolean {
  return p.scopes.includes("orders:fulfil");
}

/**
 * Who may perform delivery operations (pickup, delivery, complete):
 * - the courier assigned to the order
 */
export function mayDeliverOrder(p: Principal, order: OrderRow): boolean {
  return (
    order.courier_id === p.subject && p.scopes.includes("deliveries:write")
  );
}

/**
 * Who may read a payment:
 * - the customer who owns the related order
 * - staff with payments:read
 */
export function mayReadPayment(
  p: Principal,
  _payment: PaymentRow,
  order: OrderRow,
): boolean {
  if (order.customer_id === p.subject && p.scopes.includes("payments:read")) {
    return true;
  }
  if (p.scopes.includes("orders:fulfil") && p.scopes.includes("payments:read")) {
    return true; // staff
  }
  if (p.kind === "service" && p.scopes.includes("payments:read")) return true;
  return false;
}

/**
 * Who may create a payment for an order:
 * - the customer who owns the order
 */
export function mayCreatePayment(p: Principal, order: OrderRow): boolean {
  return (
    order.customer_id === p.subject && p.scopes.includes("payments:write")
  );
}

