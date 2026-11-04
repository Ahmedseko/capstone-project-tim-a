import { api } from './api';
import type { OnlineOrder, OrderStatus, OrderSummary, PaymentMethod } from '../types';

export function listOrders(params: { status?: string; q?: string } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.q) q.set('q', params.q);
  const qs = q.toString();
  return api.get<OnlineOrder[]>(`/orders${qs ? `?${qs}` : ''}`);
}

export function getOrderSummary() {
  return api.get<OrderSummary>('/orders/summary');
}

export function confirmOrder(id: number, paymentMethod: PaymentMethod) {
  return api.post<OnlineOrder>(`/orders/${id}/confirm`, { paymentMethod });
}

export function setOrderStatus(id: number, status: OrderStatus) {
  return api.post<OnlineOrder>(`/orders/${id}/status`, { status });
}

export function cancelOrder(id: number, reason: string) {
  return api.post<OnlineOrder>(`/orders/${id}/cancel`, { reason });
}
