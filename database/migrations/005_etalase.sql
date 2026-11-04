-- Migrasi untuk database yang SUDAH berjalan (instalasi baru sudah termasuk di schema.sql).
-- Menu "Etalase Online": galeri foto per produk, tong sampah foto (hapus lunak 14 hari), pencatat siapa yang mengubah,
-- dan pengumuman beranda. Jalankan sekali dengan akun administrator database:
--   mysql -uroot global_parfum_kutoarjo < database/migrations/005_etalase.sql
USE global_parfum_kutoarjo;

ALTER TABLE media
  ADD COLUMN product_id INT UNSIGNED NULL,
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by INT UNSIGNED NULL,
  ADD INDEX idx_media_product (product_id),
  ADD INDEX idx_media_deleted (deleted_at);

-- foto utama yang sudah ada dihubungkan ke produknya
UPDATE media m JOIN products p ON p.photo_id = m.id SET m.product_id = p.id;

ALTER TABLE products
  ADD COLUMN online_updated_by INT UNSIGNED NULL,
  ADD COLUMN online_updated_at TIMESTAMP NULL,
  ADD CONSTRAINT fk_products_online_user FOREIGN KEY (online_updated_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE settings ADD COLUMN announcement VARCHAR(300) NULL;
