// Perkecil foto di browser sebelum diunggah (foto ponsel bisa 5-10 MB). Hasil: JPEG, sisi terpanjang maks `maxSide`.
export async function resizeImage(file: File, maxSide = 1200, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar.');
  const bitmap = await createImageBitmap(file); // orientasi EXIF diterapkan otomatis
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pengolahan gambar.');
  ctx.fillStyle = '#ffffff'; // latar putih untuk PNG transparan
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Gagal memproses gambar.');
  return blob;
}
