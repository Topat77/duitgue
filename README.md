# Duit Gue

Aplikasi pencatat keuangan pribadi: uang masuk, uang keluar, dan pindah saldo antara dompet cash dan akun e-money/rekening. Login pakai Google, data tersinkron ke semua perangkat yang pakai akun yang sama, dan tetap bisa dipakai tanpa internet.

## Fitur

- **Saldo per akun**: dompet cash plus akun e-money dan rekening (BCA, GoPay, DANA, dll). Cukup nama dan saldo, tanpa nomor rekening.
- **Catat transaksi**: keluar, masuk, atau pindah saldo antar akun (biaya admin ikut dicatat).
- **Tarik tunai**: catat ambil uang di ATM sebagai pindah saldo dari rekening ke dompet cash.
- **Rekap** harian, mingguan, dan bulanan, dengan grafik dan pengeluaran per kategori.
- **Kategori & batas bulanan**: atur kategori sendiri, dan dapat peringatan kalau pengeluaran mendekati atau lewat batas.
- **Cari riwayat** berdasarkan keterangan, kategori, nama akun, atau nominal.
- **Backup & pulihkan** lewat file JSON (bisa langsung dikirim ke Google Drive/WhatsApp), dan **ekspor ke Excel**.

## Cara pakai

1. Buka aplikasinya, masuk pakai akun Google, lalu isi uang cash yang lo pegang dan saldo tiap rekening/e-money.
2. Catat transaksi lewat tombol **Catat** di halaman E-money atau Dompet.
3. Kalau saldo di aplikasi beda sama saldo asli, pakai **Sesuaikan saldo** (cash) atau **Ubah** (akun e-money).
4. Backup rutin lewat tombol **Backup data** di beranda.

**Install ke HP (Android/Chrome):** buka menu browser, pilih *Install app* atau *Tambahkan ke layar utama*.
**iPhone (Safari):** tombol *Share*, lalu *Add to Home Screen*.

## Data & privasi

- Login pakai Google lewat Firebase Authentication. Daftar akun yang pernah login ada di Firebase Console → Authentication → Users.
- Data disimpan di Cloud Firestore project `duit-gue`, dipisah per akun:
  - `users/{uid}`: daftar akun (cash, e-money) dan kategori
  - `users/{uid}/txs/{id}`: satu dokumen per transaksi
- Aturan keamanan (`firestore.rules`) bikin tiap akun cuma bisa baca dan tulis datanya sendiri.
- Firestore nyimpen salinan di perangkat, jadi app tetap jalan offline dan sinkron otomatis waktu online lagi.
- Pemilik project Firebase bisa membuka isi database lewat Firebase Console. Ini juga disebut di halaman Privasi dalam app.
- Data dari versi tanpa login (tahap 1) yang masih ada di perangkat otomatis dipindah ke akun saat pertama kali login, kalau akunnya masih kosong.

## Setup Firebase (sekali aja)

1. **Firestore Database → Create database.** Pilih *Production mode* dan lokasi `asia-southeast2 (Jakarta)`. Lokasi nggak bisa diganti setelah dibuat.
2. **Firestore Database → Rules.** Salin isi `firestore.rules`, tempel, lalu *Publish*.
3. **Authentication → Sign-in method.** Pastikan *Google* aktif.
4. **Authentication → Settings → Authorized domains.** Pastikan `topat77.github.io` ada di daftar.

## Struktur kode

Tanpa framework dan tanpa build step. File langsung disajikan apa adanya.

```
index.html            kerangka halaman
css/app.css           semua tampilan (termasuk dark mode)
js/main.js            titik masuk: pindah halaman + tombol-tombol
js/util.js            format rupiah, tanggal, id (tanpa DOM)
js/model.js           semua hitungan uang: saldo, rekap, validasi, backup (tanpa DOM)
js/store.js           state aplikasi + satu pintu buat ngubah data (apply)
js/cloud.js           login Google + sinkron Firestore
js/firebase-config.js konfigurasi project Firebase
js/views.js           halaman Beranda, E-money, Dompet
js/sheets/*.js        panel bawah: catat transaksi, akun, kategori, backup/ekspor
js/xlsx.js            pembuat file Excel
js/pwa.js             install ke layar utama + service worker
sw.js                 service worker (buat offline)
firestore.rules       aturan keamanan database
firebase.json         konfigurasi emulator Firebase buat ngetes lokal
tests/                test hitungan uang
```

Aturan sederhananya:
- **Hitungan uang cuma ada di `js/model.js`** dan selalu dites. Tampilan nggak boleh ngitung saldo sendiri.
- **Semua perubahan data lewat `apply()` di `js/store.js`**, dalam bentuk satu "change" `{wallets?, cats?, put?, del?}`. Change yang sama dipakai buat update layar dan ditulis ke Firestore.

## Develop

```bash
npm start        # buka http://localhost:8080
npm test         # jalanin test (butuh Node.js 20+)
```

Test juga otomatis jalan di GitHub Actions tiap push dan pull request.

**Ngetes login dan sinkron tanpa nyentuh data asli:** jalanin emulator Firebase (butuh Java 21 dan `firebase-tools`), lalu buka app dengan `?emulator`:

```bash
npx firebase-tools emulators:start --only auth,firestore
python3 -m http.server 8766   # di terminal lain
# buka http://localhost:8766/?emulator
```

Dalam mode emulator, `window.__duitTest.login("nama@contoh.com")` bisa dipakai buat login tanpa popup Google.

**Service worker:** app selalu ambil file terbaru kalau ada internet, jadi update biasa langsung sampai ke pengguna. Angka `VERSION` di `sw.js` cuma perlu dinaikin kalau lo **nambah, ganti nama, atau hapus file** yang ada di daftar `APP`.

## Rencana

- [x] Tahap 1: rombak jadi pencatat pribadi saja, kode dipecah, ada test
- [x] Tahap 2: login Google + sinkron antar perangkat (tiap orang datanya sendiri)
- [ ] Tahap 3: aplikasi Android
- [ ] Tahap 4: pemasukan dan pengeluaran tercatat otomatis dari notifikasi bank/e-wallet
