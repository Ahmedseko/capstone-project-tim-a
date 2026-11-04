import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

// Foto disimpan di database (layanan backend sengaja tidak boleh menulis file). Klien memperkecil gambar
// sebelum mengunggah; batas di sini hanya pengaman.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_STORE_PHOTOS = 12;
const MAX_PRODUCT_PHOTOS = 5;
const TRASH_DAYS = 14;

// Tipe ditentukan dari isi file (magic bytes), bukan dari header yang dikirim klien. SVG sengaja tidak diizinkan.
export function detectImageMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

// Foto toko hanya admin; foto produk boleh admin dan staf.
function assertCanManage(kind, user) {
  if (kind === 'toko' && user.role !== 'admin') {
    throw new AppError('Foto toko hanya bisa diubah admin.', 403);
  }
}

// Foto utama produk harus foto aktif; kalau yang sekarang sudah dihapus/kosong, pakai foto aktif pertama.
async function syncMainPhoto(productId) {
  const [[p]] = await pool.query('SELECT photo_id FROM products WHERE id = ?', [productId]);
  if (!p) return;
  const [[cur]] = await pool.query('SELECT id FROM media WHERE id = ? AND deleted_at IS NULL', [p.photo_id ?? 0]);
  if (cur) return;
  const [[next]] = await pool.query(
    "SELECT id FROM media WHERE product_id = ? AND kind = 'produk' AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC LIMIT 1",
    [productId],
  );
  await pool.query('UPDATE products SET photo_id = ? WHERE id = ?', [next?.id ?? null, productId]);
}

// Catat siapa terakhir mengubah tampilan online produk ini.
async function touchProduct(productId, userId) {
  await pool.query('UPDATE products SET online_updated_by = ?, online_updated_at = NOW() WHERE id = ?', [userId, productId]);
}

export async function saveImage({ buffer, kind, productId, user }) {
  if (!['produk', 'toko'].includes(kind)) {
    throw new AppError('Jenis foto tidak valid.', 400);
  }
  assertCanManage(kind, user);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('File foto kosong.', 400);
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError('Ukuran foto maksimal 2 MB.', 413);
  }
  const mime = detectImageMime(buffer);
  if (!mime) {
    throw new AppError('Format foto harus JPEG, PNG, atau WebP.', 415);
  }

  let pid = null;
  if (kind === 'toko') {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM media WHERE kind = 'toko' AND deleted_at IS NULL");
    if (n >= MAX_STORE_PHOTOS) {
      throw new AppError(`Foto toko maksimal ${MAX_STORE_PHOTOS}. Hapus salah satu dulu.`, 400);
    }
  } else {
    pid = Number(productId);
    const found = Number.isInteger(pid) ? (await pool.query('SELECT id FROM products WHERE id = ?', [pid]))[0] : [];
    if (found.length === 0) throw new AppError('Produk tidak ditemukan.', 404);
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM media WHERE kind = 'produk' AND product_id = ? AND deleted_at IS NULL", [pid]);
    if (n >= MAX_PRODUCT_PHOTOS) {
      throw new AppError(`Foto per produk maksimal ${MAX_PRODUCT_PHOTOS}. Hapus salah satu dulu.`, 400);
    }
  }

  const [[{ next }]] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM media WHERE kind = ? AND product_id <=> ?',
    [kind, pid],
  );
  const [result] = await pool.query(
    'INSERT INTO media (kind, mime, size, data, sort_order, created_by, product_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [kind, mime, buffer.length, buffer, next, user.id, pid],
  );
  if (pid) {
    await syncMainPhoto(pid);
    await touchProduct(pid, user.id);
  }
  return { id: result.insertId, kind, mime, size: buffer.length };
}

export async function getImage(id) {
  const [rows] = await pool.query('SELECT mime, data FROM media WHERE id = ?', [id]);
  return rows[0] ?? null;
}

async function getRow(id) {
  const [[row]] = await pool.query('SELECT id, kind, product_id, deleted_at FROM media WHERE id = ?', [id]);
  if (!row) throw new AppError('Foto tidak ditemukan.', 404);
  return row;
}

// Hapus = masuk tong sampah (bisa dipulihkan TRASH_DAYS hari), bukan hilang langsung.
export async function deleteImage(id, user) {
  const row = await getRow(id);
  assertCanManage(row.kind, user);
  if (row.deleted_at) throw new AppError('Foto sudah ada di tong sampah.', 400);
  await pool.query('UPDATE media SET deleted_at = NOW(), deleted_by = ? WHERE id = ?', [user.id, id]);
  if (row.product_id) {
    await syncMainPhoto(row.product_id);
    await touchProduct(row.product_id, user.id);
  }
  return { deleted: true };
}

export async function restoreImage(id, user) {
  const row = await getRow(id);
  assertCanManage(row.kind, user);
  if (!row.deleted_at) throw new AppError('Foto ini tidak ada di tong sampah.', 400);
  if (row.kind === 'toko') {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM media WHERE kind = 'toko' AND deleted_at IS NULL");
    if (n >= MAX_STORE_PHOTOS) throw new AppError(`Foto toko sudah ${MAX_STORE_PHOTOS}. Hapus salah satu dulu.`, 400);
  } else {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM media WHERE kind = 'produk' AND product_id = ? AND deleted_at IS NULL", [row.product_id]);
    if (n >= MAX_PRODUCT_PHOTOS) throw new AppError(`Foto produk ini sudah ${MAX_PRODUCT_PHOTOS}. Hapus salah satu dulu.`, 400);
  }
  await pool.query('UPDATE media SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);
  if (row.product_id) {
    await syncMainPhoto(row.product_id);
    await touchProduct(row.product_id, user.id);
  }
  return { restored: true };
}

// Hapus permanen hanya untuk yang sudah di tong sampah, dan hanya admin (dijaga di route).
export async function purgeImage(id) {
  const row = await getRow(id);
  if (!row.deleted_at) throw new AppError('Hapus dulu ke tong sampah.', 400);
  await pool.query('DELETE FROM media WHERE id = ?', [id]);
  return { deleted: true };
}

export async function listTrash(user) {
  await pool.query('DELETE FROM media WHERE deleted_at < NOW() - INTERVAL ? DAY', [TRASH_DAYS]); // kedaluwarsa otomatis
  const [rows] = await pool.query(
    `SELECT m.id, m.kind, m.product_id, m.deleted_at, p.name AS product_name, u.name AS deleted_by_name
     FROM media m
     LEFT JOIN products p ON p.id = m.product_id
     LEFT JOIN users u ON u.id = m.deleted_by
     WHERE m.deleted_at IS NOT NULL ${user.role === 'admin' ? '' : "AND m.kind = 'produk'"}
     ORDER BY m.deleted_at DESC`,
    [],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    productId: r.product_id,
    productName: r.product_name,
    deletedAt: r.deleted_at,
    deletedBy: r.deleted_by_name,
    expiresInDays: Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(r.deleted_at).getTime()) / 86400000)),
  }));
}

export async function listStorePhotoIds() {
  const [rows] = await pool.query("SELECT id FROM media WHERE kind = 'toko' AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC");
  return rows.map((r) => r.id);
}

// Jadikan salah satu foto galeri sebagai foto utama produk.
export async function setMainPhoto(productId, mediaId, user) {
  const [[row]] = await pool.query(
    "SELECT id FROM media WHERE id = ? AND product_id = ? AND kind = 'produk' AND deleted_at IS NULL",
    [mediaId, productId],
  );
  if (!row) throw new AppError('Foto tidak ada di galeri produk ini.', 400);
  await pool.query('UPDATE products SET photo_id = ? WHERE id = ?', [mediaId, productId]);
  await touchProduct(productId, user.id);
}
