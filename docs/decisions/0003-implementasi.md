# 0003: Implementasi Hosting dan Indempotency

## Context
Aplikasi Ocean Laundry membutuhkan infrastruktur untuk menjalankan layanan backend dan basis data secara terpusat. Selain itu, endpoint yang berkaitan dengan transaksi pembayaran perlu memiliki mekanisme idempotensi agar request yang sama tidak menyebabkan pembuatan pembayaran lebih dari satu kali, misalnya akibat pengguna melakukan retry atau request dikirim ulang karena masalah jaringan.

Berdasarkan kebutuhan tersebut, diperlukan keputusan mengenai:

1. Provider hosting yang digunakan untuk menjalankan layanan.
2. Mekanisme penyimpanan `Idempotency-Key`.

## Decision

### 1. Hosting Provider

Proyek ini menggunakan **Supabase** sebagai provider untuk layanan basis data PostgreSQL.

Supabase dipilih karena menyediakan PostgreSQL yang dapat langsung digunakan oleh backend, memiliki konfigurasi koneksi yang relatif sederhana, serta menyediakan layanan basis data terkelola sehingga proyek tidak perlu mengelola server database secara manual.

Backend tetap dijalankan sebagai service terpisah dan terhubung ke PostgreSQL yang disediakan oleh Supabase.

### 2. Penyimpanan Idempotency-Key

`Idempotency-Key` disimpan pada tabel khusus `idempotency_keys` di PostgreSQL.

Data yang disimpan meliputi:

* `key` — nilai `Idempotency-Key` dari request.
* `body_hash` — hash dari request body.
* `response_status` — HTTP status dari response pertama.
* `response_body` — response yang dihasilkan oleh request pertama.

Ketika request dengan `Idempotency-Key` diterima, sistem terlebih dahulu mencari key tersebut.

Jika key belum pernah digunakan, request diproses dan hasilnya disimpan.

Jika key sudah digunakan:

* Apabila `body_hash` sama, sistem mengembalikan response yang sebelumnya disimpan.
* Apabila `body_hash` berbeda, sistem mengembalikan `409 Conflict` karena key yang sama digunakan untuk request yang berbeda.

Pendekatan ini dipilih karena menggunakan database yang sudah tersedia pada aplikasi sehingga tidak membutuhkan layanan penyimpanan tambahan.

## Alternatives considered

### 1. Hosting database sendiri

Alternatif yang dipertimbangkan adalah menjalankan PostgreSQL pada server yang dikelola sendiri.

Alternatif ini tidak dipilih karena membutuhkan konfigurasi, pemeliharaan, keamanan, dan pengelolaan server tambahan yang tidak diperlukan untuk kebutuhan proyek saat ini.

### 2. Tidak menggunakan Idempotency-Key

Alternatif lainnya adalah tidak menyimpan `Idempotency-Key` dan langsung memproses setiap request pembayaran.

Alternatif ini tidak dipilih karena request pembayaran dapat dikirim ulang akibat retry atau gangguan jaringan dan berpotensi menyebabkan transaksi yang sama diproses lebih dari satu kali.


## Consequences
Penggunaan Supabase memberikan keuntungan berupa database PostgreSQL terkelola sehingga konfigurasi dan pemeliharaan database menjadi lebih sederhana. Konsekuensinya, aplikasi memiliki ketergantungan terhadap layanan eksternal dan membutuhkan konfigurasi koneksi database yang benar.

Penyimpanan `Idempotency-Key` di PostgreSQL membuat sistem tidak membutuhkan Redis atau storage tambahan. Data idempotensi juga dapat dikelola bersama data aplikasi lainnya. Namun, setiap request yang menggunakan idempotensi memerlukan operasi baca dan tulis tambahan ke database.

Penggunaan `body_hash` memungkinkan sistem membedakan retry request yang sama dengan penggunaan `Idempotency-Key` untuk request yang berbeda. Dengan demikian, request pembayaran yang sama dapat diulang dengan aman tanpa membuat payment baru.