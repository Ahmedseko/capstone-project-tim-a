import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';

// Foto disimpan di database (layanan backend sengaja tidak boleh menulis file). Klien memperkecil gambar
// sebelum mengunggah; batas di sini hanya pengaman.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_STORE_PHOTOS = 12;

// Tipe ditentukan dari isi file (magic bytes), bukan dari header yang dikirim klien. SVG sengaja tidak diizinkan.
export function detectImageMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export async function saveImage({ buffer, kind, userId }) {
  if (!['produk', 'toko'].includes(kind)) {
    throw new AppError('Jenis foto tidak valid.', 400);
  }
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

  if (kind === 'toko') {
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM media WHERE kind = 'toko'");
    if (n >= MAX_STORE_PHOTOS) {
      throw new AppError(`Foto toko maksimal ${MAX_STORE_PHOTOS}. Hapus salah satu dulu.`, 400);
    }
  }

  const [[{ next }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM media WHERE kind = ?', [kind]);
  const [result] = await pool.query(
    'INSERT INTO media (kind, mime, size, data, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [kind, mime, buffer.length, buffer, next, userId ?? null],
  );
  return { id: result.insertId, kind, mime, size: buffer.length };
}

export async function getImage(id) {
  const [rows] = await pool.query('SELECT mime, data FROM media WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function deleteImage(id) {
  const [result] = await pool.query('DELETE FROM media WHERE id = ?', [id]); // products.photo_id otomatis NULL
  if (result.affectedRows === 0) {
    throw new AppError('Foto tidak ditemukan.', 404);
  }
  return { deleted: true };
}

export async function listStorePhotoIds() {
  const [rows] = await pool.query("SELECT id FROM media WHERE kind = 'toko' ORDER BY sort_order ASC, id ASC");
  return rows.map((r) => r.id);
}
