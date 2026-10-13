-- Sistem Informasi Manajemen Penjualan dan Stok UMKM Parfum
-- Global Parfum Kutoarjo

CREATE DATABASE IF NOT EXISTS global_parfum_kutoarjo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE global_parfum_kutoarjo;

-- ==========================================================
-- USERS
-- ==========================================================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- PRICE CATALOG (daftar harga acuan eceran, diisi admin)
-- ==========================================================
CREATE TABLE price_catalog (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(20) NOT NULL,
  unit ENUM('botol', 'ml') NOT NULL DEFAULT 'botol',
  price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_catalog_price CHECK (price > 0)
) ENGINE=InnoDB;

-- ==========================================================
-- PRODUCTS
-- ==========================================================
CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  catalog_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  size VARCHAR(20) NOT NULL,
  unit ENUM('botol', 'ml') NOT NULL DEFAULT 'botol',
  price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_catalog FOREIGN KEY (catalog_id) REFERENCES price_catalog (id) ON DELETE SET NULL,
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_stock CHECK (stock >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_status ON products (status);

-- ==========================================================
-- STOCK MOVEMENTS
-- ==========================================================
CREATE TABLE stock_movements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  type ENUM('masuk', 'penjualan', 'penyesuaian') NOT NULL,
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  note VARCHAR(255) NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_stock_movements_product ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at);

-- ==========================================================
-- SALES
-- ==========================================================
CREATE TABLE sales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(30) NOT NULL UNIQUE,
  date DATE NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method ENUM('tunai', 'qris', 'transfer') NOT NULL DEFAULT 'tunai',
  customer_note VARCHAR(255) NULL,
  amount_paid DECIMAL(12, 2) NULL,
  status ENUM('selesai', 'batal') NOT NULL DEFAULT 'selesai',
  cancel_reason VARCHAR(255) NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by INT UNSIGNED NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_sales_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_sales_date ON sales (date);

-- ==========================================================
-- SALE ITEMS
-- ==========================================================
CREATE TABLE sale_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT chk_sale_items_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);

-- ==========================================================
-- DAILY CLOSINGS
-- ==========================================================
CREATE TABLE daily_closings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  closing_date DATE NOT NULL UNIQUE,
  total_transactions INT NOT NULL DEFAULT 0,
  total_items_sold INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_qris DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_transfer DECIMAL(12, 2) NOT NULL DEFAULT 0,
  opening_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cash_actual DECIMAL(12, 2) NULL,
  cash_difference DECIMAL(12, 2) NULL,
  status ENUM('terbuka', 'ditutup') NOT NULL DEFAULT 'terbuka',
  note VARCHAR(255) NULL,
  closed_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_closings_user FOREIGN KEY (closed_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- ==========================================================
-- DAILY CLOSING ITEMS
-- ==========================================================
CREATE TABLE daily_closing_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  closing_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  opening_stock INT NOT NULL,
  stock_added INT NOT NULL,
  quantity_sold INT NOT NULL,
  system_stock INT NOT NULL,
  actual_stock INT NOT NULL,
  difference INT NOT NULL,
  note VARCHAR(255) NULL,
  CONSTRAINT fk_closing_items_closing FOREIGN KEY (closing_id) REFERENCES daily_closings (id) ON DELETE CASCADE,
  CONSTRAINT fk_closing_items_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB;

CREATE INDEX idx_closing_items_closing ON daily_closing_items (closing_id);

-- ==========================================================
-- SETTINGS (single row)
-- ==========================================================
CREATE TABLE settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store_name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
  default_low_stock_threshold INT NOT NULL DEFAULT 5
) ENGINE=InnoDB;
