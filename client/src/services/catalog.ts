import { api } from './api';
import type { CatalogItem, ProductUnit } from '../types';

export interface CatalogInput {
  name: string;
  category: string;
  size: string;
  unit: ProductUnit;
  price: number;
  costPrice: number;
}

export function listCatalog() {
  return api.get<CatalogItem[]>('/catalog');
}

export function createCatalogItem(input: CatalogInput) {
  return api.post<CatalogItem>('/catalog', input);
}

export function updateCatalogItem(id: number, input: CatalogInput) {
  return api.put<CatalogItem>(`/catalog/${id}`, input);
}

export function deleteCatalogItem(id: number) {
  return api.delete<{ deleted: boolean }>(`/catalog/${id}`);
}
