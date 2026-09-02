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