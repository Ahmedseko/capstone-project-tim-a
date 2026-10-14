# Rencana Pengembangan Fitur — Global Parfum Kutoarjo

Dokumen ini mencatat apa yang sudah selesai pada tahap pertama dan rencana fitur berikutnya, diurutkan berdasarkan prioritas. Status diperbarui seiring pengerjaan.

Terakhir diperbarui: 14 Oktober 2026

---

## Tahap 1 — Selesai

| Area | Yang sudah ada |
| --- | --- |
| Autentikasi & peran | Login JWT, peran Admin dan Staff, logout otomatis saat sesi habis |
| Produk & katalog | Varian parfum per ml, botol kosong per ukuran (kelipatan 5 ml, 5–100), Katalog Harga yang diatur admin dengan harga terisi otomatis |
| Stok | Stok dalam ml dan pcs, input stok banyak produk sekaligus, riwayat pergerakan stok |
| Penjualan | Kasir Racik Parfum, diskon, catatan pembeli, uang diterima + kembalian, struk cetak/PDF, pembatalan transaksi (admin) |
| Closing harian | Rekonsiliasi stok dan rekonsiliasi kas (tunai/QRIS/transfer, selisih kas) |
| Laporan | Dashboard, laporan per rentang tanggal, ekspor Excel, harga modal dan laba kotor (khusus admin) |
| Pengaturan | Identitas toko (dipakai di struk), manajemen pengguna |
| Operasional | Deploy ke VPS (Nginx + systemd + MySQL), migrasi database bernomor, seed data contoh, dokumentasi README |

---

## Rencana Berikutnya

Usaha: **K** = kecil, **S** = sedang. Status awal semuanya: belum dikerjakan.

### A. Prioritas tinggi — keamanan dan keandalan

| # | Fitur | Alasan | Usaha |
| --- | --- | --- | --- |
| A1 | Ganti / reset kata sandi dari aplikasi | Akun bawaan `admin123` / `staff123` tercantum di README | K |
| A2 | Backup database otomatis (harian, simpan 14 hari) | Saat ini backup dibuat manual sebelum perubahan | K |
| A3 | HTTPS + domain | Server diakses lewat `http://IP`, sehingga kata sandi dan token lewat tanpa enkripsi | S |
| A4 | Pengujian otomatis di repositori + CI GitHub Actions | Mencegah fitur lama rusak saat ada perubahan; skenario uji sudah ada, tinggal dimasukkan ke repo | S |

### B. Fitur bernilai bagi pemilik toko

| # | Fitur | Manfaat | Usaha |
| --- | --- | --- | --- |
| B1 | Laporan per varian: ml terjual, omzet, laba, 10 varian terlaris | Menunjukkan varian yang laku dan menguntungkan, dasar keputusan restok | K–S |
| B2 | Ekspor Excel dengan modal, laba, diskon, dan status transaksi | Ekspor saat ini belum memuat kolom tersebut | K |
| B3 | Pengeluaran operasional (listrik, sewa, gaji, belanja bibit) → laba bersih | Laba saat ini masih laba kotor | S |
| B4 | Pembelian / restock: catat belanja dari pemasok, modal diperbarui otomatis | Modal tidak perlu diketik manual dan lebih akurat | S |
| B5 | Data pelanggan + kirim struk lewat WhatsApp | Mendukung pelanggan tetap | S |
| B6 | Retur / pembatalan sebagian | Pembatalan saat ini harus seluruh transaksi | S |

### C. Penyempurnaan kecil

- Peringatan saat admin mengubah satuan produk yang sudah punya stok (stok tidak otomatis dikonversi).
- Validasi kapasitas botol (isi tidak melebihi ukuran) juga di sisi server, bukan hanya di tampilan.
- Pengaturan struk: logo, teks penutup, pilihan kertas 58 mm / 80 mm.
- Riwayat stok: pencarian, filter jenis, dan pagination.
- Log audit: siapa mengubah harga, stok, atau membatalkan transaksi.

### D. Ide jangka panjang

- Notifikasi stok menipis ke WhatsApp atau email.
- Mode tablet / PWA untuk kasir.
- Dukungan multi-cabang.
- Cetak label atau barcode produk.

---

## Urutan Pengerjaan yang Disarankan

1. **Keamanan dan keandalan:** A1 → A2 → A3
2. **Hasil cepat terlihat:** B1 dan B2
3. **Kualitas rekayasa:** A4
4. **Kelengkapan keuangan:** B3 dan B4
5. Sisanya mengikuti kebutuhan toko.
