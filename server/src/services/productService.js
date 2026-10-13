import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { assertBottleSize } from '../utils/bottleSize.js';

function mapProduct(row) {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    name: row.name,
    category: row.category,
    size: row.size,
    unit: row.unit,
    price: Number(row.price),
    costPrice: Number(row.cost_price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProducts() {
  const [rows] = await pool.query('SELECT * FROM products ORDER BY name ASC');
  return rows.map(mapProduct);
}

export async function getProductById(id) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function createProduct({ name, category, size, unit, price, costPrice, lowStockThreshold, catalogId }) {
  if (!name?.trim() || !category?.trim() || !size?.trim()) {
    throw new AppError('Nama, kategori, dan ukuran produk wajib diisi.', 400);
  }
  assertBottleSize(category.trim(), size.trim());
  if (!(price > 0)) {
    throw new AppError('Harga produk harus lebih dari nol.', 400);
  }
  if (!(Number(costPrice ?? 0) >= 0)) {
    throw new AppError('Harga modal tidak boleh negatif.', 400);
  }
  if (lowStockThreshold != null && lowStockThreshold < 0) {
    throw new AppError('Batas stok menipis tidak boleh negatif.', 400);
  }
  const productUnit = unit ?? 'botol';
  if (!['botol', 'ml'].includes(productUnit)) {
    throw new AppError('Satuan produk tidak valid.', 400);
  }

  const [result] = await pool.query(
    'INSERT INTO products (catalog_id, name, category, size, unit, price, cost_price, stock, low_stock_threshold, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
    [catalogId ?? null, name.trim(), category.trim(), size.trim(), productUnit, price, Number(costPrice ?? 0), lowStockThreshold ?? 5, 'aktif'],
  );

  return getProductById(result.insertId);
}

export async function updateProduct(id, updates) {
  const existing = await getProductById(id);
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  const next = {
    name: updates.name?.trim() || existing.name,
    category: updates.category?.trim() || existing.category,
    size: updates.size?.trim() || existing.size,
    unit: updates.unit ?? existing.unit,
    price: updates.price != null ? updates.price : existing.price,
    costPrice: updates.costPrice != null ? Number(updates.costPrice) : existing.costPrice,
    lowStockThreshold: updates.lowStockThreshold != null ? updates.lowStockThreshold : existing.lowStockThreshold,
    status: updates.status ?? existing.status,
  };

  assertBottleSize(next.category, next.size);
  if (!(next.price > 0)) {
    throw new AppError('Harga produk harus lebih dari nol.', 400);
  }
  if (!(next.costPrice >= 0)) {
    throw new AppError('Harga modal tidak boleh negatif.', 400);
  }
  if (next.lowStockThreshold < 0) {
    throw new AppError('Batas stok menipis tidak boleh negatif.', 400);
  }
  if (!['aktif', 'nonaktif'].includes(next.status)) {
    throw new AppError('Status produk tidak valid.', 400);
  }
  if (!['botol', 'ml'].includes(next.unit)) {
    throw new AppError('Satuan produk tidak valid.', 400);
  }

  await pool.query(
    'UPDATE products SET name = ?, category = ?, size = ?, unit = ?, price = ?, cost_price = ?, low_stock_threshold = ?, status = ? WHERE id = ?',
    [next.name, next.category, next.size, next.unit, next.price, next.costPrice, next.lowStockThreshold, next.status, id],
  );

  return getProductById(id);
}

export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return { deleted: true, product: null };
  } catch (err) {
    // Referenced by sale_items / stock_movements / daily_closing_items —
    // hard delete would corrupt historical reports, so fall back to
    // deactivating instead of destroying that history.
    if (err.errno === 1451) {
      await pool.query("UPDATE products SET status = 'nonaktif' WHERE id = ?", [id]);
      return { deleted: false, product: await getProductById(id) };
    }
    throw err;
  }
}
