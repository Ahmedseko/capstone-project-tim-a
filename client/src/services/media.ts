import { api, getToken } from './api';
import type { TrashPhoto } from '../types';

// Unggah foto sebagai biner mentah (bukan JSON). Foto produk: admin dan staf; foto toko: admin.
export async function uploadImage(blob: Blob, kind: 'produk' | 'toko', productId?: number): Promise<{ id: number }> {
  const token = getToken();
  const res = await fetch(`/api/media?kind=${kind}${productId ? `&productId=${productId}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Gagal mengunggah foto.');
  return data as { id: number };
}

// Memindahkan foto ke tong sampah (bisa dipulihkan 14 hari).
export function deleteImage(id: number) {
  return api.delete<{ deleted: boolean }>(`/media/${id}`);
}

export function listTrash() {
  return api.get<TrashPhoto[]>('/media/trash');
}

export function restoreImage(id: number) {
  return api.post<{ restored: boolean }>(`/media/${id}/restore`, {});
}

export function purgeImage(id: number) {
  return api.delete<{ deleted: boolean }>(`/media/${id}/permanent`);
}
