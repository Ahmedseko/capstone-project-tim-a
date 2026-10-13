import type { ProductUnit } from '../types';

export const CATEGORIES = ['Parfum Refill', 'Botol Kosong', 'Parfum Botol', 'Bibit Parfum', 'Produk Pendukung'];
// Ukuran botol: kelipatan 5 ml, 5-100.
export const BOTTLE_SIZES = Array.from({ length: 20 }, (_, i) => `${(i + 1) * 5} ml`);
export const UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'botol', label: 'Botol / pcs' },
  { value: 'ml', label: 'ml (varian parfum curah)' },
];

// Pilihan kategori otomatis menyetel satuan: refill = ml, botol kosong = pcs.
export const CATEGORY_DEFAULTS: Record<string, { unit: ProductUnit; size: string; lowStockThreshold: number }> = {
  'Parfum Refill': { unit: 'ml', size: 'curah', lowStockThreshold: 100 }, // stok dalam ml
  'Botol Kosong': { unit: 'botol', size: '30 ml', lowStockThreshold: 10 },
};
