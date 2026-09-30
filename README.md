# Ocean Laundry

## Pengembangan Perangkat Lunak berbasis Platform - KOM - 2026 - PACS262520

Sistem pemesanan laundry berbasis platform

## Anggota & Peran

| Peran             | Nama                                        | Tanggung Jawab                                     |
| ----------------- | ------------------------------------------- | -------------------------------------------------- |
| Contract owner    | Anders Emmanuel Tan (24/541351/PA/22964)   | Meninjau setiap perubahan openapi.yaml             |
| Service owner     | Muhammad Dzaky Ar Rasyid (24/543165/PA/23067)| Deploy, konfigurasi, migrasi, health endpoint      |
| Client owner      | Pratama Nanindra Aji (24/533677/PA/22604) | Klien pengguna, pelaporan ambiguitas kontrak       |
| Integration owner | Dhimas Early Oceandy (24/533508/PA/22584)  | Mock server, contract test, koordinasi Pertemuan 7 |

## Planned Clients & Constraints

| Klien | Kemampuan menyimpan rahasia | Ketersediaan Jaringan | Anggaran latensi | Batas sumber daya | Kehadiran manusia |
|---|---|---|---|---|---|
| Customer | Tidak, HP pribadi, kredensial tidak bisa disembunyikan dari pemilik perangkat | Intermiten, terutama saat konfirmasi & bayar | Ketat saat pembayaran, longgar saat browsing katalog | HP pribadi, baterai & kuota jadi pertimbangan | Ya, membaca nota, memutuskan bayar/batal |
| Kurir | Tidak, HP lapangan, bisa hilang/dipinjamkan | Sering terputus, bergerak di jalan/area penjemputan | Sedang, status perlu tersinkron cepat tapi tetap toleran delay | HP lapangan, baterai/kuota dijaga sepanjang shift | Ya, menafsirkan alamat, bertindak sendiri |
| Staff | Ya, perangkat tetap di outlet | Selalu tersedia, karena lokasi tetap | Longgar, proses manual, tak dibatasi ketat | Perangkat tetap (workstation/tablet outlet, dll) | Ya, menafsirkan hasil timbang, tentukan harga |

**Kesimpulan per klien:**

- **Customer:** Karena customer bisa membayar dari lokasi dengan jaringan tidak stabil, klien ini
  butuh *durable mutation queue* untuk order tertunda dan *idempotency key* wajib pada operasi
  pembayaran, agar retry akibat koneksi putus tidak menagih dua kali.
- **Kurir:** Karena kurir sering kehilangan sinyal di lapangan, klien ini butuh *durable mutation
  queue* untuk konfirmasi penjemputan/pengantaran, dan *idempotency key* pada perubahan status
  pesanan agar retry tidak menghasilkan status ganda.
- **Staff:** Karena staff selalu terhubung dari outlet, klien ini tidak perlu offline queue, tapi
  input harga tetap perlu dilindungi dari pengiriman ganda jika staff menekan tombol simpan
  berulang kali.

## Workflow Table

Workflows yang diimplementasikan pada aplikasi web (satu URL per workflow, A.2.1).
Setiap baris last-column menamai operasi yang benar-benar ada di `openapi.yaml`.
Navigasi berbeda per role adalah UX saja (A.2.2) — service tetap satu-satunya
penegak via scope + ownership (401/403/404 dibedakan, A.3; console attack, A.9).

| Workflow | Screen (URL) | Role permitted | Operation in openapi.yaml |
|---|---|---|---|
| Staff kelola katalog | Daftar paket (`/staff/packages`) | staff | GET /packages |
| | Tambah paket (dialog) | staff | POST /packages |
| | Ubah paket (dialog, If-Match) | staff | PATCH /packages/{packageId} |
| | Hapus paket (dialog, If-Match) | staff | DELETE /packages/{packageId} |
| Customer pesan & bayar | Katalog (`/customer/catalogue`) | customer | GET /packages |
| | Detail paket | customer | GET /packages/{packageId} |
| | Buat order (`/customer/orders/new`, Idempotency-Key) | customer | POST /orders |
| | Lacak order (`/customer/orders/:id`) | customer | GET /orders/{id} |
| | Bayar (`/customer/payments/new`, Idempotency-Key) | customer | POST /payments |
| | Nota bayar (`/customer/payments/:id`) | customer | GET /payments/{paymentId} |
| Staff fulfilment | Antrian (`/staff/orders?status=picked_up`) | staff | GET /orders |
| | Timbang (If-Match) | staff | POST /orders/{orderId}/weigh |
| | Mulai cuci (If-Match) | staff | POST /orders/{orderId}/wash |
| | Tandai siap (If-Match) | staff | POST /orders/{orderId}/ready |
| Kurir antar-jemput | Penjemputan (`/courier/pickups`) | courier | GET /orders |
| | Pickup (If-Match) | courier | POST /orders/{orderId}/pickup |
| | Pengantaran (`/courier/deliveries`) | courier | GET /orders |
| | Mulai antar (If-Match) | courier | POST /orders/{orderId}/delivery |
| | Selesai (If-Match) | courier | POST /orders/{orderId}/complete |

Calls per screen: daftar = 1 (GET list, conditional + 304), detail = 2
maks (GET entity + GET paket untuk nama). Token dilampirkan di satu tempat
(`src/lib/api.ts`); base URL dari `VITE_API_BASE_URL`.

## Deployed Application URL

Aplikasi telah dideploy dan dapat diakses publik pada:
- **Web Application URL:** https://ocean-laundry-eosin.vercel.app/
- **Backend API Base URL:** kend: ocean-laundry-backend-production.up.railway.app/
- **Keycloak URL:** https://ocean-laundry-production.up.railway.app/

## Catatan Penyimpanan Sesi (A.3 butir 5)

Sesi otentikasi (JWT Access Token dan Refresh Token) disimpan pada `localStorage` peramban web (`ocean.session`). Keputusan ini diambil agar sesi tetap persisten ketika pengguna membuka tab baru, menyalin URL *deep-link*, atau melakukan *page reload*.

Konsekuensi keamanannya: token yang berada di `localStorage` dapat dibaca oleh skrip JavaScript apa pun yang dieksekusi pada *origin* yang sama (rentan terhadap serangan *Cross-Site Scripting* / XSS). Untuk memitigasi risiko tersebut, masa berlaku token dibatasi (*short-lived access token*), mekanisme *silent refresh* digunakan untuk memperbarui token secara otomatis, dan setiap operasi pada *service* backend diverifikasi secara otoritatif menggunakan *scope* dan *ownership check*.

## Akun Pengujian Presentasi & Pengujian Mandiri (Session 7)

Sesuai ketentuan tugas (grader dapat menguji alur secara mandiri tanpa bantuan pengembang), gunakan akun uji berikut:

| Peran | Username | Password | Scopes yang Dimiliki |
|---|---|---|---|
| **Customer A** | `customer-a` | `anders1729` | `packages:read`, `orders:read`, `orders:write`, `payments:read`, `payments:write` |
| **Customer B** | `customer-b` | `anders1729` | `packages:read`, `orders:read`, `orders:write`, `payments:read`, `payments:write` |
| **Staff Outlet A** | `staff-a` | `anders1729` | `packages:read`, `packages:write`, `orders:read`, `orders:fulfil`, `payments:read` |
| **Staff Outlet B** | `staff-b` | `anders1729` | `packages:read`, `packages:write`, `orders:read`, `orders:fulfil`, `payments:read` |
| **Kurir A** | `courier-a` | `anders1729` | `orders:read`, `deliveries:write` |
| **Kurir B** | `courier-b` | `anders1729` | `orders:read`, `deliveries:write` |

> **Catatan Pengujian:**
> 1. Akun **Customer** dapat menelusuri katalog, membuat pesanan baru, melacak status pesanan secara live, dan melakukan pembayaran nota.
> 2. Akun **Staff** dapat mengelola katalog paket, menimbang cucian (`POST /orders/{id}/weigh`), mencuci (`POST /orders/{id}/wash`), dan menandai cucian siap diambil (`POST /orders/{id}/ready`).
> 3. Akun **Kurir** dapat mengambil cucian kotor dari customer (`POST /orders/{id}/pickup`), mengantar cucian bersih (`POST /orders/{id}/delivery`), dan menyelesaikan pengantaran (`POST /orders/{id}/complete`).
> 4. Token akses JWT dapat diakses langsung pada console peramban via `window.__ocean.token()` untuk pengujian console attack (A.9).
>
> **Penting — enforcement scope di Keycloak:** client `test-cli` wajib `Full scope allowed = OFF`
> dengan role `customer`/`staff`/`courier` yang dipetakan ke client-scope sesuai tabel di atas
> (`infra/keycloak/ocean-laundry-realm.json`: `scopeMappings` + `groups`). Kalau full-scope ON,
> setiap login mendapat semua 8 scope dan seluruh pembatasan menu/tombol + otorisasi service bocor.
> `--import-realm` tidak menimpa realm yang sudah ada, jadi untuk Keycloak live (Railway) lakukan
> manual via Admin Console: Clients → `test-cli` → Scope → Full scope allowed OFF; Realm roles →
> buat `customer`/`staff`/`courier`; Client scopes → tiap scope domain → Assign to roles sesuai tabel;
> Groups → `/customers`, `/staffs`, `/couriers` → beri role masing-masing; Users → masukkan
> 6 akun uji ke group-nya. Lalu re-export realm dan commit agar repo = live.
