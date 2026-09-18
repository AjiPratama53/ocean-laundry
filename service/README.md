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
| POST /v1/orders/{orderId}/weigh | mock | done |
| POST /v1/orders/{orderId}/wash | mock | done |
| POST /v1/orders/{orderId}/ready | mock | done |
| POST /v1/orders/{orderId}/delivery | mock | done |
| POST /v1/orders/{orderId}/complete | mock | done |
| POST /v1/payments | mock | done (with idempotency key) |
| POST /v1/packages | mock | done |
| PATCH /v1/packages/{packageId} | mock | done |


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
| `orders:read` | Membaca order yang terlihat oleh pemanggil | ya | ya | ya | - |
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
