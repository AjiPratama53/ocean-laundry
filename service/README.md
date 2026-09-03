# List of Operations and Word Order

| Operation | Served by | Remaining work |
|---|---|---|
| GET /v1/orders/{orderId} | mock | everything |
| GET /v1/packages/{packageId} | mock | everything |
| GET /v1/payments/{paymentId} | mock | everything |
| GET /v1/orders | mock | everything |
| GET /v1/packages | mock | everything |
| POST /v1/orders | mock | everything (unsafe, needs idempotency) |
| POST /v1/orders/{orderId}/pickup | mock | everything |
| POST /v1/orders/{orderId}/weigh | mock | everything |
| POST /v1/orders/{orderId}/wash | mock | everything |
| POST /v1/orders/{orderId}/ready | mock | everything |
| POST /v1/orders/{orderId}/delivery | mock | everything |
| POST /v1/orders/{orderId}/complete | mock | everything |
| POST /v1/payments | mock | everything (unsafe, needs idempotency) |
| POST /v1/packages | mock | everything |
| PATCH /v1/packages/{packageId} | mock | everything |