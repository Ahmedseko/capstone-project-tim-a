import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { generateTransactionNumber } from '../utils/transactionNumber.js';
import { todayIso } from '../utils/date.js';

const SELECT_SALES = `
  SELECT s.*, u.name AS user_name, cu.name AS cancelled_by_name
  FROM sales s
  JOIN users u ON u.id = s.user_id
  LEFT JOIN users cu ON cu.id = s.cancelled_by
`;

async function attachItems(sales, { includeCost = false } = {}) {
  if (sales.length === 0) return [];
  const ids = sales.map((s) => s.id);
  const [items] = await pool.query(
    `SELECT si.*, p.name AS product_name, p.unit AS product_unit, p.size AS product_size
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     WHERE si.sale_id IN (?)
     ORDER BY si.id ASC`,
    [ids],
  );

  const itemsBySale = new Map();
  for (const item of items) {
    const list = itemsBySale.get(item.sale_id) ?? [];
    list.push({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      productUnit: item.product_unit,
      productSize: item.product_size,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      costPrice: item.cost_price == null ? null : Number(item.cost_price),
    });
    itemsBySale.set(item.sale_id, list);
  }

  return sales.map((s) => {
    const total = Number(s.total);
    const discount = Number(s.discount);
    const amountPaid = s.amount_paid == null ? null : Number(s.amount_paid);
    const saleItems = itemsBySale.get(s.id) ?? [];
    // Modal hanya bisa dihitung kalau semua item punya modal tercatat; selain itu laba = null (belum diketahui).
    const costKnown = saleItems.length > 0 && saleItems.every((i) => i.costPrice != null);
    const costTotal = costKnown ? saleItems.reduce((sum, i) => sum + i.costPrice * i.quantity, 0) : null;
    return {
      id: s.id,
      transactionNumber: s.transaction_number,
      date: s.date,
      subtotal: total + discount,
      discount,
      total,
      paymentMethod: s.payment_method,
      customerNote: s.customer_note,
      amountPaid,
      change: amountPaid == null ? null : amountPaid - total,
      status: s.status,
      cancelReason: s.cancel_reason,
      cancelledAt: s.cancelled_at,
      cancelledBy: s.cancelled_by_name,
      userName: s.user_name,
      createdAt: s.created_at,
      items: saleItems.map(({ costPrice, ...item }) => item), // modal per item tidak dikirim ke klien
      ...(includeCost ? { costTotal, profit: costTotal == null ? null : total - costTotal } : {}),
    };
  });
}

async function getSale(id, opts) {
  const [rows] = await pool.query(`${SELECT_SALES} WHERE s.id = ?`, [id]);
  const [sale] = await attachItems(rows, opts);
  return sale ?? null;
}

// Transaksi batal tidak ikut laporan; hanya halaman Penjualan yang memintanya (includeCancelled).
export async function listSales({ from, to, includeCancelled = false, includeCost = false } = {}) {
  const where = [];
  const params = [];
  if (!includeCancelled) where.push("s.status = 'selesai'");
  if (from && to) {
    where.push('s.date BETWEEN ? AND ?');
    params.push(from, to);
  }
  const query = `${SELECT_SALES} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY s.created_at DESC`;

  const [rows] = await pool.query(query, params);
  return attachItems(rows, { includeCost });
}

function computeDiscount(subtotal, discountType, discountValue) {
  const value = Number(discountValue ?? 0);
  if (!(value >= 0)) {
    throw new AppError('Diskon tidak boleh negatif.', 400);
  }
  if (value === 0) return 0;

  let discount;
  if (discountType === 'persen') {
    if (value > 100) throw new AppError('Diskon persen maksimal 100%.', 400);
    discount = Math.round((subtotal * value) / 100);
  } else if (discountType === 'rp' || discountType == null) {
    discount = Math.round(value);
  } else {
    throw new AppError('Jenis diskon tidak valid.', 400);
  }
  if (discount > subtotal) {
    throw new AppError('Diskon tidak boleh melebihi subtotal.', 400);
  }
  return discount;
}

export async function createSale({
  items,
  paymentMethod,
  userId,
  discountType,
  discountValue,
  customerNote,
  amountPaid,
  includeCost = false,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Minimal satu produk harus ditambahkan ke transaksi.', 400);
  }
  if (!['tunai', 'qris', 'transfer'].includes(paymentMethod)) {
    throw new AppError('Metode pembayaran tidak valid.', 400);
  }

  // Satu produk bisa muncul di beberapa baris (mis. dua racikan varian yang sama);
  // jumlahkan dulu supaya cek stok memakai total, bukan per baris.
  const quantityByProduct = new Map();
  for (const rawItem of items) {
    const quantity = Number(rawItem.quantity);
    const productId = Number(rawItem.productId);
    if (!(Number.isInteger(quantity) && quantity > 0) || !Number.isInteger(productId)) {
      throw new AppError('Jumlah penjualan harus berupa angka positif.', 400);
    }
    quantityByProduct.set(productId, (quantityByProduct.get(productId) ?? 0) + quantity);
  }

  const note = customerNote?.toString().trim().slice(0, 255) || null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const resolvedItems = [];

    // Urutkan id agar kunci baris selalu dalam urutan sama (hindari deadlock antar kasir).
    for (const productId of [...quantityByProduct.keys()].sort((a, b) => a - b)) {
      const quantity = quantityByProduct.get(productId);

      const [productRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
      const product = productRows[0];
      if (!product) {
        throw new AppError('Salah satu produk tidak ditemukan.', 404);
      }
      if (product.status !== 'aktif') {
        throw new AppError(`Produk "${product.name}" sudah tidak aktif.`, 400);
      }
      if (quantity > product.stock) {
        throw new AppError(`Stok tidak mencukupi untuk produk "${product.name}".`, 400);
      }

      const lineSubtotal = quantity * Number(product.price);
      subtotal += lineSubtotal;
      resolvedItems.push({
        product,
        quantity,
        unitPrice: Number(product.price),
        // salinan modal saat transaksi; 0 berarti belum diisi admin -> NULL
        costPrice: Number(product.cost_price) > 0 ? Number(product.cost_price) : null,
        subtotal: lineSubtotal,
      });
    }

    const discount = computeDiscount(subtotal, discountType, discountValue);
    const total = subtotal - discount;

    let paid = null;
    if (paymentMethod === 'tunai' && amountPaid != null && amountPaid !== '') {
      paid = Number(amountPaid);
      if (!(paid >= total)) {
        throw new AppError('Uang diterima kurang dari total belanja.', 400);
      }
    }

    const date = todayIso();
    const transactionNumber = await generateTransactionNumber(conn, date);

    const [saleResult] = await conn.query(
      `INSERT INTO sales (transaction_number, date, total, discount, payment_method, customer_note, amount_paid, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transactionNumber, date, total, discount, paymentMethod, note, paid, userId],
    );
    const saleId = saleResult.insertId;

    for (const item of resolvedItems) {
      await conn.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [saleId, item.product.id, item.quantity, item.unitPrice, item.costPrice, item.subtotal],
      );

      const stockBefore = item.product.stock;
      const stockAfter = stockBefore - item.quantity;
      await conn.query('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, item.product.id]);
      await conn.query(
        'INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.product.id, 'penjualan', -item.quantity, stockBefore, stockAfter, `Penjualan ${transactionNumber}`, userId],
      );
    }

    await conn.commit();
    return getSale(saleId, { includeCost });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Batalkan transaksi: stok dikembalikan lewat movement 'penjualan' bernilai positif
// (closing menghitung terjual = -jumlah movement, jadi pembatalan otomatis menetralkan penjualannya).
export async function cancelSale({ id, reason, userId, includeCost = false }) {
  const cleanReason = reason?.toString().trim().slice(0, 255);
  if (!cleanReason) {
    throw new AppError('Alasan pembatalan wajib diisi.', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [saleRows] = await conn.query('SELECT * FROM sales WHERE id = ? FOR UPDATE', [id]);
    const sale = saleRows[0];
    if (!sale) {
      throw new AppError('Transaksi tidak ditemukan.', 404);
    }
    if (sale.status === 'batal') {
      throw new AppError('Transaksi ini sudah dibatalkan.', 400);
    }

    const [closed] = await conn.query(
      "SELECT id FROM daily_closings WHERE closing_date = ? AND status = 'ditutup'",
      [sale.date],
    );
    if (closed.length > 0) {
      throw new AppError('Transaksi tidak bisa dibatalkan karena hari tersebut sudah di-closing.', 400);
    }

    const [items] = await conn.query('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY product_id ASC', [id]);
    for (const item of items) {
      const [productRows] = await conn.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
      const stockBefore = productRows[0].stock;
      const stockAfter = stockBefore + item.quantity;
      await conn.query('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, item.product_id]);
      await conn.query(
        'INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.product_id, 'penjualan', item.quantity, stockBefore, stockAfter, `Pembatalan ${sale.transaction_number}`, userId],
      );
    }

    await conn.query(
      "UPDATE sales SET status = 'batal', cancel_reason = ?, cancelled_at = NOW(), cancelled_by = ? WHERE id = ?",
      [cleanReason, userId, id],
    );

    await conn.commit();
    return getSale(id, { includeCost });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
