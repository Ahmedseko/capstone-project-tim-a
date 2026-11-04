-- Migrasi untuk database yang SUDAH berjalan (instalasi baru sudah termasuk di schema.sql).
-- Toko online untuk konsumen: foto (disimpan di database), pesanan online, info toko publik.
-- Jalankan sekali dengan akun administrator database (bukan akun aplikasi, yang tidak boleh mengubah struktur tabel):
--   mysql -uroot global_parfum_kutoarjo < database/migrations/004_online_store.sql
USE global_parfum_kutoarjo;

-- Foto produk dan foto toko. Disimpan sebagai BLOB karena layanan backend tidak boleh menulis file ke disk.
CREATE TABLE media (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('produk', 'toko') NOT NULL,
  mime VARCHAR(30) NOT NULL,
  size INT UNSIGNED NOT NULL,
  data MEDIUMBLOB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE products
  ADD COLUMN photo_id INT UNSIGNED NULL,
  ADD COLUMN description TEXT NULL,
  ADD COLUMN show_online TINYINT(1) NOT NULL DEFAULT 1,
  ADD CONSTRAINT fk_products_photo FOREIGN KEY (photo_id) REFERENCES media (id) ON DELETE SET NULL;

ALTER TABLE settings
  ADD COLUMN email VARCHAR(150) NULL,
  ADD COLUMN maps_url VARCHAR(500) NULL,
  ADD COLUMN opening_hours VARCHAR(500) NULL,
  ADD COLUMN store_profile TEXT NULL,
  ADD COLUMN shopee_url VARCHAR(500) NULL;

-- Pesanan dari konsumen. Stok TIDAK berkurang saat pesanan masuk, hanya saat admin/staf menekan "Konfirmasi"
-- (saat itu dibuat satu penjualan di tabel sales, sehingga laporan, closing, dan laba ikut otomatis).
CREATE TABLE online_orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  fulfillment ENUM('ambil', 'kirim') NOT NULL,
  address VARCHAR(500) NULL,
  note VARCHAR(300) NULL,
  total DECIMAL(12, 2) NOT NULL,
  status ENUM('baru', 'dikonfirmasi', 'diproses', 'siap', 'selesai', 'batal') NOT NULL DEFAULT 'baru',
  sale_id INT UNSIGNED NULL,
  cancel_reason VARCHAR(255) NULL,
  confirmed_by INT UNSIGNED NULL,
  confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_online_orders_sale FOREIGN KEY (sale_id) REFERENCES sales (id),
  CONSTRAINT fk_online_orders_user FOREIGN KEY (confirmed_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_online_orders_status ON online_orders (status);
CREATE INDEX idx_online_orders_phone ON online_orders (customer_phone, created_at);

-- Baris pesanan seperti yang dilihat pelanggan (satu racikan = satu baris). `components` berisi bahan stoknya
-- per satu unit: [{"productId":1,"quantity":25,"unitPrice":4000},{"productId":13,"quantity":1,"unitPrice":6000}].
CREATE TABLE online_order_lines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  kind ENUM('racik', 'produk') NOT NULL,
  label VARCHAR(150) NOT NULL,
  detail VARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  unit_total DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  components JSON NOT NULL,
  CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES online_orders (id) ON DELETE CASCADE,
  CONSTRAINT chk_order_lines_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_order_lines_order ON online_order_lines (order_id);

-- Data merchant resmi (dari pemilik toko). Jam operasional sengaja dikosongkan: diisi admin di Pengaturan.
UPDATE settings SET
  store_name = 'Global Parfum Kutoarjo',
  address = 'Jl. Sawunggaling No. 33, Semawungdaleman, Kutoarjo, Purworejo, Jawa Tengah',
  phone = '082328329333',
  email = 'globalparfum2009@gmail.com',
  maps_url = 'https://maps.app.goo.gl/FFb4oqnBxSUnHfaZ9?g_st=ac',
  store_profile = 'Global Parfum Kutoarjo adalah toko parfum di Kutoarjo, Purworejo. Kami melayani parfum racik per ml sesuai selera Anda, parfum botolan, dan perlengkapan parfum. Datang langsung ke toko atau pesan online, kami siap membantu memilih aroma yang cocok.';
