import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

function mapMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    note: row.note,
    userName: row.user_name,
    createdAt: row.created_at,
  };
}

const SELECT_MOVEMENTS = `
  SELECT sm.*, p.name AS product_name, u.name AS user_name
  FROM stock_movements sm
  JOIN products p ON p.id = sm.product_id
  JOIN users u ON u.id = sm.user_id
`;

export async function listStockMovements() {
  const [rows] = await pool.query(`${SELECT_MOVEMENTS} ORDER BY sm.created_at DESC LIMIT 200`);
  return rows.map(mapMovement);
}

export async function addStock({ productId, quantity, note, userId, date }) {
  if (!productId) {
    throw new AppError('Produk wajib dipilih.', 400);
  }
  if (!(Number.isInteger(quantity) && quantity > 0)) {
    throw new AppError('Jumlah stok tambahan harus berupa angka positif.', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [productRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = productRows[0];
    if (!product) {
      throw new AppError('Produk tidak ditemukan.', 404);
    }

    const stockBefore = product.stock;
    const stockAfter = stockBefore + quantity;

    await conn.query('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, productId]);

    const createdAt = date ? new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`) : new Date();

    const [result] = await conn.query(
      'INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, 'masuk', quantity, stockBefore, stockAfter, note ?? null, userId, createdAt],
    );

    await conn.commit();

    const [rows] = await pool.query(`${SELECT_MOVEMENTS} WHERE sm.id = ?`, [result.insertId]);
    return mapMovement(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Koreksi stok manual: isi stok aktual. Selisih dicatat sebagai 'penyesuaian'. Tidak ada hapus riwayat;
// kalau salah, lakukan koreksi baru. Stok dikurangi wajib beralasan.
export async function adjustStock({ productId, newStock, note, userId }) {
  const target = Number(newStock);
  if (!Number.isInteger(target) || target < 0) {
    throw new AppError('Stok aktual harus bilangan bulat 0 atau lebih.', 400);
  }
  const cleanNote = String(note ?? '').trim();
  if (cleanNote.length > 255) {
    throw new AppError('Catatan maksimal 255 karakter.', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [productRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = productRows[0];
    if (!product) {
      throw new AppError('Produk tidak ditemukan.', 404);
    }

    const stockBefore = product.stock;
    const difference = target - stockBefore;
    if (difference === 0) {
      throw new AppError('Stok sama dengan sebelumnya, tidak ada yang diubah.', 400);
    }
    if (difference < 0 && !cleanNote) {
      throw new AppError('Alasan wajib diisi saat stok dikurangi.', 400);
    }

    await conn.query('UPDATE products SET stock = ? WHERE id = ?', [target, productId]);
    const [result] = await conn.query(
      "INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id) VALUES (?, 'penyesuaian', ?, ?, ?, ?, ?)",
      [productId, difference, stockBefore, target, cleanNote || 'Penyesuaian stok manual', userId],
    );

    await conn.commit();

    const [rows] = await pool.query(`${SELECT_MOVEMENTS} WHERE sm.id = ?`, [result.insertId]);
    return mapMovement(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
