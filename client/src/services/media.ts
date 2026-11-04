import { api, getToken } from './api';

// Unggah foto sebagai biner mentah (bukan JSON). Hanya admin.
export async function uploadImage(blob: Blob, kind: 'produk' | 'toko'): Promise<{ id: number }> {
  const token = getToken();
  const res = await fetch(`/api/media?kind=${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? 'Gagal mengunggah foto.');
  return data as { id: number };
}

export function deleteImage(id: number) {
  return api.delete<{ deleted: boolean }>(`/media/${id}`);
}
