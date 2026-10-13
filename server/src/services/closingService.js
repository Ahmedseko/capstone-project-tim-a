import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { todayIso } from '../utils/date.js';

async function getTodaySalesTotals(conn, date) {
  const [[totals]] = await conn.query(
    `SELECT COUNT(*) AS total_transactions, COALESCE(SUM(total), 0) AS total_revenue
     FROM sales WHERE status = 'selesai' AND date = ?`,
    [date],
  );
  const [[itemTotals]] = await conn.query(
    `SELECT COALESCE(SUM(si.quantity), 0) AS total_items_sold
     FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id AND p.unit = 'botol'
     WHERE s.status = 'selesai' AND s.date = ?`,
    [date],
  );
  const [byMethod] = await conn.query(
    `SELECT payment_method, COALESCE(SUM(total), 0) AS total FROM sales
     WHERE status = 'selesai' AND date = ? GROUP BY payment_method`,
    [date],
  );
  const paid = Object.fromEntries(byMethod.map((r) => [r.payment_method, Number(r.total)]));
  return {
    totalTransactions: totals.total_transactions,
    totalRevenue: Number(totals.total_revenue),
    totalItemsSold: Number(itemTotals.total_items_sold),
    totalCash: paid.tunai ?? 0,
    totalQris: paid.qris ?? 0,
    totalTransfer: paid.transfer ?? 0,
  };
}

// Uang tunai seharusnya di laci = modal awal laci + penjualan tunai hari itu.
function cashFields({ openingCash, totalCash, cashActual }) {
  const expected = openingCash + totalCash;
  return {
    openingCash,
    cashExpected: expected,
    cashActual,
    cashDifference: cashActual == null ? null : cashActual - expected,
  };
}

async function computeProductStockLines(conn, date) {
  const [products] = await conn.query("SELECT * FROM products WHERE status = 'aktif' ORDER BY name ASC");

  const [movements] = await conn.query(
    `SELECT product_id, type, quantity FROM stock_movements
     WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [date, date],
  );

  const addedByProduct = new Map();
  const soldByProduct = new Map();
  for (const m of movements) {
    if (m.type === 'masuk') {
      addedByProduct.set(m.product_id, (addedByProduct.get(m.product_id) ?? 0) + m.quantity);
    } else if (m.type === 'penjualan') {
      soldByProduct.set(m.product_id, (soldByProduct.get(m.product_id) ?? 0) + -m.quantity);
    }
  }

  return products.map((p) => {
    const stockAdded = addedByProduct.get(p.id) ?? 0;
    const quantitySold = soldByProduct.get(p.id) ?? 0;
    const systemStock = p.stock;
    const openingStock = systemStock - stockAdded + quantitySold;
    return {
      productId: p.id,
      productName: p.name,
      openingStock,
      stockAdded,
      quantitySold,
      systemStock,
    };
  });
}

export async function getTodayClosing() {
  const date = todayIso();

  const [existingRows] = await pool.query('SELECT * FROM daily_closings WHERE closing_date = ?', [date]);
  const existing = existingRows[0];

  if (existing && existing.status === 'ditutup') {
    const [items] = await pool.query(
      `SELECT dci.*, p.name AS product_name FROM daily_closing_items dci
       JOIN products p ON p.id = dci.product_id WHERE dci.closing_id = ? ORDER BY p.name ASC`,
      [existing.id],
    );
    return {
      id: existing.id,
      closingDate: date,
      totalTransactions: existing.total_transactions,
      totalItemsSold: existing.total_items_sold,
      totalRevenue: Number(existing.total_revenue),
      totalCash: Number(existing.total_cash),
      totalQris: Number(existing.total_qris),
      totalTransfer: Number(existing.total_transfer),
      ...cashFields({
        openingCash: Number(existing.opening_cash),
        totalCash: Number(existing.total_cash),
        cashActual: existing.cash_actual == null ? null : Number(existing.cash_actual),
      }),
      status: existing.status,
      note: existing.note,
      closedBy: existing.closed_by,
      createdAt: existing.created_at,
      items: items.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        openingStock: i.opening_stock,
        stockAdded: i.stock_added,
        quantitySold: i.quantity_sold,
        systemStock: i.system_stock,
        actualStock: i.actual_stock,
        difference: i.difference,
        note: i.note,
      })),
    };
  }

  const totals = await getTodaySalesTotals(pool, date);
  const lines = await computeProductStockLines(pool, date);

  return {
    id: 0,
    closingDate: date,
    totalTransactions: totals.totalTransactions,
    totalItemsSold: totals.totalItemsSold,
    totalRevenue: totals.totalRevenue,
    totalCash: totals.totalCash,
    totalQris: totals.totalQris,
    totalTransfer: totals.totalTransfer,
    ...cashFields({ openingCash: 0, totalCash: totals.totalCash, cashActual: null }),
    status: 'terbuka',
    note: null,
    closedBy: null,
    createdAt: new Date().toISOString(),
    items: lines.map((line) => ({
      id: 0,
      ...line,
      actualStock: line.systemStock,
      difference: 0,
      note: null,
    })),
  };
}

export async function closeDay({ items, userId, openingCash, cashActual }) {
  const date = todayIso();

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Data rekonsiliasi stok tidak boleh kosong.', 400);
  }

  const opening = Number(openingCash ?? 0);
  const actualCash = cashActual == null || cashActual === '' ? null : Number(cashActual);
  if (!(opening >= 0) || (actualCash != null && !(actualCash >= 0))) {
    throw new AppError('Nominal uang di laci tidak valid.', 400);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      "SELECT * FROM daily_closings WHERE closing_date = ? AND status = 'ditutup' FOR UPDATE",
      [date],
    );
    if (existingRows[0]) {
      throw new AppError('Closing harian untuk hari ini sudah dilakukan.', 409);
    }

    const totals = await getTodaySalesTotals(conn, date);
    const lines = await computeProductStockLines(conn, date);
    const lineByProduct = new Map(lines.map((l) => [l.productId, l]));

    const [closingResult] = await conn.query(
      `INSERT INTO daily_closings (closing_date, total_transactions, total_items_sold, total_revenue,
         total_cash, total_qris, total_transfer, opening_cash, cash_actual, cash_difference, status, closed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ditutup', ?)
       ON DUPLICATE KEY UPDATE total_transactions = VALUES(total_transactions), total_items_sold = VALUES(total_items_sold),
         total_revenue = VALUES(total_revenue), total_cash = VALUES(total_cash), total_qris = VALUES(total_qris),
         total_transfer = VALUES(total_transfer), opening_cash = VALUES(opening_cash), cash_actual = VALUES(cash_actual),
         cash_difference = VALUES(cash_difference), status = 'ditutup', closed_by = VALUES(closed_by)`,
      [
        date, totals.totalTransactions, totals.totalItemsSold, totals.totalRevenue,
        totals.totalCash, totals.totalQris, totals.totalTransfer, opening, actualCash,
        actualCash == null ? null : actualCash - (opening + totals.totalCash), userId,
      ],
    );

    const [closingRows] = await conn.query('SELECT id FROM daily_closings WHERE closing_date = ?', [date]);
    const closingId = closingRows[0].id;

    await conn.query('DELETE FROM daily_closing_items WHERE closing_id = ?', [closingId]);

    for (const submitted of items) {
      const line = lineByProduct.get(submitted.productId);
      if (!line) continue;

      const actualStock = Number(submitted.actualStock);
      if (!Number.isInteger(actualStock) || actualStock < 0) {
        throw new AppError(`Stok aktual untuk "${line.productName}" tidak valid.`, 400);
      }
      const difference = actualStock - line.systemStock;

      await conn.query(
        `INSERT INTO daily_closing_items
         (closing_id, product_id, opening_stock, stock_added, quantity_sold, system_stock, actual_stock, difference, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [closingId, line.productId, line.openingStock, line.stockAdded, line.quantitySold, line.systemStock, actualStock, difference, submitted.note ?? null],
      );

      if (difference !== 0) {
        await conn.query('UPDATE products SET stock = ? WHERE id = ?', [actualStock, line.productId]);
        await conn.query(
          `INSERT INTO stock_movements (product_id, type, quantity, stock_before, stock_after, note, user_id)
           VALUES (?, 'penyesuaian', ?, ?, ?, ?, ?)`,
          [line.productId, difference, line.systemStock, actualStock, submitted.note ?? 'Penyesuaian saat closing harian', userId],
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getTodayClosing();
}
