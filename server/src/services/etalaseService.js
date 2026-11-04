import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { setMainPhoto } from './mediaService.js';

// Daftar produk untuk menu Etalase Online (admin dan staf). Tidak memuat modal.
export async function listOnlineProducts() {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.size, p.unit, p.status, p.photo_id, p.description, p.show_online,
            p.online_updated_at, u.name AS updated_by
     FROM products p LEFT JOIN users u ON u.id = p.online_updated_by
     WHERE p.category <> 'Botol Kosong'
     ORDER BY p.name ASC`,
  );
  const [gallery] = await pool.query(
    "SELECT id, product_id FROM media WHERE kind = 'produk' AND product_id IS NOT NULL AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC",
  );
  const byProduct = new Map();
  for (const g of gallery) byProduct.set(g.product_id, [...(byProduct.get(g.product_id) ?? []), g.id]);

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    size: p.size,
    unit: p.unit,
    status: p.status,
    photoId: p.photo_id,
    photoIds: byProduct.get(p.id) ?? [],
    description: p.description ?? '',
    showOnline: Boolean(p.show_online),
    updatedBy: p.updated_by,
    updatedAt: p.online_updated_at,
  }));
}

// Staf hanya boleh mengubah tampilan online (deskripsi, tampil/sembunyi, foto utama), bukan harga/stok/modal.
export async function updateOnlineProduct(id, { description, showOnline, mainPhotoId }, user) {
  const [[p]] = await pool.query("SELECT id FROM products WHERE id = ? AND category <> 'Botol Kosong'", [id]);
  if (!p) throw new AppError('Produk tidak ditemukan.', 404);

  if (description !== undefined) {
    const v = String(description ?? '').trim();
    if (v.length > 2000) throw new AppError('Deskripsi maksimal 2000 karakter.', 400);
    await pool.query('UPDATE products SET description = ?, online_updated_by = ?, online_updated_at = NOW() WHERE id = ?', [v || null, user.id, id]);
  }
  if (showOnline !== undefined) {
    await pool.query('UPDATE products SET show_online = ?, online_updated_by = ?, online_updated_at = NOW() WHERE id = ?', [showOnline ? 1 : 0, user.id, id]);
  }
  if (mainPhotoId !== undefined && mainPhotoId !== null) {
    await setMainPhoto(id, Number(mainPhotoId), user);
  }
  return (await listOnlineProducts()).find((x) => x.id === id);
}
