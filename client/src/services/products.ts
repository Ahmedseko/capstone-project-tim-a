import { api } from './api';
import type { Product, ProductUnit } from '../types';

export interface ProductInput {
  name: string;
  category: string;
  size: string;
  unit: ProductUnit;
  price: number;
  costPrice: number;
  lowStockThreshold: number;
  catalogId?: number | null;
}

export function listProducts() {
  return api.get<Product[]>('/products');
}

export function createProduct(input: ProductInput) {
  return api.post<Product>('/products', input);
}

export function updateProduct(id: number, input: Partial<ProductInput> & { status?: Product['status'] }) {
  return api.put<Product>(`/products/${id}`, input);
}

export function deleteProduct(id: number) {
  return api.delete<{ deleted: boolean; product: Product | null }>(`/products/${id}`);
}
