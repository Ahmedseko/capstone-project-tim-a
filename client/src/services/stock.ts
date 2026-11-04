import { api } from './api';
import type { StockMovement } from '../types';

export interface StockAddInput {
  date: string;
  productId: number;
  quantity: number;
  note?: string;
}

export function listStockMovements() {
  return api.get<StockMovement[]>('/stock');
}

export function addStock(input: StockAddInput) {
  return api.post<StockMovement>('/stock/add', input);
}

// Koreksi stok manual: newStock = stok aktual. Wajib beralasan kalau stok dikurangi.
export function adjustStock(input: { productId: number; newStock: number; note?: string }) {
  return api.post<StockMovement>('/stock/adjust', input);
}
