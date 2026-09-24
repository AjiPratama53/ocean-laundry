# 0004: Autentikasi dan Kontrol Akses (Authentication & Access Control)

## Context

Layanan Ocean Laundry memerlukan mekanisme autentikasi dan otorisasi (access control) yang memisahkan secara tegas tiga lapis pengecekan akses:

1. **Layer 1 (Authentication):** Memvalidasi JWT access token (tanda tangan via JWKS, masa berlaku `exp`, penerbit `iss`, dan audiens `aud`), kemudian menyusun objek `req.principal`. Jika token tidak ada atau tidak valid, request ditolak dengan `401 Unauthorized` sebelum menyentuh basis data.
2. **Layer 2 (Scope Authorization):** Memastikan token pemanggil membawa scope yang dipersyaratkan oleh operasi OpenAPI. Jika scope tidak sesuai, request ditolak dengan `403 Forbidden` (`insufficient_scope`) sebelum objek dimuat dari database.
3. **Layer 3 (Object Ownership):** Memeriksa hubungan kepemilikan antara objek database dan pemanggil di dalam handler. Jika objek tidak ada atau bukan milik pemanggil, keduanya menghasilkan respon `404 Not Found` yang identik agar tidak membocorkan keberadaan data (anti-enumeration).

### 1. Keputusan Server Otorisasi dan Konfigurasi

| Keputusan              | Pilihan                                        | Alasan & Pertimbangan                                                                                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Authorisation server   | Keycloak (Docker / Self-hosted)                | Mendukung OpenID Connect standard serta refresh token rotation dengan reuse detection (Step 10)                    |
| Strategi token testing | Test-only signing key lokal (in-process JWKS)  | Menjamin pipeline CI mandiri, cepat, stabil, dan tidak bergantung pada ketersediaan jaringan ke Keycloak eksternal |
| Domain actors          | customer, courier, staff, order-expiration-job | Diturunkan dari proses bisnis Ocean Laundry pada openapi.yaml                                                      |

### 2. Klasifikasi Klien (Step 1)

Setiap aplikasi diklasifikasikan berdasarkan kemampuannya menyimpan rahasia:

| Our client                           | Runs on                                 | Public / Confidential | Flow                      | Holds a secret?       |
| ------------------------------------ | --------------------------------------- | --------------------- | ------------------------- | --------------------- |
| Mobile Client (Customer & Courier)   | Perangkat pribadi pengguna (smartphone) | Public                | Authorization Code + PKCE | Tidak                 |
| Web Client (Staff Outlet)            | Browser pengguna                        | Public                | Authorization Code + PKCE | Tidak                 |
| Scheduled Job (Order Expiration Job) | Server tim / backend background worker  | Confidential          | Client Credentials        | Ya, di secret manager |

Klien publik (Mobile & Web) dilarang menyimpan client secret dan wajib menggunakan flow Authorization Code dengan S256 PKCE code challenge. Token tidak pernah diletakkan pada URL/query parameter dan disimpan di memori atau HttpOnly secure cookie.

### 3. Scope Vocabulary (Step 2)

Scope dirancang berdasarkan kapabilitas aktor domain (bukan 1:1 per endpoint):

| Scope              | Mengizinkan                                             | Customer | Courier | Staff | Job |
| ------------------ | ------------------------------------------------------- | -------- | ------- | ----- | --- |
| `packages:read`    | Melihat daftar paket layanan laundry                    | Ya       | -       | Ya    | -   |
| `packages:write`   | Menambah, mengubah, dan menghapus paket laundry         | -        | -       | Ya    | -   |
| `orders:read`      | Membaca detail dan daftar pesanan                       | Ya       | Ya      | Ya    | Ya  |
| `orders:write`     | Membuat pesanan baru dan membatalkan pesanan            | Ya       | -       | -     | Ya  |
| `orders:fulfil`    | Operasi laundry di outlet (timbang, cuci, siap diambil) | -        | -       | Ya    | -   |
| `deliveries:write` | Penjemputan dan pengantaran pesanan oleh kurir          | -        | Ya      | -     | -   |
| `payments:read`    | Membaca catatan pembayaran pesanan                      | Ya       | -       | Ya    | -   |
| `payments:write`   | Melakukan pembayaran pesanan, Membatalkan pembayaran    | Ya       | -       | Ya    | Ya  |

Pemetaan operasi OpenAPI ke scope:

- `getPackages` → `packages:read`
- `createPackage`, `updatePackage`, `deletePackage` → `packages:write`
- `getOrders`, `getOrder` → `orders:read`
- `createOrder`, `cancelOrder` → `orders:write`
- `pickupOrder`, `startDelivery`, `completeDelivery` → `deliveries:write`
- `weighOrder`, `startWashing`, `markOrderReady` → `orders:fulfil`
- `createPayment` → `payments:write`
- `getPayment` → `payments:read`

### 4. Strategi Token untuk Automated Tests (Step 11a)

Automated test suite menggunakan strategi _local test key_:

- Test suite men-generate pasangan kunci RS256 secara in-memory saat pengujian dimulai.
- Mini HTTP server lokal menyajikan public key dalam format JWKS (`http://127.0.0.1:<port>/jwks.json`).
- `OIDC_ISSUER`, `OIDC_AUDIENCE`, dan `OIDC_JWKS_URI` diarahkan ke server in-process ini selama test berjalan.
- Hal ini membuat pengujian di CI berjalan terisolasi tanpa latensi jaringan atau ketergantungan pada container Keycloak yang berat.

### 5. Bukti Refresh Token Rotation & Reuse Detection (Step 10)

Pengaturan diaktifkan pada Keycloak:

- **Revoke Refresh Token:** ON
- **Refresh Token Max Reuse:** 0

Bukti eksekusi rotasi dan deteksi reuse:

1. **Pertukaran refresh token RT1 menghasilkan RT2 yang baru:**
   ```bash
   RT2=$(curl -s -X POST "$ISSUER/protocol/openid-connect/token" \
     -d grant_type=refresh_token -d client_id=web -d refresh_token="$RT1" | jq -r .refresh_token)
   [ "$RT1" != "$RT2" ] && echo "rotation is working"
   # Output: rotation is working
   ```
2. **Penggunaan kembali RT1 yang sudah usang langsung ditolak:**
   ```json
   {
     "error": "invalid_grant",
     "error_description": "Maximum allowed refresh token reuse exceeded"
   }
   ```
3. **RT2 kini juga ditolak karena seluruh token family / sesi telah dicabut akibat deteksi reuse:**
   ```json
   {
     "error": "invalid_grant",
     "error_description": "Session doesn't have required client"
   }
   ```

## Decision

1. Menggunakan Keycloak sebagai Authorization Server terpusat dengan OIDC RS256 JWT tokens.
2. Memisahkan 3 lapis pemeriksaan:
   - Middleware `authenticate` memverifikasi token dan menetapkan `req.principal`.
   - Middleware `requireScope(scope)` memastikan ketersediaan scope sebelum operasi dijalankan.
   - Fungsi predikat kepemilikan (`ownership.ts`) memeriksa izin akses terhadap objek database di dalam route handler.
3. Respon untuk "data tidak ada" dan "bukan milik pemanggil" diseragamkan menghasilkan respon `404 Not Found` dengan payload Problem Details yang identik (anti-enumeration).
4. Melakukan redaksi otomatis pada layer logger (Pino) terhadap header `Authorization`, cookie, dan properti token/kata sandi sehingga credential tidak pernah tercatat ke log.
5. Menjalankan pipeline CI di GitHub Actions yang memvalidasi kontrak (`npm run test:contract`) dan seluruh pengujian otorisasi (`npm run test:authz`) pada setiap commit/push.

## Alternatives Considered

1. **Hosted Auth0 / Cognito vs Self-hosted Keycloak:**
   - Ditolak karena Keycloak Docker memberikan kendali penuh terhadap konfigurasi refresh token rotation dan zero-reuse policy tanpa batasan tier/pricing.
2. **Direct Grant ke Auth Server pada CI Tests vs In-process JWKS Server:**
   - Ditolak karena pengujian CI yang bergantung pada service eksternal rentan mengalami network timeout, flakiness, dan proses startup yang lambat. Local test keypair menjamin tes deterministik.
3. **Mengembalikan `403 Forbidden` saat Objek Milik Pengguna Lain:**
   - Ditolak karena pembedaan kode status antara 403 (ada tapi bukan milikmu) dan 404 (tidak ada) memungkinkan penyerang melakukan enumerasi resource ID yang valid.

## Consequences

- Arsitektur keamanan terstruktur dengan pemisahan tanggung jawab yang jelas antar file (`authenticate.ts`, `require-scope.ts`, `ownership.ts`).
- Pengembang harus memastikan setiap handler baru yang memuat objek selalu memanggil predikat `ownership.ts` sebelum mengirimkan respon.
- Automated tests di CI dapat berjalan sangat cepat (< 5 detik) dan stabil karena tidak membutuhkan eksekusi container Keycloak saat test suite berjalan.
