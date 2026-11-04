import { useEffect } from 'react';
import type { Fulfillment, OrderStatus } from '../types';

export const waLink = (whatsapp: string | null | undefined, text?: string) =>
  whatsapp ? `https://wa.me/${whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '#';

export const categoryLabel = (c: string) => (c === 'Parfum Refill' ? 'Parfum Racik' : c);

// Label status untuk pelanggan dan admin. "Siap" bergantung pada cara pemenuhan.
export function orderStatusLabel(status: OrderStatus, fulfillment: Fulfillment): string {
  switch (status) {
    case 'baru':
      return 'Menunggu konfirmasi';
    case 'dikonfirmasi':
      return 'Dikonfirmasi';
    case 'diproses':
      return 'Sedang diproses';
    case 'siap':
      return fulfillment === 'ambil' ? 'Siap diambil' : 'Siap dikirim';
    case 'selesai':
      return 'Selesai';
    default:
      return 'Dibatalkan';
  }
}

const TONES: Record<OrderStatus, 'warning' | 'accent' | 'success' | 'danger'> = {
  baru: 'warning',
  dikonfirmasi: 'accent',
  diproses: 'accent',
  siap: 'success',
  selesai: 'success',
  batal: 'danger',
};
export const orderStatusTone = (status: OrderStatus) => TONES[status];

// Urutan langkah untuk garis waktu status (tanpa batal).
export const ORDER_STEPS: OrderStatus[] = ['baru', 'dikonfirmasi', 'diproses', 'siap', 'selesai'];

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
