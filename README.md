# Ocean Laundry

## Pengembangan Perangkat Lunak berbasis Platform - KOM - 2026 - PACS262520

Sistem pemesanan laundry berbasis platform

## Anggota & Peran

| Peran             | Nama                                        | Tanggung Jawab                                     |
| ----------------- | ------------------------------------------- | -------------------------------------------------- |
| Contract owner    | Anders Emmanuel Tan (24/541351/PA/22964)   | Meninjau setiap perubahan openapi.yaml             |
| Service owner     | Dhimas Early Oceandy (24/533508/PA/22584) | Deploy, konfigurasi, migrasi, health endpoint      |
| Client owner      | Muhammad Dzaky Ar Rasyid (24/543165/PA/23067)  | Klien pengguna, pelaporan ambiguitas kontrak       |
| Integration owner | Pratama Nanindra Aji (24/533677/PA/22604) | Mock server, contract test, koordinasi Pertemuan 7 |

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

Workflows yang diimplementasikan pada aplikasi web:

| Workflow | Screen | Role Permitted | Operation in openapi.yaml |
|---|---|---|---|
| Staff creates new packages | Packages list | staff | GET /packages |
| | Adds package description | staff | POST /packages |
| | Packages list | staff | GET /packages |
| Staff updates a package | Packages list | staff | GET /packages |
| | Get a specific package | staff | GET /packages/{packageId} |
| | Updates package | staff | PATCH /packages/{packageId} |
| | Packages list | staff | GET /packages |
| Customer creates an order | Packages list | customer | GET /packages |
| | Package details | customer | GET /packages/{packageId} |
| | Create order form | customer | POST /orders |

## Catatan Penyimpanan Sesi (A.3 butir 5)

Sesi otentikasi (JWT Access Token dan Refresh Token) disimpan pada `localStorage` peramban web (`ocean.session`). Keputusan ini diambil agar sesi tetap persisten ketika pengguna membuka tab baru, menyalin URL *deep-link*, atau melakukan *page reload*.

Konsekuensi keamanannya: token yang berada di `localStorage` dapat dibaca oleh skrip JavaScript apa pun yang dieksekusi pada *origin* yang sama (rentan terhadap serangan *Cross-Site Scripting* / XSS). Untuk memitigasi risiko tersebut, masa berlaku token dibatasi (*short-lived access token*), mekanisme *silent refresh* digunakan untuk memperbarui token secara otomatis, dan setiap operasi pada *service* backend diverifikasi secara otoritatif menggunakan *scope* dan *ownership check*.

## Akun Pengujian Presentasi (Session 7 Demonstration)

1. **Staff Outlet**: Memiliki hak akses/scopes `packages:read`, `packages:write`, `orders:read`, `orders:fulfil`.
2. **Customer**: Memiliki hak akses/scopes `packages:read`, `orders:read`, `orders:write`, `payments:write`.