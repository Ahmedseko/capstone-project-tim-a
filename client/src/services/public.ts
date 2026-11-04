import { api } from './api';
import type { CatalogBottle, CatalogProduct, Fulfillment, OrderLookup, PublicCatalog, PublicStore } from '../types';

export function getPublicStore() {
  return api.get<PublicStore>('/public/store');
}

export function getPublicCatalog() {
  return api.get<PublicCatalog>('/public/products');
}

export const mediaUrl = (id: number) => `/api/public/media/${id}`;

export type OrderLineInput =
  | { kind: 'racik'; variantId: number; bottleId: number; ml: number; quantity: number }
  | { kind: 'produk'; productId: number; quantity: number };

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  fulfillment: Fulfillment;
  address?: string;
  note?: string;
  website: string; // kolom jebakan bot: harus tetap kosong
  lines: OrderLineInput[];
}

export interface CreatedOrder {
  orderNumber: string;
  status: 'baru';
  total: number;
  fulfillment: Fulfillment;
}

export function createPublicOrder(input: CreateOrderInput) {
  return api.post<CreatedOrder>('/public/orders', input);
}

export function lookupOrder(orderNumber: string, phone: string) {
  return api.post<OrderLookup>('/public/orders/lookup', { orderNumber, phone });
}

// Harga satu racikan, dihitung dari katalog (server menghitung ulang saat pesanan dikirim).
export function racikPrice(variant: CatalogProduct, bottle: CatalogBottle, ml: number) {
  return variant.price * ml + bottle.price;
}
