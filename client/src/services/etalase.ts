import { api } from './api';
import type { OnlineProduct } from '../types';

export function listOnlineProducts() {
  return api.get<OnlineProduct[]>('/etalase/products');
}

export function updateOnlineProduct(id: number, input: { description?: string; showOnline?: boolean; mainPhotoId?: number }) {
  return api.patch<OnlineProduct>(`/etalase/products/${id}`, input);
}
