import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pino from "pino";
import {
  mayReadOrder,
  mayWriteOrder,
  mayFulfilOrder,
  mayDeliverOrder,
  mayReadPayment,
  mayCreatePayment,
} from "../src/auth/ownership.js";
import type { Principal } from "../src/auth/principal.js";
import type { OrderRow } from "../src/store/orders.js";
import type { PaymentRow } from "../src/store/payments.js";

const redactConfig = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "request.headers.authorization",
    "request.headers.cookie",
    "*.authorization",
    "*.cookie",
    "*.accessToken",
    "*.refreshToken",
    "*.access_token",
    "*.refresh_token",
    "*.token",
    "*.password",
  ],
  censor: "[Redacted]",
};

function runLoggerRedactionTest() {
  const chunks: string[] = [];
  const dest = {
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
  };
  const logger = pino({ level: "info", redact: redactConfig }, dest);

  const secretToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret";
  const secretCookie = "session=abc123; refresh=supersecret";
  const secretAccess = "access-secret-123";
  const secretRefresh = "refresh-secret-456";

  logger.info({
    req: {
      headers: {
        authorization: secretToken,
        cookie: secretCookie,
      },
    },
    body: {
      accessToken: secretAccess,
      refreshToken: secretRefresh,
      password: "hunter2",
    },
  }, "incoming request");

  const line = chunks.join("").trim();

  assert(line.includes(secretToken) === false, "Authorization token leaked");
  assert(line.includes(secretCookie) === false, "Cookie value leaked");
  assert(line.includes(secretAccess) === false, "accessToken leaked");
  assert(line.includes(secretRefresh) === false, "refreshToken leaked");
  assert(line.includes("hunter2") === false, "password leaked");
  assert(line.includes("[Redacted]") === true, "Redaction marker missing");
  console.log("OK logger redaction");
  console.log("Sample redacted log:", line);
}

function makePrincipal(subject: string, kind: Principal["kind"], scopes: string[]): Principal {
  return { subject, kind, scopes };
}

function makeOrder(overrides?: Partial<OrderRow>): OrderRow {
  return {
    id: "order-1",
    customer_id: "customer-1",
    courier_id: null,
    package_id: "package-1",
    pickup_address: "Jl. Mawar",
    status: "placed",
    weight_grams: null,
    total_amount: null,
    created_at: new Date(),
    updated_at: null,
    ...overrides,
  } as OrderRow;
}

function makePayment(overrides?: Partial<PaymentRow>): PaymentRow {
  return {
    id: "payment-1",
    order_id: "order-1",
    amount: 50000,
    status: "pending",
    created_at: new Date(),
    ...overrides,
  } as PaymentRow;
}

function runOwnershipTests() {
  const customer = makePrincipal("customer-1", "user", ["orders:write", "orders:read", "payments:read", "payments:write"]);
  const otherCustomer = makePrincipal("customer-2", "user", ["orders:write", "orders:read", "payments:write"]);
  const assignedCourier = makePrincipal("courier-1", "user", ["deliveries:write"]);
  const otherCourier = makePrincipal("courier-2", "user", ["deliveries:write"]);
  const staff = makePrincipal("staff-1", "user", ["orders:fulfil", "orders:read", "payments:read"]);
  const serviceReader = makePrincipal("order-expiration-job", "service", ["orders:read"]);
  const serviceWriter = makePrincipal("order-expiration-job", "service", ["orders:write"]);

  const order = makeOrder();
  const assignedOrder = makeOrder({ courier_id: "courier-1" });

  assert.equal(mayReadOrder(customer, order), true, "customer reads own order");
  assert.equal(mayReadOrder(otherCustomer, order), false, "other customer cannot read order");
  assert.equal(mayReadOrder(assignedCourier, assignedOrder), true, "assigned courier reads order");
  assert.equal(mayReadOrder(otherCourier, assignedOrder), false, "unassigned courier cannot read order");
  assert.equal(mayReadOrder(staff, order), true, "staff reads any order");
  assert.equal(mayReadOrder(serviceReader, order), true, "service reader reads order");
  assert.equal(mayReadOrder(serviceWriter, order), false, "service writer without orders:read cannot read order");

  assert.equal(mayWriteOrder(customer, order), true, "customer writes own order");
  assert.equal(mayWriteOrder(otherCustomer, order), false, "other customer cannot write order");
  assert.equal(mayWriteOrder(serviceWriter, order), true, "service writer writes order");
  assert.equal(mayWriteOrder(serviceReader, order), false, "service reader cannot write order");

  assert.equal(mayFulfilOrder(staff, order), true, "staff fulfils order");
  assert.equal(mayFulfilOrder(customer, order), false, "customer cannot fulfil order");

  assert.equal(mayDeliverOrder(assignedCourier, assignedOrder), true, "assigned courier delivers order");
  assert.equal(mayDeliverOrder(otherCourier, assignedOrder), false, "other courier cannot deliver order");
  assert.equal(mayDeliverOrder(assignedCourier, order), false, "courier cannot deliver unassigned order");

  const payment = makePayment();

  assert.equal(mayReadPayment(customer, payment, order), true, "customer reads own payment");
  assert.equal(mayReadPayment(otherCustomer, payment, order), false, "other customer cannot read payment");
  assert.equal(mayReadPayment(staff, payment, order), true, "staff reads any payment");

  assert.equal(mayCreatePayment(customer, order), true, "customer creates payment for own order");
  assert.equal(mayCreatePayment(otherCustomer, order), false, "other customer cannot create payment");
  assert.equal(mayCreatePayment(staff, order), false, "staff cannot create payment");

  console.log("OK ownership predicates");
}

runLoggerRedactionTest();
runOwnershipTests();
console.log("All verification tests passed.");

