import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhone } from '../utils/phone.js';
import { todayIso } from '../utils/date.js';

const MAX_LINES = 20;
const MAX_QTY_RACIK = 10;
const MAX_QTY_PRODUK = 20;
const ORDERS_PER_HOUR = 5; // per nomor WhatsApp

const isVariant = (p) => p.unit === 'ml';
const isBottle = (p) => p.category === 'Botol Kosong';
const capacityOf = (bottle) => parseInt(bottle.size, 10) || 0;

// Katalog untuk konsumen. Tidak ada modal dan tidak ada angka stok, hanya tersedia/habis.
export async function getCatalog() {
  const [rows] = await pool.query(
    "SELECT * FROM products WHERE status = 'aktif' AND (show_online = 1 OR category = 'Botol Kosong') ORDER BY name ASC",
  );
  return {
    products: rows
      .filter((p) => !isBottle(p))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        size: p.size,
        unit: p.unit,
        price: Number(p.price),
        available: p.stock > 0,
        photoId: p.photo_id,
        description: p.description ?? '',
      })),
    bottles: rows
      .filter(isBottle)
      .map((p) => ({ id: p.id, name: p.name, size: p.size, capacity: capacityOf(p), price: Number(p.price), available: p.stock > 0 }))
      .sort((a, b) => a.capacity - b.capacity || a.price - b.price),
  };
}

function cleanText(value, { min = 0, max, label, required = false }) {
  // buang karakter kontrol; React di klien sudah meng-escape, ini pengaman tambahan di penyimpanan
  const v = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!v && !required) return null;
  if (v.length < min || v.length > max) {
    throw new AppError(`${label} harus ${min}-${max} karakter.`, 400);
  }
  return v;
}

async function nextOrderNumber(conn) {
  const prefix = `ORD-${todayIso().replace(/-/g, '')}-`;
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM online_orders WHERE order_number LIKE ?', [`${prefix}%`]);
  return `${prefix}${String(n + 1).padStart(3, '0')}`;
}

// Semua harga dan ketersediaan dihitung ulang dari database; yang dikirim klien hanya pilihan (id, isi, jumlah).
export async function createOrder(input) {
  if (input.website) {
    throw new AppError('Permintaan tidak valid.', 400); // kolom jebakan untuk bot
  }

  const customerName = cleanText(input.customerName, { min: 2, max: 100, label: 'Nama', required: true });
  const phone = normalizePhone(input.customerPhone);
  if (!phone) {
    throw new AppError('Nomor WhatsApp tidak valid. Contoh: 081234567890.', 400);
  }
  if (!['ambil', 'kirim'].includes(input.fulfillment)) {
    throw new AppError('Pilih metode: ambil di toko atau dikirim.', 400);
  }
  const address =
    input.fulfillment === 'kirim' ? cleanText(input.address, { min: 10, max: 400, label: 'Alamat pengiriman', required: true }) : null;
  const note = cleanText(input.note, { max: 300, label: 'Catatan' });

  const rawLines = input.lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0 || rawLines.length > MAX_LINES) {
    throw new AppError(`Keranjang harus berisi 1 sampai ${MAX_LINES} item.`, 400);
  }

  const ids = new Set();
  for (const l of rawLines) {
    for (const key of ['variantId', 'bottleId', 'productId']) {
      if (l?.[key] !== undefined && !Number.isInteger(Number(l[key]))) throw new AppError('Data keranjang tidak valid.', 400);
      if (l?.[key] !== undefined) ids.add(Number(l[key]));
    }
  }
  if (ids.size === 0) throw new AppError('Data keranjang tidak valid.', 400);
  const [productRows] = await pool.query('SELECT * FROM products WHERE id IN (?)', [[...ids]]);
  const byId = new Map(productRows.map((p) => [p.id, p]));

  const need = new Map(); // produk -> total kebutuhan (ml atau pcs) di seluruh baris
  const addNeed = (p, n) => need.set(p.id, (need.get(p.id) ?? 0) + n);
  const lines = [];
  let total = 0;

  for (const l of rawLines) {
    const qty = Number(l?.quantity);
    if (l?.kind === 'racik') {
      const variant = byId.get(Number(l.variantId));
      const bottle = byId.get(Number(l.bottleId));
      const ml = Number(l.ml);
      if (!variant || !isVariant(variant) || variant.status !== 'aktif' || !variant.show_online) {
        throw new AppError('Salah satu varian parfum tidak tersedia.', 400);
      }
      if (!bottle || !isBottle(bottle) || bottle.status !== 'aktif') {
        throw new AppError('Salah satu ukuran botol tidak tersedia.', 400);
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_RACIK) {
        throw new AppError(`Jumlah botol per racikan 1-${MAX_QTY_RACIK}.`, 400);
      }
      if (!Number.isInteger(ml) || ml < 1 || ml > capacityOf(bottle)) {
        throw new AppError(`Isi harus 1 sampai ${capacityOf(bottle)} ml untuk botol ${bottle.size}.`, 400);
      }
      const unitTotal = ml * Number(variant.price) + Number(bottle.price);
      addNeed(variant, ml * qty);
      addNeed(bottle, qty);
      total += unitTotal * qty;
      lines.push({
        kind: 'racik',
        label: variant.name,
        detail: `${ml} ml dalam botol ${bottle.size}`,
        quantity: qty,
        unitTotal,
        components: [
          { productId: variant.id, quantity: ml, unitPrice: Number(variant.price) },
          { productId: bottle.id, quantity: 1, unitPrice: Number(bottle.price) },
        ],
      });
    } else if (l?.kind === 'produk') {
      const product = byId.get(Number(l.productId));
      if (!product || isVariant(product) || isBottle(product) || product.status !== 'aktif' || !product.show_online) {
        throw new AppError('Salah satu produk tidak tersedia.', 400);
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PRODUK) {
        throw new AppError(`Jumlah produk 1-${MAX_QTY_PRODUK}.`, 400);
      }
      addNeed(product, qty);
      total += Number(product.price) * qty;
      lines.push({
        kind: 'produk',
        label: product.name,
        detail: product.size,
        quantity: qty,
        unitTotal: Number(product.price),
        components: [{ productId: product.id, quantity: 1, unitPrice: Number(product.price) }],
      });
    } else {
      throw new AppError('Data keranjang tidak valid.', 400);
    }
  }

  // Stok TIDAK dikurangi di sini; hanya memastikan pesanan masuk akal saat ini.
  for (const [pid, n] of need) {
    if (n > byId.get(pid).stock) {
      throw new AppError(`Stok "${byId.get(pid).name}" tidak cukup untuk jumlah yang dipesan.`, 400);
    }
  }

  const [[{ recent }]] = await pool.query(
    'SELECT COUNT(*) AS recent FROM online_orders WHERE customer_phone = ? AND created_at > NOW() - INTERVAL 1 HOUR',
    [phone],
  );
  if (recent >= ORDERS_PER_HOUR) {
    throw new AppError('Terlalu banyak pesanan dalam satu jam. Silakan hubungi toko lewat WhatsApp.', 429);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const orderNumber = await nextOrderNumber(conn);
      const [result] = await conn.query(
        `INSERT INTO online_orders (order_number, customer_name, customer_phone, fulfillment, address, note, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderNumber, customerName, phone, input.fulfillment, address, note, total],
      );
      for (const line of lines) {
        await conn.query(
          `INSERT INTO online_order_lines (order_id, kind, label, detail, quantity, unit_total, subtotal, components)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [result.insertId, line.kind, line.label, line.detail, line.quantity, line.unitTotal, line.unitTotal * line.quantity, JSON.stringify(line.components)],
        );
      }
      await conn.commit();
      return { orderNumber, status: 'baru', total, fulfillment: input.fulfillment };
    } catch (err) {
      await conn.rollback();
      if (err.errno === 1062 && attempt < 4) continue; // nomor pesanan bentrok dengan pesanan lain: coba lagi
      throw err;
    } finally {
      conn.release();
    }
  }
  throw new AppError('Gagal membuat pesanan. Coba lagi.', 500);
}

// Cek status: wajib nomor pesanan DAN nomor WhatsApp yang cocok. Salah satu salah -> jawaban sama (404).
export async function lookupOrder({ orderNumber, phone }) {
  const notFound = new AppError('Pesanan tidak ditemukan. Periksa nomor pesanan dan nomor WhatsApp.', 404);
  const normalized = normalizePhone(phone);
  const number = String(orderNumber ?? '').trim().toUpperCase();
  if (!normalized || !/^ORD-\d{8}-\d{3,}$/.test(number)) throw notFound;

  const [rows] = await pool.query('SELECT * FROM online_orders WHERE order_number = ? AND customer_phone = ?', [number, normalized]);
  const order = rows[0];
  if (!order) throw notFound;

  const [lines] = await pool.query('SELECT label, detail, quantity, subtotal FROM online_order_lines WHERE order_id = ? ORDER BY id ASC', [order.id]);
  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    status: order.status,
    fulfillment: order.fulfillment,
    total: Number(order.total),
    lines: lines.map((l) => ({ label: l.label, detail: l.detail, quantity: l.quantity, subtotal: Number(l.subtotal) })),
  };
}
