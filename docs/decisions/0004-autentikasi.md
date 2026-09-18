# 0004: Authorisation

## Context

### Keputusan

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Authorisation server | Keycloak (Docker) | Mendukung refresh rotation + reuse detection |
| Strategi token untuk testing | Test-only signing key lokal | Tidak bergantung pada koneksi ke auth server saat CI |
| Aktor domain | customer, courier, staff, order-expiration-job | Lihat rincian di bawah |

### Aktor domain (OceanLaundry)
- **customer:** membuat order, membayar, membaca order/payment miliknya sendiri
- **courier:** menjemput dan mengantar order yang ditugaskan padanya
- **staff:** menimbang order, mengelola alur cuci (washing/ready), mengelola package
- **order-expiration-job:** confidential client; membatalkan order yang belum dibayar dan sudah timeout.


### Klasifikasi client

| Our client | Runs on | Public/Confidential | Flow | Holds a secret? |
|---|---|---|---|---|
| Mobile Client | Perangkat Customer dan Kurir | Public | Authorization Code + PKCE | Tidak |
| Web Client | Browser Staff | Public | Authorization Code + PKCE | Tidak |
| Job pembatalan order | Server Tim | Confidential | Client Credentials | Ya, di secret manager |
| IoT Client | TBA | TBA | TBA | TBA |
| MCP Client | TBA | TBA | TBA | TBA |

## Decision

Kami menggunakan Keycloak (self-hosted via Docker) sebagai authorisation
server, karena mendukung refresh token rotation dengan reuse detection
(persyaratan wajib di Step 10).

Semua client public (Mobile Client, Web Client) menggunakan Authorization
Code + PKCE tanpa client secret, karena keduanya berjalan di perangkat
pengguna dan tidak bisa menyimpan rahasia dengan aman. Job pembatalan
order berjalan di server tim tanpa pengguna hadir, sehingga diklasifikasikan
sebagai confidential client menggunakan Client Credentials, dengan secret
disimpan di secret manager.

Token untuk automated test dibuat menggunakan test-only signing key lokal,
agar test suite di CI tidak bergantung pada koneksi jaringan ke Keycloak.

## Alternatives considered

- **Hosted auth service** (mis. Auth0) alih-alih Keycloak self-hosted —
  ditolak karena tim ingin kendali penuh atas konfigurasi refresh rotation
  dan reuse detection tanpa bergantung pada batasan paket layanan hosted.
- **Direct grant** pada satu test client alih-alih local signing key untuk
  testing — ditolak karena akan membuat test suite bergantung pada
  ketersediaan jaringan ke Keycloak saat CI berjalan, yang berisiko flaky.

## Consequences

- Tim perlu menjalankan dan memelihara instance Keycloak sendiri (via
  Docker), yang menambah kerja setup dibanding layanan hosted, tapi
  memberi kendali penuh atas pengaturan rotation di Step 10.
- Local signing key untuk testing berarti token asli dari Keycloak tidak
  pernah diuji otomatis di CI; verifikasi rotation dan reuse detection
  (Step 10) tetap harus dilakukan manual terhadap Keycloak yang
  sesungguhnya, seperti dicatat di Step 11a.
- Status IoT Client dan MCP Client belum ditentukan (TBA). Selama belum
  diputuskan, kedua baris ini sebaiknya tidak dianggap final — keputusan
  ini perlu direvisi begitu kedua client tersebut jelas rencananya atau
  dihapus dari cakupan Session 4.
