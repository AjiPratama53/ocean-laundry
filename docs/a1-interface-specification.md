# OceanLaundry API - A1 Interface Specification

Dokumen ini merupakan dokumentasi tertulis untuk spesifikasi antarmuka OceanLaundry API. API menggunakan OpenAPI 3.1.0 dan URI-path versioning dengan versi `v1`.

OceanLaundry merupakan layanan laundry antar-jemput yang menghubungkan customer, kurir, dan staff outlet dalam satu alur: pemilihan paket, penjemputan, penimbangan dan penetapan harga, pembayaran, pencucian, serta pengantaran kembali.

> **Catatan:** `info.version` (`0.1.0`) merupakan versi dokumen OpenAPI, sedangkan `/v1` merupakan versi API pada URL.

---

## 1. Pemodelan Resource — B.1

Resource diturunkan dari kata benda pada domain dan diuji berdasarkan tiga kriteria: **identitas**, **masa hidup**, dan **kemandirian**.

| Kandidat             | Keputusan                       | Alasan                                                                                                                                   |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Package`            | Diterima                        | Memiliki identifier, tetap ada melintasi request, dan dapat diperbarui tanpa membuat ulang entitas lain.                                 |
| `Order`              | Diterima                        | Memiliki identifier, memiliki siklus hidup dari `placed` hingga `completed`, serta status dan atributnya dapat berubah sepanjang proses. |
| `Payment`            | Diterima                        | Memiliki identifier, merupakan catatan transaksi yang tetap ada setelah request selesai, dan memiliki status pembayaran.                 |
| `Customer`           | Diterima sebagai entitas domain | Customer memiliki identitas dan masa hidup yang melintasi banyak request.                                                                |
| `Courier`            | Diterima sebagai entitas domain | Courier merupakan pihak yang memiliki identitas dan terlibat dalam proses pickup/delivery.                                               |
| `Pickup`             | Ditolak sebagai resource utama  | Pickup merupakan transisi/aktivitas terhadap `Order`, sehingga dimodelkan sebagai sub-resource `/orders/{orderId}/pickup`.               |
| `Washing`            | Ditolak sebagai resource utama  | Washing merupakan aktivitas/transisi terhadap `Order`, sehingga dimodelkan sebagai operasi pada order.                                   |
| `Checkout`           | Ditolak                         | Checkout merupakan proses/alur bisnis dan tidak memiliki identitas serta masa hidup mandiri sebagai entitas resource.                    |
| `Home` / `Dashboard` | Ditolak                         | Merupakan representasi tampilan klien, bukan resource domain.                                                                            |

Prinsip yang digunakan adalah resource diturunkan dari domain, sedangkan tampilan aplikasi merupakan komposisi resource oleh klien.

---

## 2. Katalog Error — B.4

OceanLaundry menggunakan format **RFC 9457 Problem Details** dengan media type:

```text
application/problem+json
```

Schema `Problem` mewajibkan field `type`, `title`, `status`, `detail`, dan `instance`. `type` merupakan URI stabil yang menjadi dasar percabangan logika pada klien. `detail` tidak boleh memuat stack trace, SQL query, atau hostname internal.

### 2.1 URI type yang didefinisikan

| URI `type`                                           | Status | Kondisi Pemicu                                                    | Extension Members                                          | Tindakan Klien                                                      |
| ---------------------------------------------------- | -----: | ----------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `https://oceanlaundry.api/problems/validation-error` |  `422` | Request tidak memenuhi validasi.                                  | Tidak ada pada contoh saat ini.                            | Jangan retry otomatis; perbaiki request.                            |
| `https://oceanlaundry.api/problems/conflict`         |  `409` | Request valid tetapi bertentangan dengan state resource saat ini. | Tidak ada pada contoh saat ini.                            | Jangan retry request yang sama tanpa mengubah kondisi.              |
| `https://oceanlaundry.api/problems/not-found`        |  `404` | Resource yang diminta tidak ditemukan.                            | Tidak ada pada contoh saat ini.                            | Jangan retry request yang sama; periksa identifier.                 |
| Internal server error                                |  `500` | Kegagalan berasal dari service.                                   | Belum memiliki contoh `type` pada `openapi.yaml` saat ini. | Retry dengan exponential backoff; jangan tampilkan detail internal. |

### 2.2 Contoh Problem Details

**409 Conflict**

```json
{
  "type": "https://oceanlaundry.api/problems/conflict",
  "title": "Order state conflict",
  "status": 409,
  "detail": "The requested transition is not allowed from the current order status.",
  "instance": "/v1/orders/ord_001"
}
```

**422 Validation Error**

```json
{
  "type": "https://oceanlaundry.api/problems/validation-error",
  "title": "Request validation failed",
  "status": 422,
  "detail": "weightGrams must be greater than 0.",
  "instance": "/v1/orders/ord_001/weigh"
}
```

**404 Not Found**

```json
{
  "type": "https://oceanlaundry.api/problems/not-found",
  "title": "Resource not found",
  "status": 404,
  "detail": "The requested resource was not found.",
  "instance": "/v1/orders/ord_001"
}
```

### 2.3 Kategori kegagalan

| Kategori         | Status Code                       | Tindakan Klien                                                           |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Client fault     | `400`, `401`, `403`, `404`, `422` | Tidak melakukan retry. Perbaiki request atau minta tindakan pengguna.    |
| Domain rejection | `409`, `422`                      | Tidak melakukan retry otomatis. Tampilkan alasan penolakan bila relevan. |
| Server fault     | `500`, `502`, `503`, `504`        | Retry dengan exponential backoff dan jangan tampilkan detail internal.   |

---

## 3. Pernyataan Idempotency — B.3

Method `POST` pada dasarnya tidak idempoten. Pada operasi yang dapat menyebabkan pembuatan data atau efek finansial, OceanLaundry menggunakan `Idempotency-Key`.

### 3.1 Nama header dan format

Header:

```text
Idempotency-Key
```

Formatnya adalah UUID versi 4 dalam bentuk kanonik dengan tanda hubung.

Contoh:

```text
0f7c1b9e-3d21-4a6f-9c05-8e2b7d41a9f0
```

### 3.2 Operasi yang mewajibkan idempotency key

`Idempotency-Key` wajib digunakan pada:

```text
POST /v1/orders
POST /v1/payments
```

Pada `openapi.yaml`, header tersebut didefinisikan sebagai parameter header `required: true`.

### 3.3 Jendela retensi

Server mempertahankan `Idempotency-Key` selama **24 jam**. Key yang digunakan kembali setelah jendela retensi diperlakukan sebagai key baru.

### 3.4 Perilaku penggunaan kembali

| Kondisi                                            | Tindakan Server                                                              | Respons                                                                                                |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Key belum pernah diterima                          | Mencatat key, memproses request, dan menyimpan response.                     | `201 Created`                                                                                          |
| Key sudah diterima dan body identik                | Tidak memproses ulang; mengirimkan kembali response yang tersimpan.          | `201 Created` dengan identifier yang sama                                                              |
| Key sudah diterima tetapi body berbeda             | Menolak request karena key digunakan untuk intent berbeda.                   | `409 Conflict` + Problem Details dengan type `https://oceanlaundry.api/problems/idempotency-key-reuse` |
| Key sudah diterima dan request asal masih diproses | Tidak memproses request dua kali; memberi sinyal agar klien mencoba kembali. | `409` + `Retry-After`                                                                                  |

### 3.5 Ketentuan pembangkitan key

Key dibangkitkan ketika pengguna melakukan konfirmasi intent, kemudian disimpan bersama request yang tertunda dan digunakan kembali sampai request tersebut berhasil.

Key tidak dibangkitkan ulang di dalam fungsi pengiriman jaringan pada setiap retry. Jika key baru dibuat pada setiap percobaan, server akan menganggap setiap retry sebagai request berbeda.

---

## 4. Kebijakan Kompatibilitas — B.5

OceanLaundry menggunakan **URI-path versioning**. Versi API ditempatkan pada URL server sehingga endpoint production menggunakan prefix `/v1/`.

Kriteria kompatibilitas: sebuah perubahan dianggap kompatibel apabila klien yang dibangun sebelum perubahan tersebut, dan tidak mengetahui perubahan tersebut, tetap dapat berfungsi tanpa modifikasi.

### 4.1 Perubahan yang kompatibel

| Perubahan                            | Status              | Ketentuan                                                                                                      |
| ------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Menambahkan field request opsional   | Diizinkan           | Klien lama tetap dapat mengirim request tanpa field tersebut; server menyediakan default/perilaku yang sesuai. |
| Menambahkan field response           | Diizinkan           | Klien lama wajib mengabaikan field response yang tidak dikenal.                                                |
| Menambahkan endpoint                 | Diizinkan           | Bersifat aditif dan tidak mengubah endpoint lama.                                                              |
| Menambahkan query parameter opsional | Diizinkan           | Klien lama tetap dapat menggunakan endpoint tanpa parameter tersebut.                                          |
| Menambahkan nilai enumeration        | Diizinkan bersyarat | Spesifikasi harus menetapkan cara klien menangani nilai enumeration yang belum dikenal.                        |

### 4.2 Perubahan yang tidak kompatibel

Perubahan berikut tidak diperbolehkan pada `v1`:

- Mengubah field request opsional menjadi wajib.
- Menghapus atau mengganti nama field response.
- Mempersempit rentang nilai yang sebelumnya valid.
- Mengubah tipe data field.
- Mengubah makna field tanpa mengubah namanya.

Perubahan tersebut dapat membuat request lama ditolak atau menyebabkan klien menginterpretasikan response secara salah.

### 4.3 Deprecation

Deprecation diumumkan menggunakan header:

```text
Deprecation
Sunset
```

Informasi deprecation juga dicatat dalam spesifikasi.

Ketika sebuah field harus diganti nama, nama baru ditambahkan terlebih dahulu dan nama lama dipertahankan selama masa deprecation. Perubahan yang memutus kompatibilitas harus dilakukan melalui versi API baru.

### 4.4 Field dan enumeration yang tidak dikenal

Klien **MUST ignore unknown response fields**.

Untuk nilai enumeration yang tidak dikenal, klien tidak boleh crash dan harus mengikuti fallback behavior yang ditentukan spesifikasi.

---

## 5. README — Mock Server

### 5.1 Menjalankan Prism Mock Server

Pastikan `openapi.yaml` berada di root repository.

```bash
npx @stoplight/prism-cli mock openapi.yaml
```

Prism mock server berjalan pada:

```text
http://127.0.0.1:4010
```

Buka terminal kedua untuk menjalankan request `curl`.

Karena `openapi.yaml` menggunakan `/v1` pada `servers.url`, path saat pengujian langsung terhadap Prism adalah `/packages`, `/orders`, `/payments`, dan seterusnya.

### 5.2 Contoh curl 1 — GET Orders dengan filter dan pagination

```powershell
curl.exe -i "http://127.0.0.1:4010/orders?status=placed&limit=20" -H "Authorization: Bearer <JWT>"
```

### 5.3 Contoh curl 2 — POST Payment dengan Idempotency-Key

```powershell
curl.exe -i -X POST http://127.0.0.1:4010/payments -H "Authorization: Bearer <JWT>" -H "Idempotency-Key: 0f7c1b9e-3d21-4a6f-9c05-8e2b7d41a9f0" -H "Content-Type: application/json" -d '{"orderId":"ord_001","amount":28000}'
```

Request body:

```json
{
  "orderId": "ord_001",
  "amount": 28000
}
```

### 5.4 Contoh curl 3 — POST Payment tanpa Idempotency-Key

```powershell
curl.exe -i -X POST http://127.0.0.1:4010/payments -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d '{"orderId":"ord_001","amount":28000}'
```

Request ini sengaja tidak menyertakan `Idempotency-Key`. Prism diharapkan menolak request karena header tersebut dideklarasikan sebagai required header pada operasi `POST /payments`.

---

## 6. Bukti B.6 — Langkah 9–10

### Langkah 9 — Request dengan Idempotency-Key

Command yang digunakan:

```powershell
curl.exe -i -X POST http://127.0.0.1:4010/payments -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0." -H "Idempotency-Key: 0f7c1b9e-3d21-4a6f-9c05-8e2b7d41a9f0" -H "Content-Type: application/json" -d '{"orderId":"ord_001","amount":28000}'
```

**Bukti:** tambahkan screenshot terminal hasil request yang berhasil di sini.

### Langkah 10 — Request tanpa Idempotency-Key

Command yang digunakan:

```powershell
curl.exe -i -X POST http://127.0.0.1:4010/payments -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0." -H "Content-Type: application/json" -d '{"orderId":"ord_001","amount":28000}'
```

**Bukti:** tambahkan screenshot terminal yang menunjukkan request ditolak karena header `Idempotency-Key` wajib.

Pengujian ini menunjukkan bahwa requirement idempotency ditegakkan pada level kontrak OpenAPI tanpa memerlukan implementasi service.

---

## 7. Endpoint Utama

| Method  | Endpoint                        | Keterangan                                           |
| ------- | ------------------------------- | ---------------------------------------------------- |
| `GET`   | `/v1/packages`                  | Mengambil daftar package.                            |
| `POST`  | `/v1/packages`                  | Membuat package.                                     |
| `GET`   | `/v1/packages/{packageId}`      | Mengambil detail package.                            |
| `PATCH` | `/v1/packages/{packageId}`      | Memperbarui package.                                 |
| `GET`   | `/v1/orders`                    | Mengambil daftar order dengan filter dan pagination. |
| `POST`  | `/v1/orders`                    | Membuat order dengan idempotency key.                |
| `GET`   | `/v1/orders/{orderId}`          | Mengambil detail order.                              |
| `POST`  | `/v1/orders/{orderId}/pickup`   | Menandai order telah di-pickup.                      |
| `POST`  | `/v1/orders/{orderId}/weigh`    | Menimbang order dan menetapkan harga.                |
| `POST`  | `/v1/orders/{orderId}/wash`     | Memulai proses pencucian.                            |
| `POST`  | `/v1/orders/{orderId}/ready`    | Menandai order siap.                                 |
| `POST`  | `/v1/orders/{orderId}/delivery` | Memulai delivery.                                    |
| `POST`  | `/v1/orders/{orderId}/complete` | Menyelesaikan order.                                 |
| `POST`  | `/v1/payments`                  | Membuat payment dengan idempotency key.              |
| `GET`   | `/v1/payments/{paymentId}`      | Mengambil detail payment.                            |

---

## 8. Catatan

- Monetary amounts direpresentasikan sebagai integer dalam minor unit dari currency yang digunakan.
- Timestamp menggunakan format RFC 3339/date-time.
- Identifier bersifat opaque dan tidak bergantung pada auto-increment database.
- Status order menggunakan enumeration yang didefinisikan pada schema.
- Klien wajib mengabaikan response fields yang tidak dikenal.
- Mock server dipertahankan sebagai kontrak awal sampai service tersedia sehingga klien dapat berpindah antara mock dan implementasi hanya dengan mengganti base URL.
