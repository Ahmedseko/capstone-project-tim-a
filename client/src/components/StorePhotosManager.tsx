import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from '../hooks/useToast';
import { deleteImage, uploadImage } from '../services/media';
import { getPublicStore, mediaUrl } from '../services/public';
import { resizeImage } from '../utils/image';

const MAX_PHOTOS = 12;

// Foto toko untuk halaman publik. Langsung tersimpan saat diunggah/dihapus (tidak ikut tombol Simpan Pengaturan).
export function StorePhotosManager() {
  const { showToast } = useToast();
  const [ids, setIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = () =>
    getPublicStore()
      .then((s) => setIds(s.photoIds))
      .catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - ids.length)) {
        await uploadImage(await resizeImage(file), 'toko');
      }
      showToast('Foto toko diunggah.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah foto.', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Hapus foto ini dari halaman toko? Foto masuk Tong Sampah dan bisa dipulihkan 14 hari.')) return;
    try {
      await deleteImage(id);
      setIds((prev) => prev.filter((x) => x !== id));
      showToast('Foto dihapus.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus foto.', 'error');
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Foto Toko</CardTitle>
        <span className="text-xs text-text-faint">
          {ids.length}/{MAX_PHOTOS}
        </span>
      </CardHeader>
      <div className="p-4 space-y-3">
        <p className="text-xs text-text-faint leading-relaxed">
          Foto pertama menjadi foto utama di beranda toko online. Foto otomatis diperkecil sebelum diunggah.
        </p>
        {ids.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ids.map((id, i) => (
              <li key={id} className="relative rounded-lg overflow-hidden border border-border aspect-[4/3] bg-bg">
                <img src={mediaUrl(id)} alt={`Foto toko ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 text-[10px] font-bold bg-accent text-white rounded px-1.5 py-0.5">Utama</span>}
                <button
                  onClick={() => remove(id)}
                  aria-label={`Hapus foto toko ${i + 1}`}
                  className="absolute right-1.5 top-1.5 w-9 h-9 lg:w-7 lg:h-7 rounded-md bg-black/65 text-white flex items-center justify-center hover:bg-danger transition"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" id="foto-toko" onChange={(e) => onPick(e.target.files)} />
        <Button variant="secondary" disabled={busy || ids.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>
          <ImagePlus size={15} />
          {busy ? 'Mengunggah...' : 'Tambah foto'}
        </Button>
      </div>
    </Card>
  );
}
