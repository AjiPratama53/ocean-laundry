# Ocean Laundry

## Pengembangan Perangkat Lunak berbasis Platform - KOM - 2026 - PACS262520

Sistem pemesanan laundry berbasis platform

## Anggota & Peran

| Peran             | Nama                                        | Tanggung Jawab                                     |
| ----------------- | ------------------------------------------- | -------------------------------------------------- |
| Contract owner    | Dhimas Early Oceandy (24/533508/PA/22584)   | Meninjau setiap perubahan openapi.yaml             |
| Service owner     | Muhammad Dzaky Ar Rasyid(24/543165/PA/23067)| Deploy, konfigurasi, migrasi, health endpoint      |
| Client owner      | Pratama Nanindra Aji (24/533677/PA/22604)   | Klien pengguna, pelaporan ambiguitas kontrak       |
| Integration owner | Anders Emmanuel Tan (24/541351/PA/22964)    | Mock server, contract test, koordinasi Pertemuan 7 |

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

  Work flows:

| Workflow | Screen | Role Permitted | Operation in openapi.yaml |
|---|---|---|---|
| Staff creates new packages | Packages list | staff | GET /packages |
| | Adds package description | staff | POST /packages |
| | Packages list | staff | GET /packages |
| Staff updates a package | Packages list | staff | GET /packages |
| | Edits package details | staff | PUT /packages/{id} |
| | Packages list | staff | GET /packages |
| Customer creates an order | Packages list | customer | GET /packages |
| | Package details | customer | GET /packages/{id} |
| | Create order form | customer | POST /orders |
| Courier delivers the order to staff | Orders list | courier | GET /orders |
| | Order details | courier | PUT /orders/{id}/pickup |
| Staff processes the order | Order details | staff | PUT /orders/{id}/weigh |
| | Order details | staff | PUT /orders/{id}/start-wash |
| | Order details | staff | PUT /orders/{id}/ready |
| Staff process the payment for an order | Orders list | staff | GET /orders/{id} |
| | Payment form | staff | POST /payments |
| | Payment details | staff | PUT /payments/{id}/status |
| Courier delivers the order to customer | Order details | courier | PUT /orders/{id}/start-delivery |
| | Order details | courier | PUT /orders/{id}/complete-delivery |