# Object Ownership (Layer 3)

Layer 1 (valid JWT) and Layer 2 (required scope) are enforced by `authenticate` and `requireScope`.  
Layer 3 is enforced inside route handlers using the predicates in `src/auth/ownership.ts`.

| Resource | Operation | Ownership / assignment rule |
|---|---|---|
| `Order` | `getOrder` | owner customer, assigned courier, staff with `orders:fulfil`, or service account with `orders:read` |
| `Order` | `getOrders` | filtered by caller role: customers see their own, couriers see assigned, staff/service see all |
| `Order` | `createOrder` | only end-users; `customerId` in the body must equal the token subject |
| `Order` | `cancelOrder` | owner customer or `order-expiration-job` service account |
| `Order` | `pickupOrder`, `startDelivery`, `completeDelivery` | assigned courier with `deliveries:write` |
| `Order` | `weighOrder`, `startWashing`, `markOrderReady` | staff with `orders:fulfil` |
| `Payment` | `getPayment` | owner customer of the related order, or staff with `payments:read` |
| `Payment` | `createPayment` | owner customer of the related order |

A missing resource and an ownership denial return the same `404 Not Found` response so the API does not leak existence information.

# Logging & Token Redaction

The service uses `pino` and `pino-http` for structured logging.  
`LOG_LEVEL` (default `info`) controls verbosity.

Sensitive values are redacted from every log line, including:

- `Authorization` request header
- `Cookie` request header
- any nested `accessToken`, `refreshToken`, `access_token`, `refresh_token`, `token`, `password`, or `cookie` field

The raw access token and refresh token therefore never appear in application logs.  
Always use `req.log` (inside handlers) or the shared `logger` (elsewhere) instead of `console.*`.

# List of Operations and Word Order

| Operation | Served by | Remaining work |
|---|---|---|
| GET /v1/orders/{orderId} | handler | done |
| GET /v1/packages/{packageId} | handler | done |
| GET /v1/payments/{paymentId} | handler | done |
| GET /v1/orders | handler | done |
| GET /v1/packages | handler | done |
| POST /v1/orders | handler | done (with idempotency key + ownership) |
| POST /v1/orders/{orderId}/pickup | handler | done |
| POST /v1/orders/{orderId}/weigh | handler | done |
| POST /v1/orders/{orderId}/wash | handler | done |
| POST /v1/orders/{orderId}/ready | handler | done |
| POST /v1/orders/{orderId}/delivery | handler | done |
| POST /v1/orders/{orderId}/complete | handler | done |
| POST /v1/payments | handler | done (with idempotency key + ownership) |
| POST /v1/packages | handler | done |
| PATCH /v1/packages/{packageId} | handler | done |


# Scope Vocabulary 
### Actors
- **customer:** membuat dan membayar order, melihat order/pembayaran miliknya sendiri
- **courier:** mengambil dan mengantarkan order yang ditugaskan padanya
- **staff:** mengelola package dan menjalankan alur pencucian (timbang/cuci/siap)
- **order-expiration-job:** confidential client; membatalkan order yang belum dibayar dan sudah timeout

### Scope

| Scope | Mengizinkan | Customer | Courier | Staff | Job |
|---|---|---|---|---|---|
| `packages:read` | Melihat daftar package | ya | - | ya | - |
| `packages:write` | Membuat/mengubah/menghapus package | - | - | ya | - |
| `orders:read` | Membaca order yang terlihat oleh pemanggil | ya | ya | ya | ya |
| `orders:write` | Membuat dan membatalkan order milik sendiri | ya | - | - | ya |
| `orders:fulfil` | Menimbang, memulai cuci, menandai siap | - | - | ya | - |
| `deliveries:write` | Mengambil dan mengantarkan order | - | ya | - | - |
| `payments:read` | Membaca data pembayaran | ya | - | ya | - |
| `payments:write` | Membuat pembayaran | ya | - | - | - |

### Pemetaan operation dan scope

| Operation | Scope |
|---|---|
| `getPackages` | `packages:read` |
| `createPackage`, `updatePackage`, `deletePackage` | `packages:write` |
| `getOrders`, `getOrder` | `orders:read` |
| `createOrder`, `cancelOrder` | `orders:write` |
| `pickupOrder`, `startDelivery`, `completeDelivery` | `deliveries:write` |
| `weighOrder`, `startWashing`, `markOrderReady` | `orders:fulfil` |
| `createPayment` | `payments:write` |
| `getPayment` | `payments:read` |
