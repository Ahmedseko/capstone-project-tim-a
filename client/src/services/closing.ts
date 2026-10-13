import { api } from './api';
import type { DailyClosing } from '../types';

export function getTodayClosing() {
  return api.get<DailyClosing>('/closing/today');
}

export interface CloseDayInput {
  items: { productId: number; actualStock: number; note?: string }[];
  openingCash: number;
  cashActual: number;
}

export function closeDay(input: CloseDayInput) {
  return api.post<DailyClosing>('/closing', input);
}
