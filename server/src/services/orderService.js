import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { performSale, cancelSaleTx } from './saleService.js';

export const ORDER_STATUSES = ['baru', 'dikonfirmasi', 'diproses', 'siap', 'selesai', 'batal'];

// Urutan status setelah konfirmasi. Hanya boleh maju satu langkah; batal punya jalurnya sendiri.
const NEXT_STATUS = { dikonfirmasi: 'diproses', diproses: 'siap', siap: 'selesai' };

function mapOrder(row, lines = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    fulfillment: row.fulfillment,
    address: row.address,
    note: row.note,
    total: Number(row.total),
    status: row.status,
    saleId: row.sale_id,
    saleNumber: row.sale_number ?? null,
    cancelReason: row.cancel_reason,
    confirmedBy: row.confirmed_by_name ?? null,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    lines,
  };
}

const SELECT_ORDERS = `
  SELECT o.*, s.transaction_number AS sale_number, u.name AS confirmed_by_name
  FROM online_orders o
  LEFT JOIN sales s ON s.id = o.sale_id
  LEFT JOIN users u ON u.id = o.confirmed_by
`;

async function attachLines(rows) {
  if (rows.length === 0) return [];
  const [lines] = await pool.query(
    'SELECT order_id, kind, label, detail, quantity, unit_total, subtotal FROM online_order_lines WHERE order_id IN (?) ORDER BY id ASC',
    [rows.map((r) => r.id)],
  );
  const byOrder = new Map();
  for (const l of lines) {
    const list = byOrder.get(l.order_id) ?? [];
    list.push({ kind: l.kind, label: l.label, detail: l.detail, quantity: l.quantity, unitTotal: Number(l.unit_total), subtotal: Number(l.subtotal) });
    byOrder.set(l.order_id, list);
  }
  return rows.map((r) => mapOrder(r, byOrder.get(r.id) ?? []));
}

export async function listOrders({ status, q } = {}) {
  const where = [];
  const params = [];
  if (status === 'aktif') {
    where.push("o.status IN ('baru', 'dikonfirmasi', 'diproses', 'siap')");
  } else if (ORDER_STATUSES.includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (q?.trim()) {
    where.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
    const like = `%${q.trim().replace(/[%_]/g, '')}%`;
    params.push(like, like, like);
  }
  const [rows] = await pool.query(
    `${SELECT_ORDERS} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY o.created_at DESC, o.id DESC LIMIT 300`,
    params,
  );
  return attachLines(rows);
}

export async function getOrder(id) {
  const [rows] = await pool.query(`${SELECT_ORDERS} WHERE o.id = ?`, [id]);
  const [order] = await attachLines(rows);
  if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
  return order;
}

// Ringkasan untuk lencana menu dan dashboard.
export async function orderSummary() {
  const [rows] = await pool.query('SELECT status, COUNT(*) AS n FROM online_orders GROUP BY status');
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  const [[month]] = await pool.query(
    "SELECT COUNT(*) AS n FROM online_orders WHERE status = 'selesai' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')",
  );
  return {
    baru: by.baru ?? 0,
    diproses: (by.dikonfirmasi ?? 0) + (by.diproses ?? 0) + (by.siap ?? 0),
    selesai: by.selesai ?? 0,
    selesaiBulanIni: Number(month.n),
    batal: by.batal ?? 0,
  };
}

// Konfirmasi: di sinilah stok berkurang. Dibuat satu penjualan (tabel sales) dengan harga saat pelanggan memesan,
// sehingga laporan, closing, laba, dan riwayat stok langsung ikut. Semua dalam satu transaksi database.
export async function confirmOrder({ id, paymentMethod, userId }) {
  if (!['tunai', 'qris', 'transfer'].includes(paymentMethod)) {
    throw new AppError('Pilih metode pembayaran yang dipakai pelanggan.', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM online_orders WHERE id = ? FOR UPDATE', [id]);
    const order = rows[0];
    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.status !== 'baru') {
      throw new AppError('Hanya pesanan berstatus Baru yang bisa dikonfirmasi.', 400);
    }

    const [lines] = await conn.query('SELECT quantity, components FROM online_order_lines WHERE order_id = ?', [id]);
    const items = [];
    for (const line of lines) {
      const components = typeof line.components === 'string' ? JSON.parse(line.components) : line.components;
      for (const c of components) {
        items.push({ productId: c.productId, quantity: c.quantity * line.quantity, unitPrice: c.unitPrice });
      }
    }

    const { saleId } = await performSale(conn, {
      items,
      paymentMethod,
      userId,
      customerNote: `Online ${order.order_number} - ${order.customer_name}`,
      trustedPrices: true,
    });

    await conn.query(
      "UPDATE online_orders SET status = 'dikonfirmasi', sale_id = ?, confirmed_by = ?, confirmed_at = NOW() WHERE id = ?",
      [saleId, userId, id],
    );

    await conn.commit();
    return getOrder(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function advanceOrder({ id, status }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT status FROM online_orders WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) throw new AppError('Pesanan tidak ditemukan.', 404);

    const next = NEXT_STATUS[rows[0].status];
    if (!next) {
      throw new AppError(
        rows[0].status === 'baru' ? 'Konfirmasi pesanan dulu sebelum mengubah status.' : 'Status pesanan ini tidak bisa diubah lagi.',
        400,
      );
    }
    if (status !== next) {
      throw new AppError(`Dari status ini hanya bisa dilanjutkan ke "${next}".`, 400);
    }
    await conn.query('UPDATE online_orders SET status = ? WHERE id = ?', [next, id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getOrder(id);
}

// Batal: kalau stok sudah berkurang (sudah dikonfirmasi), stok dikembalikan lewat pembatalan penjualannya.
export async function cancelOrder({ id, reason, userId }) {
  const cleanReason = reason?.toString().trim().slice(0, 255);
  if (!cleanReason) throw new AppError('Alasan pembatalan wajib diisi.', 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM online_orders WHERE id = ? FOR UPDATE', [id]);
    const order = rows[0];
    if (!order) throw new AppError('Pesanan tidak ditemukan.', 404);
    if (order.status === 'batal') throw new AppError('Pesanan ini sudah dibatalkan.', 400);
    if (order.status === 'selesai') throw new AppError('Pesanan yang sudah selesai tidak bisa dibatalkan.', 400);

    if (order.sale_id) {
      await cancelSaleTx(conn, { id: order.sale_id, reason: `Pesanan online ${order.order_number} dibatalkan: ${cleanReason}`, userId });
    }
    await conn.query("UPDATE online_orders SET status = 'batal', cancel_reason = ? WHERE id = ?", [cleanReason, id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getOrder(id);
}
