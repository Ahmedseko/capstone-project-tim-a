USE global_parfum_kutoarjo;

-- ==========================================================
-- USERS
-- Akun login awal. Password default: admin123 (Owner/Admin), staff123 (Staff)
-- Tanpa ini tidak ada cara untuk masuk ke aplikasi (tidak ada pendaftaran akun).
-- ==========================================================
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  ('Siti Aminah', 'admin@globalparfum.id', '$2b$10$6F8Op8lc3jk9aI4RNkYrO.hEet6s4mpFU5eO7ZRrb4LjAS.XK4rXS', 'admin', 1),
  ('Budi Santoso', 'staff@globalparfum.id', '$2b$10$i9OeiW5o7Wsm/PZZvaxaruwqTC6xggebagpDdLonRmvwFrH8lqc0a', 'staff', 1);

-- ==========================================================
-- SETTINGS
-- Baris tunggal wajib ada agar halaman Pengaturan punya data awal.
-- ==========================================================
INSERT INTO settings (store_name, owner_name, address, phone, currency, default_low_stock_threshold) VALUES
  ('Global Parfum Kutoarjo', 'Siti Aminah', 'Jl. Diponegoro No. 45, Kutoarjo, Purworejo', '0812-3456-7890', 'IDR', 5);

-- ==========================================================
-- DATA CONTOH (hanya untuk instalasi baru)
-- Varian parfum dijual per ml (stok dalam ml); botol kosong dijual per buah.
-- Harga di katalog hanyalah contoh — admin mengubahnya lewat menu Katalog Harga.
-- Tidak ada transaksi penjualan contoh; coba lewat menu Penjualan setelah login.
-- ==========================================================
INSERT INTO price_catalog (name, category, size, unit, price, cost_price) VALUES
  ('Baccarat',      'Parfum Refill', 'curah', 'ml',    4000, 2400),
  ('Black Opium',   'Parfum Refill', 'curah', 'ml',    3500, 2100),
  ('Sugar Baby',    'Parfum Refill', 'curah', 'ml',    3000, 1800),
  ('Sauvage',       'Parfum Refill', 'curah', 'ml',    3500, 2100),
  ('Wangi Sabun',   'Parfum Refill', 'curah', 'ml',    2000, 1200),
  ('Vanilla',       'Parfum Refill', 'curah', 'ml',    2500, 1500),
  ('Botol 10 ml',   'Botol Kosong',  '10 ml', 'botol', 3000, 1500),
  ('Botol 20 ml',   'Botol Kosong',  '20 ml', 'botol', 4000, 2000),
  ('Botol 30 ml',   'Botol Kosong',  '30 ml', 'botol', 5500, 2800),
  ('Botol 50 ml',   'Botol Kosong',  '50 ml', 'botol', 7500, 3800),
  ('Botol 100 ml',  'Botol Kosong',  '100 ml', 'botol', 12000, 6500);

-- Setiap item katalog dijadikan produk: varian 1.000 ml (batas menipis 100 ml), botol 50 pcs (batas 10).
INSERT INTO products (catalog_id, name, category, size, unit, price, cost_price, stock, low_stock_threshold, status)
SELECT id, name, category, size, unit, price, cost_price,
       CASE WHEN unit = 'ml' THEN 1000 ELSE 50 END,
       CASE WHEN unit = 'ml' THEN 100 ELSE 10 END,
       'aktif'
FROM price_catalog;

-- Riwayat stok awal supaya halaman Stok dan Closing Harian konsisten.
INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id)
SELECT p.id, 'masuk', p.stock, 0, p.stock, 'Stok awal (data contoh)', u.id
FROM products p
JOIN users u ON u.email = 'admin@globalparfum.id';
