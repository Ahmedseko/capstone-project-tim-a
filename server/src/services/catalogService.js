import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { assertBottleSize } from '../utils/bottleSize.js';

const SELECT_CATALOG = `
  SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.catalog_id = c.id) AS linked_count
  FROM price_catalog c
`;

function mapItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    size: row.size,
    unit: row.unit,
    price: Number(row.price),
    costPrice: Number(row.cost_price),
    linkedCount: Number(row.linked_count),
  };
}

function validate({ name, category, size, unit, price, costPrice }) {
  if (!name?.trim() || !category?.trim() || !size?.trim()) {
    throw new AppError('Nama, kategori, dan ukuran wajib diisi.', 400);
  }
  assertBottleSize(category.trim(), size.trim());
  if (!['botol', 'ml'].includes(unit)) {
    throw new AppError('Satuan tidak valid.', 400);
  }
  if (!(Number(price) > 0)) {
    throw new AppError('Harga harus lebih dari nol.', 400);
  }
  if (!(Number(costPrice ?? 0) >= 0)) {
    throw new AppError('Harga modal tidak boleh negatif.', 400);
  }
}

async function getItem(id) {
  const [rows] = await pool.query(`${SELECT_CATALOG} WHERE c.id = ?`, [id]);
  return rows[0] ? mapItem(rows[0]) : null;
}

function rethrowDuplicate(err) {
  if (err.errno === 1062) throw new AppError('Nama tersebut sudah ada di katalog.', 409);
  throw err;
}

export async function listCatalog() {
  const [rows] = await pool.query(`${SELECT_CATALOG} ORDER BY c.name ASC`);
  return rows.map(mapItem);
}

export async function createCatalogItem(input) {
  validate(input);
  try {
    const [result] = await pool.query(
      'INSERT INTO price_catalog (name, category, size, unit, price, cost_price) VALUES (?, ?, ?, ?, ?, ?)',
      [input.name.trim(), input.category.trim(), input.size.trim(), input.unit, Number(input.price), Number(input.costPrice ?? 0)],
    );
    return getItem(result.insertId);
  } catch (err) {
    return rethrowDuplicate(err);
  }
}

// Harga katalog berubah -> harga semua produk yang terhubung ikut berubah.
// Transaksi lama aman: sale_items menyimpan unit_price sendiri.
export async function updateCatalogItem(id, input) {
  const existing = await getItem(id);
  if (!existing) throw new AppError('Item katalog tidak ditemukan.', 404);

  const next = { ...existing, ...input };
  validate(next);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE price_catalog SET name = ?, category = ?, size = ?, unit = ?, price = ?, cost_price = ? WHERE id = ?',
      [next.name.trim(), next.category.trim(), next.size.trim(), next.unit, Number(next.price), Number(next.costPrice ?? 0), id],
    );
    if (Number(next.price) !== existing.price) {
      await conn.query('UPDATE products SET price = ? WHERE catalog_id = ?', [Number(next.price), id]);
    }
    if (Number(next.costPrice ?? 0) !== existing.costPrice) {
      await conn.query('UPDATE products SET cost_price = ? WHERE catalog_id = ?', [Number(next.costPrice ?? 0), id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    return rethrowDuplicate(err);
  } finally {
    conn.release();
  }
  return getItem(id);
}

export async function deleteCatalogItem(id) {
  const existing = await getItem(id);
  if (!existing) throw new AppError('Item katalog tidak ditemukan.', 404);
  await pool.query('DELETE FROM price_catalog WHERE id = ?', [id]); // produk terkait: catalog_id jadi NULL
  return { deleted: true };
}
