# 0002: Order Tidak Boleh Diantar Sebelum Pembayaran Lunas

## Context
Kurir mengantar laundry kembali ke customer setelah dicuci. Jika ini terjadi sebelum pembayaran lunas, customer bisa menerima barang tanpa membayar sehingga menyebabkan kerugian bisnis.

## Decision
- **Service (penegakan):** Sebelum mengizinkan status order berubah jadi delivered, service memeriksa status pembayaran. Kalau belum paid, tolak dengan 409 Conflict.
- **Kontrak (pernyataan):** openapi.yaml mendokumentasikan response 409 (tipe payment-not-completed) pada operasi penyelesaian pengantaran, dan urutan status yang valid (paid sebelum delivered) dijelaskan di skema.
- **Klien (prediksi):** Aplikasi kurir menyembunyikan/menonaktifkan tombol "selesai antar" selama status order belum paid sebagai bentuk bantuan UX.

## Alternatives considered
- **"Satu order hanya boleh diambil satu kurir":** ditolak sebagai aturan utama karena dampak pelanggarannya operasional (dobel penjemputan, jadwal kacau), bukan finansial langsung seperti pembayaran yang tidak lunas.
- **"Harga final ditentukan staff, bukan estimasi awal customer":** ditolak karena ini lebih ke soal otoritas data, dampaknya berupa ketidaksesuaian harga, bukan kerugian materiil langsung.
- **"Order yang sudah dicuci tidak bisa dibatalkan":** ditolak karena mencegah kerugian yang lebih kecil (proses ulang) dibanding order terkirim tanpa dibayar.

## Consequences
- openapi.yaml mendokumentasikan response 409 payment-not-completed pada operasi pengantaran.
- Resource order butuh field status pembayaran agar klien kurir tahu kapan boleh mengantar.
- Urutan status di enum order harus menempatkan paid sebelum delivered.