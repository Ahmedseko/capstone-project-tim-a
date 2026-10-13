# Global Parfum Kutoarjo

Sistem Informasi Manajemen Penjualan dan Stok UMKM Parfum — aplikasi web untuk mengelola produk, stok, penjualan, closing harian, dan laporan toko parfum.

## Fitur Utama

- **Racik parfum per ml**: parfum dijual per mililiter (mis. Baccarat Rp4.000/ml) dan dimasukkan ke botol pilihan pembeli. Harga = `isi (ml) × harga per ml + harga botol`. Ukuran botol kelipatan 5 ml (5–100) dan isi tidak boleh melebihi ukuran botol.
- **Katalog Harga** (admin): daftar harga eceran acuan. Saat menambah produk, cukup ketik namanya dan harga terisi otomatis. Mengubah harga katalog ikut mengubah produk terkait; transaksi lama tidak berubah.
- **Stok** dalam ml (varian) dan pcs (botol & produk lain), lengkap dengan riwayat pergerakan stok.
- **Penjualan**: diskon (Rp/%), catatan pembeli, uang diterima + kembalian, **struk** yang bisa dicetak ke printer apa pun atau disimpan sebagai PDF, dan **pembatalan transaksi** oleh admin (stok dikembalikan, keluar dari laporan).
- **Closing harian**, **laporan** (dashboard, grafik, ekspor Excel), serta pengaturan toko dan pengguna.

## Struktur Proyek

```text
client/     React + Vite + TypeScript + Tailwind CSS (frontend)
server/     Node.js + Express (REST API)
database/   schema.sql & seed.sql (MySQL)
```

---

## Cara Menjalankan Aplikasi (Lengkap, dari Nol)

Panduan ini ditulis untuk yang **belum pernah menjalankan proyek ini sama sekali**. Ikuti dari atas ke bawah, jangan ada yang dilewati.

### Langkah 0 — Instal Software yang Dibutuhkan

Sebelum mulai, pastikan 3 software ini sudah terpasang di komputer:

1. **Git** — untuk mengambil (clone) kode dari GitHub.
   Download: [git-scm.com/downloads](https://git-scm.com/downloads)
2. **Node.js** (versi 20 ke atas) — untuk menjalankan server dan client.
   Download: [nodejs.org](https://nodejs.org) (pilih versi **LTS**)
3. **Docker Desktop** — untuk menjalankan database MySQL tanpa perlu install MySQL manual.
   Download: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

Setelah instalasi selesai (mungkin perlu restart komputer untuk Docker Desktop), **cek semuanya sudah benar terpasang**. Buka terminal (lihat Langkah 1 kalau belum tahu caranya), lalu ketik satu per satu:

```bash
git --version
node --version
docker --version
```

Kalau ketiganya menampilkan nomor versi (bukan pesan error "command not found"), berarti sudah siap lanjut.

### Langkah 1 — Cara Membuka Terminal

Terminal adalah jendela untuk mengetik perintah (bukan aplikasi biasa yang diklik-klik). Ini berbeda-beda tergantung sistem operasi:

- **Windows**: buka folder tempat kamu akan menyimpan proyek di File Explorer, klik kanan di area kosong folder tersebut, lalu pilih **"Open in Terminal"** (atau "Buka di Terminal"). Kalau tidak ada opsi itu, buka aplikasi **PowerShell** atau **Command Prompt** dari Start Menu, lalu gunakan perintah `cd` untuk pindah ke folder yang diinginkan.
- **macOS**: buka aplikasi **Terminal** (cari lewat Spotlight / `Cmd + Space`, ketik "Terminal").
- **Kalau pakai VS Code**: buka folder proyek di VS Code, lalu buka menu **Terminal > New Terminal** di bagian atas, atau tekan `` Ctrl + ` ``.

Semua perintah di panduan ini dijalankan di dalam terminal.

### Langkah 2 — Unduh Kode Proyek

Buka terminal, lalu jalankan:

```bash
git clone https://github.com/Ahmedseko/capstone-project-tim-a.git
cd capstone-project-tim-a
```

> Tidak terbiasa pakai Git? Alternatif: buka halaman [github.com/Ahmedseko/capstone-project-tim-a](https://github.com/Ahmedseko/capstone-project-tim-a), klik tombol hijau **"Code" → "Download ZIP"**, lalu ekstrak filenya. Setelah itu buka terminal di dalam folder hasil ekstrak tadi (lihat Langkah 1).

Pastikan sekarang posisi terminal kamu ada **di dalam folder `capstone-project-tim-a`** sebelum lanjut ke langkah berikutnya. Kamu bisa cek dengan mengetik `ls` (Mac) atau `dir` (Windows) — harusnya terlihat folder `client`, `server`, `database`, dan file `README.md` ini.

### Langkah 3 — Nyalakan Docker Desktop

Buka **aplikasi Docker Desktop** yang sudah diinstal di Langkah 0 (cari di Start Menu / Applications, klik untuk membukanya — ini seperti membuka aplikasi biasa, bukan lewat terminal).

Tunggu sampai Docker Desktop benar-benar siap. Biasanya ditandai dengan ikon paus 🐳 di system tray (pojok kanan bawah layar, Windows) atau menu bar (atas layar, Mac) yang **berhenti animasi loading**. Ini bisa memakan waktu 30 detik sampai 1-2 menit di percobaan pertama.

Untuk memastikan sudah siap, ketik di terminal:

```bash
docker ps
```

Kalau muncul tabel (walau kosong) tanpa pesan error, berarti Docker sudah siap. Kalau muncul error seperti `Cannot connect to the Docker daemon`, berarti Docker Desktop belum selesai menyala — tunggu sebentar lagi lalu coba ulang.

### Langkah 4 — Nyalakan Database

Masih di terminal yang sama, di dalam folder `capstone-project-tim-a`, jalankan:

```bash
docker compose up -d
```

Perintah ini otomatis membuat database MySQL beserta akun login awal (lewat `database/schema.sql` dan `database/seed.sql`), semua dalam satu langkah. Data contoh yang ikut terpasang: 6 varian parfum (stok 1.000 ml), 5 ukuran botol (stok 50 pcs), dan katalog harganya. Belum ada transaksi penjualan — silakan coba lewat menu Penjualan. Tunggu sampai proses selesai (biasanya beberapa detik sampai 1 menit di percobaan pertama, karena perlu mengunduh image MySQL).

Cek berhasil dengan:

```bash
docker compose ps
```

Harus terlihat baris `gpk-mysql` dengan status **"Up ... (healthy)"**. Kalau statusnya masih `starting`, tunggu beberapa detik lalu ulangi perintah di atas.

> Database ini **persisten** — datanya tidak hilang walau komputer di-restart atau Docker Desktop ditutup, selama container tidak dihapus. Jadi Langkah 4 ini **hanya perlu dilakukan sekali** di awal (kecuali kamu memang mau reset data, lihat bagian Troubleshooting).

### Langkah 5 — Nyalakan Server (Backend)

Masih di terminal yang sama, jalankan:

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

- `cp .env.example .env` — menyalin file konfigurasi. Isi default-nya sudah cocok dengan database dari Langkah 4, tidak perlu diubah.
- `npm install` — mengunduh semua library yang dibutuhkan. Ini hanya perlu dilakukan sekali (kecuali ada perubahan dependencies), dan bisa memakan waktu 1-2 menit.
- `npm run dev` — menyalakan server-nya.

Kalau berhasil, akan muncul tulisan:

```text
Server berjalan di http://localhost:4000
```

**Biarkan terminal ini tetap terbuka dan jangan ditutup** — server akan mati kalau terminal ini ditutup atau prosesnya dihentikan (`Ctrl + C`).

### Langkah 6 — Nyalakan Client (Tampilan Web)

Server butuh tetap menyala, jadi kita perlu **terminal baru** untuk langkah ini:

- Kalau pakai VS Code: klik tombol **`+`** di panel terminal untuk membuka tab terminal baru.
- Kalau pakai terminal biasa: buka jendela terminal baru, lalu `cd` lagi ke folder proyek (`cd capstone-project-tim-a`).

Di terminal baru ini, jalankan:

```bash
cd client
npm install
npm run dev
```

Kalau berhasil, akan muncul tulisan seperti:

```text
VITE ready in ... ms
➜  Local:   http://localhost:5173/
```

**Biarkan terminal ini juga tetap terbuka.** Sekarang seharusnya ada **2 terminal yang sama-sama menyala**: satu untuk server (Langkah 5), satu untuk client (Langkah 6).

### Langkah 7 — Buka di Browser

Buka browser (Chrome, Edge, Firefox, dll), lalu kunjungi:

```text
http://localhost:5173
```

Akan muncul halaman login. Masuk pakai salah satu akun demo di bawah ini.

### Cara Menghentikan Aplikasi

Kalau sudah selesai pakai:

1. Di terminal server dan client, tekan `Ctrl + C` untuk mematikannya.
2. Database boleh dibiarkan tetap menyala di background (tidak makan banyak resource), atau matikan dengan:

   ```bash
   docker compose stop
   ```

   Data tidak akan hilang. Untuk menyalakan lagi nanti, cukup ulangi Langkah 4 (`docker compose up -d`) — tidak perlu install ulang apa pun.

---

## Akun Demo

| Peran | Email | Password |
| --- | --- | --- |
| Owner/Admin | `admin@globalparfum.id` | `admin123` |
| Staff | `staff@globalparfum.id` | `staff123` |

> Akun ini dibuat otomatis oleh `database/seed.sql` pada **instalasi lokal** (Langkah 4). Server lain yang sudah dipakai sungguhan bisa saja memakai kata sandi berbeda. Ganti kata sandi bawaan sebelum aplikasi dipakai di internet.

## Cara Mencoba Cepat (untuk Penilai)

1. Login sebagai **Admin** → buka **Katalog Harga**: lihat daftar harga per ml dan harga botol; coba ubah satu harga.
2. Buka **Produk → Tambah Produk**, ketik nama dari katalog (mis. `Vanilla`): kategori, satuan, dan harga terisi otomatis.
3. Buka **Penjualan → Racik Parfum**: pilih varian, ukuran botol, dan isi (mis. 25 ml dalam botol 30 ml) → tambah ke keranjang → isi diskon / uang diterima → **Simpan Penjualan**. Struk muncul; coba **Cetak / Simpan PDF**.
4. Dari daftar **Transaksi Hari Ini**, klik **Detail** lalu **Batalkan Transaksi** (admin): stok kembali dan transaksi keluar dari laporan.
5. Lanjutkan ke **Stok** (riwayat), **Closing Harian**, dan **Laporan**.

## Alur Utama

Login → Dashboard → Produk → Stok → Penjualan → Closing Harian → Laporan

## Catatan Peran

- **Owner/Admin**: akses penuh (produk, katalog harga, stok, penjualan, pembatalan transaksi, closing, laporan, pengaturan, manajemen pengguna).
- **Staff**: melihat produk, input stok masuk, mencatat penjualan dan mencetak struk, closing harian. Tidak memiliki akses ke Katalog Harga, Laporan, Pengaturan, dan tidak bisa membatalkan transaksi.

## Memperbarui Database yang Sudah Berjalan

Instalasi baru otomatis memakai `database/schema.sql` terbaru. Kalau kamu **sudah punya database lama** dengan data yang ingin dipertahankan, jalankan migrasi di `database/migrations/` **berurutan, masing-masing sekali** (`001_price_catalog.sql`, lalu `002_sales_upgrade.sql`). Contoh dengan Docker:

```bash
docker exec -i gpk-mysql mysql -uroot -proot < database/migrations/001_price_catalog.sql
docker exec -i gpk-mysql mysql -uroot -proot < database/migrations/002_sales_upgrade.sql
```

(Di PowerShell tanda `<` tidak didukung — gunakan Git Bash, atau `Get-Content file.sql | docker exec -i gpk-mysql mysql -uroot -proot`.)

## Troubleshooting

| Masalah | Solusi |
| --- | --- |
| Docker Desktop: **"Virtualization support not detected"** | Virtualisasi di laptop belum aktif. (1) Cek di Task Manager → Performance → CPU, lihat tulisan **Virtualization**. (2) Kalau *Disabled*, restart laptop, masuk BIOS (tekan F2/F10/Del/Esc saat booting), aktifkan **Intel VT-x / Virtualization Technology** (Intel) atau **SVM Mode** (AMD), simpan, restart. (3) Di Windows, buka *Turn Windows features on or off*, centang **Virtual Machine Platform** dan **Windows Subsystem for Linux**, restart. (4) Jalankan `wsl --update` di PowerShell (Administrator). (5) Buka Docker Desktop lagi, tunggu "Engine running". |
| `Cannot connect to the Docker daemon` | Docker Desktop belum menyala / belum selesai loading. Buka aplikasi Docker Desktop, tunggu sampai ikonnya tidak animasi lagi, lalu coba lagi. |
| Server error `ECONNREFUSED` ke database | Pastikan database sudah menyala: `docker compose ps` harus menunjukkan status "healthy". Kalau belum, jalankan `docker compose up -d`. |
| `Error: listen EADDRINUSE` saat `npm run dev` | Port 4000 atau 5173 sudah dipakai proses lain (mungkin sisa proses sebelumnya yang belum ditutup). Tutup proses lama, atau restart komputer kalau bingung caranya. |
| Halaman login gagal terus / "Email atau kata sandi salah" | Pastikan Langkah 4 (`docker compose up -d`) sudah pernah dijalankan sampai selesai — akun demo ada di data seed-nya. |
| Perubahan kode tidak muncul di browser | Pastikan terminal `npm run dev` di folder `client/` masih menyala (bukan ditutup atau di-`Ctrl+C`). |
| Mau reset semua data ke kondisi awal | Jalankan `docker compose down -v` lalu `docker compose up -d` lagi. **Perhatian: ini menghapus semua data yang sudah diinput**, kembali ke data contoh awal. |
| `npm install` gagal / error aneh | Coba hapus folder `node_modules` di dalam `client/` atau `server/`, lalu jalankan `npm install` lagi. |
