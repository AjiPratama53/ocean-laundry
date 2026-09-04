# Contract changelog
## 2026-30-08 - v0.1.0
Initial contract for OceanLaundry API.
- Resources: Package, Order, Payment (schemas with `required` arrays and
  per-property examples).
- Problem schema with reusable error responses: ValidationError
  (422), Conflict (409), NotFound (404), InternalServerError (500).
- Endpoints:
  - `GET/POST /packages`, `GET/PATCH /packages/{packageId}`
  - `GET/POST /orders` (GET supports `status`, `limit`, `cursor` filters),
    `GET /orders/{orderId}`
  - Order status transitions as sub-resources: `pickup`, `weigh`, `wash`,
    `ready`, `delivery`, `complete`
  - `POST /payments`, `GET /payments/{paymentId}`
- `Idempotency-Key` header (required) on `POST /orders` and `POST /payments`.
- Bearer auth (JWT) declared globally.

## 2026-01-09 - v0.1.1
- Added `description` field to `Order.totalAmount`, `Payment.amount`, and
  `CreatePaymentRequest.amount` clarifying values are in minor unit of IDR.
- Removed non-standard `currency: "IDR"` key from the same fields (not a
  valid JSON Schema keyword; currency is now stated via `description` and also
  the global note in `info.description`).

## 2026-04-09 - v0.2.0
- **BREAKING:** Removed `weighed` from `OrderStatus` enum. This state was
  unreachable in practice, the implementation always transitioned
  directly from `picked_up` to `awaiting_payment` in a single step when
  `POST /orders/{orderId}/weigh` runs (weighing and price calculation
  happen atomically, with no separately observable intermediate state).
  Keeping the value in the contract meant `GET /orders?status=weighed`
  would document a filter that could never match any order.
- Any client filtering `GET /orders?status=weighed` must switch to
  `status=awaiting_payment`.
- Clients storing or comparing raw `status` string values should drop
  any reference to `"weighed"`.