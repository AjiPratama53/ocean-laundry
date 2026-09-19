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

## 2026-04-09 - v0.2.1

- Added `description` field to `Package` resource, schemas, and instances.
- Added `DELETE` method using `DELETE /packages/{packageId}` endpoint for `Package` resource.

## 2026-04-09 - v0.2.2

- Removed `paid` status from orders resource due to redundancy. 
- Added `cancelled` status reachable from `placed` and `awaiting_payments` status.

## 2026-04-09 - v0.2.3
- Added `updatedAt` column in order

## [0.3.0] — 2026-09-19
### Changed — BREAKING
- All `/v1/**` operations now require an access token with the scope
  stated on that operation. Missing/invalid tokens → `401`; wrong
  scope → `403`.

### Added
- `oauth2` security scheme (Authorization Code + PKCE) with eight
  scopes: `packages:read/write`, `orders:read/write/fulfil`,
  `deliveries:write`, `payments:read/write`.
- `clientCredentials` security scheme for the automated cancellation
  job, scoped to `orders:read`/`orders:write` only.
- `401`/`403` responses on every protected operation.
- `updatedAt` field on `Order`, tracking the last status transition.