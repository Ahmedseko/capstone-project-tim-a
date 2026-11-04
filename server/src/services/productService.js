import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { assertBottleSize } from '../utils/bottleSize.js';

function cleanDescription(value) {
  const v = String(value ?? '').trim();
  if (v.length > 2000) throw new AppError('Deskripsi maksimal 2000 karakter.', 400);
  return v || null;
}

// Foto produk harus foto yang memang diunggah sebagai foto produk.
async function assertProductPhoto(id) {
  if (id == null) return null;
  const photoId = Number(id);
  const [rows] = await pool.query("SELECT id FROM media WHERE id = ? AND kind = 'produk'", [photoId]);
  if (!Number.isInteger(photoId) || rows.length === 0) throw new AppError('Foto produk tidak valid.', 400);
  return photoId;
}

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
    photoId: row.photo_id,
    description: row.description ?? '',
    showOnline: Boolean(row.show_online),
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

export async function createProduct({ name, category, size, unit, price, costPrice, lowStockThreshold, catalogId, description, showOnline, photoId, stock, status, userId }) {
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

  const initialStock = stock == null || stock === '' ? 0 : Number(stock);
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new AppError('Stok awal harus bilangan bulat 0 atau lebih.', 400);
  }
  const productStatus = status ?? 'aktif';
  if (!['aktif', 'nonaktif'].includes(productStatus)) {
    throw new AppError('Status produk tidak valid.', 400);
  }

  const cleanDesc = cleanDescription(description);
  const cleanPhoto = await assertProductPhoto(photoId);

  // Produk dan catatan stok awal harus berhasil bersama-sama, supaya stok tidak pernah tanpa riwayat.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO products (catalog_id, name, category, size, unit, price, cost_price, stock, low_stock_threshold, status, description, show_online, photo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [catalogId ?? null, name.trim(), category.trim(), size.trim(), productUnit, price, Number(costPrice ?? 0), initialStock, lowStockThreshold ?? 5, productStatus, cleanDesc, showOnline === false ? 0 : 1, cleanPhoto],
    );
    if (initialStock > 0) {
      await conn.query(
        "INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id) VALUES (?, 'masuk', ?, 0, ?, 'Stok awal produk', ?)",
        [result.insertId, initialStock, initialStock, userId],
      );
    }
    await conn.commit();
    return getProductById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
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
    description: updates.description !== undefined ? cleanDescription(updates.description) : existing.description || null,
    showOnline: updates.showOnline !== undefined ? Boolean(updates.showOnline) : existing.showOnline,
    photoId: updates.photoId !== undefined ? await assertProductPhoto(updates.photoId) : existing.photoId,
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
    'UPDATE products SET name = ?, category = ?, size = ?, unit = ?, price = ?, cost_price = ?, low_stock_threshold = ?, status = ?, description = ?, show_online = ?, photo_id = ? WHERE id = ?',
    [next.name, next.category, next.size, next.unit, next.price, next.costPrice, next.lowStockThreshold, next.status, next.description, next.showOnline ? 1 : 0, next.photoId, id],
  );

  // foto lama yang sudah diganti/dilepas dihapus supaya tidak menumpuk di database
  if (existing.photoId && existing.photoId !== next.photoId) {
    await pool.query('DELETE FROM media WHERE id = ?', [existing.photoId]);
  }

  return getProductById(id);
}

export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) {
    throw new AppError('Produk tidak ditemukan.', 404);
  }

  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    await pool.query('DELETE FROM media WHERE product_id = ? OR id = ?', [id, existing.photoId ?? 0]);
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
