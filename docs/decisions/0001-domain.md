# 0001: Domain Selection

## Context
Kelompok perlu memilih domain yang memenuhi empat syarat wajib
(≥3 aktor, ≥1 operasi unsafe konsekuensial, ≥1 aktor di luar
jangkauan konektivitas andal, cakupan satu alur kerja utuh).

## Decision
Customer memilih paket layanan dari katalog dan mengonfirmasi pesanan, kemudian order dibuat dan alamat penjemputan diteruskan ke kurir. Kurir menuju lokasi customer untuk mengambil laundry dan menyerahkannya ke staff laundry. Staff menimbang laundry, dan sistem akan menetapkan harga dan mengirim nota ke customer, yang kemudian customer akan melakukan pembayaran. Setelah pencucian selesai, staff mengirim notifikasi dan kurir mengantarkan kembali laundry ke customer. Proses dapat gagal apabila kurir kehilangan koneksi saat konfirmasi penjemputan/pengantaran atau koneksi customer terputus di tengah transaksi pembayaran.

- **Syarat 1:  Minimal tiga aktor dengan hak akses berbeda** \
Terpenuhi, Terdapat tiga actor: customer, kurir, dan staff laudry yang memiliki hak akses yang berbeda

- **Syarat 2: Minimal satu operasi unsafe dan konsekuensial** \
Terpenuhi, Pembayaran oleh customer merupakan operasi tidak aman dan harus menjamin idempotensi (agar customer tidak berisiko membayar lebih dari satu kali untuk order yang sama)

- **Syarat 3:  Minimal satu aktor bekerja di luar jangkauan konektivitas andal** \
Terpenuhi, terdapat dua actor yaitu kurir dan customer. Kurir berpindah lokasi fisik saat penjemputan dan pengantaran, sehingga rawan kehilangan sinyal. Customer juga dapat berada di lokasi dengan jaringan tidak stabil tepat pada saat melakukan pembayaran

- **Syarat 4: Cakupan cukup kecil, satu alur kerja utuh** \
Terpenuhi, Paragraf domain mencakup satu siklus penuh: pemilihan paket -> konfirmasi order -> penjemputan -> penimbangan & penetapan harga -> pembayaran -> pencucian -> pengantaran kembali dan alur tidak bercabang sehingga menjadi lebih kompleks.


## Alternatives considered
- **Aplikasi pemesanan food court.** \
Ditolak karena terlalu mirip dengan studi kasus KANTIN

- **Aplikasi pemesanan warung.** \
Ditolak karena alur yang diciptakan oleh salah satu aktornya (supplier) tidak terintegrasi dengan aktor-aktor lainnya.

- **Aplikasi booking ruang kelas.** \ 
Ditolak karena terdapat kekurangan aktor, sehingga tidak memenuhi empat syarat pemilihan domain

- **Aplikas laundry tanpa kurir (walk-in only).** \
Dipertimbangkan sebagai versi yang lebih sederhana, tetapi ditolak karena memiliki aktor yang membuat alur sistem terlalu kompleks (pencuci dan kasir dipisah), dan menghilangkan sumber konektivitas tidak andal (kurir) karena semua operasi berada di satu tempat.

## Consequences
- Klien customer dan kurir sama-sama memerlukan desain yang toleran terhadap jaringan intermiten (durable mutation queue), sedangkan klien staff dapat diasumsikan selalu terhubung karena bekerja dari lokasi outlet yang tetap.

- Operasi pembayaran, sebagai satu-satunya operasi unsafe dan konsekuensial dalam alur ini, akan menjadi fokus utama spesifikasi idempotency key.

- Karena kredensial customer dan kurir tidak dapat disimpan di luar jangkauan pengguna (perangkat pribadi), kedua klien tersebut memerlukan public-client flow, berbeda dengan klien staff yang dapat menggunakan confidential-client flow.