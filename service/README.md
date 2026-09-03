# List of Operations and Word Order

| Operation | Served by | Remaining work |
|---|---|---|
| GET /v1/orders/{orderId} | mock | done |
| GET /v1/packages/{packageId} | mock | done |
| GET /v1/payments/{paymentId} | mock | done |
| GET /v1/orders | mock | done |
| GET /v1/packages | mock | done |
| POST /v1/orders | mock | done (with idempotency key) |
| POST /v1/orders/{orderId}/pickup | mock | done |
| POST /v1/orders/{orderId}/weigh | mock | in progress |
| POST /v1/orders/{orderId}/wash | mock | everything |
| POST /v1/orders/{orderId}/ready | mock | everything |
| POST /v1/orders/{orderId}/delivery | mock | everything |
| POST /v1/orders/{orderId}/complete | mock | everything |
| POST /v1/payments | mock | done (with idempotency key) |
| POST /v1/packages | mock | require testing |
| PATCH /v1/packages/{packageId} | mock | require testing |