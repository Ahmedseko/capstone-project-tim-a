import * as reportService from '../services/reportService.js';
import { buildSalesExcel } from '../services/exportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { todayIso } from '../utils/date.js';

function resolveRange(query) {
  const to = query.to || todayIso();
  const from = query.from || to;
  if (from > to) {
    throw new AppError('Tanggal awal tidak boleh setelah tanggal akhir.', 400);
  }
  return { from, to };
}

export const summary = asyncHandler(async (req, res) => {
  res.json(await reportService.getDashboardSummary({ isAdmin: req.user.role === 'admin' }));
});

export const sales = asyncHandler(async (req, res) => {
  const range = resolveRange(req.query);
  res.json(await reportService.getSalesReport(range));
});

export const exportExcel = asyncHandler(async (req, res) => {
  const range = resolveRange(req.query);
  const buffer = await buildSalesExcel(range);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="laporan-penjualan-${range.from}-${range.to}.xlsx"`);
  res.send(buffer);
});
