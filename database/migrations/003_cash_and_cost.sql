-- Migrasi untuk database yang SUDAH berjalan (instalasi baru sudah termasuk di schema.sql).
-- Menambah harga modal (produk, katalog, dan salinan di item penjualan) serta rekonsiliasi kas harian.
-- Jalankan sekali: mysql -uUSER -p global_parfum_kutoarjo < database/migrations/003_cash_and_cost.sql
USE global_parfum_kutoarjo;

ALTER TABLE price_catalog
  ADD COLUMN cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER price;

ALTER TABLE products
  ADD COLUMN cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER price;

-- NULL = modal belum diketahui saat transaksi (transaksi lama); labanya tidak dihitung.
ALTER TABLE sale_items
  ADD COLUMN cost_price DECIMAL(12, 2) NULL AFTER unit_price;

ALTER TABLE daily_closings
  ADD COLUMN total_cash DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER total_revenue,
  ADD COLUMN total_qris DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER total_cash,
  ADD COLUMN total_transfer DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER total_qris,
  ADD COLUMN opening_cash DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER total_transfer,
  ADD COLUMN cash_actual DECIMAL(12, 2) NULL AFTER opening_cash,
  ADD COLUMN cash_difference DECIMAL(12, 2) NULL AFTER cash_actual;
