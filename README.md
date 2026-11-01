# Duit Gue

Aplikasi pencatat keuangan pribadi: uang masuk, uang keluar, dan pindah saldo antara dompet cash dan akun e-money/rekening. Jalan di browser, bisa di-install ke HP, dan tetap bisa dibuka tanpa internet.

## Fitur

- **Saldo per akun**: dompet cash plus akun e-money dan rekening (BCA, GoPay, DANA, dll). Cukup nama dan saldo, tanpa nomor rekening.
- **Catat transaksi**: keluar, masuk, atau pindah saldo antar akun (biaya admin ikut dicatat).
- **Tarik tunai**: catat ambil uang di ATM sebagai pindah saldo dari rekening ke dompet cash.
- **Rekap** harian, mingguan, dan bulanan, dengan grafik dan pengeluaran per kategori.
- **Kategori & batas bulanan**: atur kategori sendiri, dan dapat peringatan kalau pengeluaran mendekati atau lewat batas.
- **Cari riwayat** berdasarkan keterangan, kategori, nama akun, atau nominal.
- **Backup & pulihkan** lewat file JSON (bisa langsung dikirim ke Google Drive/WhatsApp), dan **ekspor ke Excel**.

## Cara pakai

1. Buka aplikasinya, isi uang cash yang lo pegang dan saldo tiap rekening/e-money.
2. Catat transaksi lewat tombol **Catat** di halaman E-money atau Dompet.
3. Kalau saldo di aplikasi beda sama saldo asli, pakai **Sesuaikan saldo** (cash) atau **Ubah** (akun e-money).
4. Backup rutin lewat tombol **Backup data** di beranda.

**Install ke HP (Android/Chrome):** buka menu browser, pilih *Install app* atau *Tambahkan ke layar utama*.
**iPhone (Safari):** tombol *Share*, lalu *Add to Home Screen*.

## Data & privasi

Semua catatan disimpan di browser perangkat yang dipakai (`localStorage`, key `duitgue:v3`). Nggak ada server dan nggak ada login. Konsekuensinya: kalau data browser dihapus atau ganti HP, data hilang kecuali lo punya file backup.

## Struktur kode

Tanpa framework dan tanpa build step. File langsung disajikan apa adanya.

```
index.html            kerangka halaman
css/app.css           semua tampilan (termasuk dark mode)
js/main.js            titik masuk: pindah halaman + tombol-tombol
js/util.js            format rupiah, tanggal, id (tanpa DOM)
js/model.js           semua hitungan uang: saldo, rekap, validasi, backup (tanpa DOM)
js/store.js           state aplikasi + simpan/muat dari perangkat
js/views.js           halaman Beranda, E-money, Dompet
js/sheets/*.js        panel bawah: catat transaksi, akun, kategori, backup/ekspor
js/xlsx.js            pembuat file Excel
js/pwa.js             install ke layar utama + service worker
sw.js                 service worker (buat offline)
tests/                test hitungan uang
```

Aturan sederhananya: **hitungan uang cuma ada di `js/model.js`** dan selalu dites. Tampilan nggak boleh ngitung saldo sendiri.

## Develop

```bash
npm start        # buka http://localhost:8080
npm test         # jalanin test (butuh Node.js 20+)
```

Test juga otomatis jalan di GitHub Actions tiap push dan pull request.

**Service worker:** app selalu ambil file terbaru kalau ada internet, jadi update biasa langsung sampai ke pengguna. Angka `VERSION` di `sw.js` cuma perlu dinaikin kalau lo **nambah, ganti nama, atau hapus file** yang ada di daftar `APP`.

## Rencana

- [x] Tahap 1: rombak jadi pencatat pribadi saja, kode dipecah, ada test
- [ ] Tahap 2: sinkron antar perangkat (tiap orang datanya sendiri)
- [ ] Tahap 3: aplikasi Android
- [ ] Tahap 4: pemasukan dan pengeluaran tercatat otomatis dari notifikasi bank/e-wallet
