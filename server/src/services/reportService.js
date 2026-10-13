import { pool } from '../db/pool.js';
import { listSales } from './saleService.js';
import { todayIso, monthStartIso } from '../utils/date.js';

async function getTrend(from, to) {
  const [rows] = await pool.query(
    `SELECT date, COALESCE(SUM(total), 0) AS revenue FROM sales
     WHERE status = 'selesai' AND date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC`,
    [from, to],
  );
  return rows.map((r) => ({
    date: r.date,
    revenue: Number(r.revenue),
  }));
}

async function getBestSellers(from, to, limit = 5) {
  const [rows] = await pool.query(
    `SELECT p.name AS product_name, p.unit AS unit, SUM(si.quantity) AS quantity, SUM(si.subtotal) AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.status = 'selesai' AND s.date BETWEEN ? AND ?
     GROUP BY si.product_id, p.name, p.unit
     ORDER BY revenue DESC
     LIMIT ?`,
    [from, to, limit],
  );
  return rows.map((r) => ({
    productName: r.product_name,
    unit: r.unit,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  }));
}

// Laba kotor = total bayar (setelah diskon) - modal. Transaksi yang modalnya belum lengkap tidak dihitung, hanya dihitung jumlahnya.
function summarizeProfit(sales) {
  let grossProfit = 0;
  let salesWithoutCost = 0;
  for (const s of sales) {
    if (s.profit == null) salesWithoutCost += 1;
    else grossProfit += s.profit;
  }
  return { grossProfit, salesWithoutCost };
}

export async function getDashboardSummary({ isAdmin = false } = {}) {
  const today = todayIso();
  const monthStart = monthStartIso();

  const [[todayTotals]] = await pool.query(
    `SELECT COUNT(*) AS sales_today, COALESCE(SUM(total), 0) AS revenue_today FROM sales WHERE status = 'selesai' AND date = ?`,
    [today],
  );
  const [[itemsToday]] = await pool.query(
    `SELECT COALESCE(SUM(si.quantity), 0) AS items_sold_today
     FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id AND p.unit = 'botol' WHERE s.status = 'selesai' AND s.date = ?`,
    [today],
  );
  const [[lowStock]] = await pool.query(
    `SELECT COUNT(*) AS low_stock_count FROM products WHERE status = 'aktif' AND stock <= low_stock_threshold`,
  );
  const [lowStockRows] = await pool.query(
    `SELECT * FROM products WHERE status = 'aktif' AND stock <= low_stock_threshold ORDER BY stock ASC LIMIT 10`,
  );

  const salesTrend = await getTrend(monthStart, today);
  const bestSellers = await getBestSellers(monthStart, today);
  const recentSales = (await listSales()).slice(0, 10);
  // laba hari ini: hanya admin yang boleh melihat angka modal
  const profitToday = isAdmin ? summarizeProfit(await listSales({ from: today, to: today, includeCost: true })) : null;

  return {
    salesToday: todayTotals.sales_today,
    revenueToday: Number(todayTotals.revenue_today),
    itemsSoldToday: Number(itemsToday.items_sold_today),
    profitToday: profitToday?.grossProfit ?? null,
    salesWithoutCostToday: profitToday?.salesWithoutCost ?? null,
    lowStockCount: lowStock.low_stock_count,
    salesTrend,
    bestSellers,
    recentSales,
    lowStockProducts: lowStockRows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      size: p.size,
      unit: p.unit,
      price: Number(p.price),
      stock: p.stock,
      lowStockThreshold: p.low_stock_threshold,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  };
}

export async function getSalesReport({ from, to }) {
  const range = { from: from || monthStartIso(), to: to || todayIso() };

  const [[totals]] = await pool.query(
    `SELECT COUNT(*) AS total_transactions, COALESCE(SUM(total), 0) AS total_revenue FROM sales WHERE status = 'selesai' AND date BETWEEN ? AND ?`,
    [range.from, range.to],
  );
  const [[itemTotals]] = await pool.query(
    `SELECT COALESCE(SUM(si.quantity), 0) AS total_items_sold
     FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id AND p.unit = 'botol' WHERE s.status = 'selesai' AND s.date BETWEEN ? AND ?`,
    [range.from, range.to],
  );

  const bestSellers = await getBestSellers(range.from, range.to);
  const salesTrend = await getTrend(range.from, range.to);
  const sales = await listSales({ ...range, includeCost: true }); // route laporan khusus admin
  const { grossProfit, salesWithoutCost } = summarizeProfit(sales);

  return {
    totalTransactions: totals.total_transactions,
    totalRevenue: Number(totals.total_revenue),
    totalItemsSold: Number(itemTotals.total_items_sold),
    grossProfit,
    salesWithoutCost,
    bestSellers,
    salesTrend,
    sales,
  };
}
