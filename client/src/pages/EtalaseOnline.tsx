import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Pencil, RotateCcw, Search, Star, Trash2, Store as StoreIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, FormField, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StorePhotosManager } from '../components/StorePhotosManager';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { listOnlineProducts, updateOnlineProduct } from '../services/etalase';
import { deleteImage, listTrash, purgeImage, restoreImage, uploadImage } from '../services/media';
import { getSettings, updateSettings } from '../services/settings';
import { mediaUrl } from '../services/public';
import { resizeImage } from '../utils/image';
import type { OnlineProduct, Settings, TrashPhoto } from '../types';

const MAX_PRODUCT_PHOTOS = 5;

type Tab = 'produk' | 'foto' | 'info' | 'sampah';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export default function EtalaseOnline() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('produk');

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'produk', label: 'Produk Online' },
    { id: 'foto', label: 'Foto Toko', adminOnly: true },
    { id: 'info', label: 'Beranda & Info', adminOnly: true },
    { id: 'sampah', label: 'Tong Sampah' },
  ];

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-sm text-text-muted">Atur tampilan toko online: foto, deskripsi, dan produk mana yang tampil. Perubahan langsung terlihat di halaman toko.</p>
      <div role="tablist" aria-label="Etalase Online" className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs
          .filter((t) => !t.adminOnly || isAdmin)
          .map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'h-10 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition border',
                tab === t.id ? 'bg-accent/15 border-accent/40 text-accent-glow' : 'border-border text-text-muted hover:text-text',
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === 'produk' && <ProdukTab />}
      {tab === 'foto' && isAdmin && <StorePhotosManager />}
      {tab === 'info' && isAdmin && <InfoTab />}
      {tab === 'sampah' && <SampahTab isAdmin={isAdmin} />}
    </div>
  );
}

function ProdukTab() {
  const { showToast } = useToast();
  const [items, setItems] = useState<OnlineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [showOnline, setShowOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      listOnlineProducts()
        .then(setItems)
        .catch(() => showToast('Gagal memuat produk.', 'error'))
        .finally(() => setLoading(false)),
    [showToast],
  );
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const editing = items.find((p) => p.id === editingId) ?? null;

  function open(p: OnlineProduct) {
    setEditingId(p.id);
    setDescription(p.description);
    setShowOnline(p.showOnline);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateOnlineProduct(editing.id, { description, showOnline });
      showToast('Tampilan produk disimpan.');
      setEditingId(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!editing || !files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PRODUCT_PHOTOS - editing.photoIds.length)) {
        await uploadImage(await resizeImage(file), 'produk', editing.id);
      }
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah foto.', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function removePhoto(id: number) {
    try {
      await deleteImage(id);
      showToast('Foto dipindah ke Tong Sampah (bisa dipulihkan 14 hari).');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus foto.', 'error');
    }
  }

  async function makeMain(id: number) {
    if (!editing) return;
    try {
      await updateOnlineProduct(editing.id, { mainPhotoId: id });
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah foto utama.', 'error');
    }
  }

  if (loading) return <div className="text-sm text-text-muted">Memuat produk...</div>;

  return (
    <>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
        <Input placeholder="Cari produk..." aria-label="Cari produk" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={StoreIcon} message="Tidak ada produk." />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-lg border border-border bg-bg overflow-hidden flex items-center justify-center shrink-0">
                  {p.photoId ? (
                    <img src={mediaUrl(p.photoId)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={18} className="text-text-faint" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text truncate">{p.name}</div>
                  <div className="text-xs text-text-faint truncate">
                    {p.category}
                    {p.unit === 'botol' && p.size ? ` · ${p.size}` : ''} · {p.photoIds.length} foto
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={p.showOnline ? 'success' : 'neutral'}>{p.showOnline ? 'Tampil di toko' : 'Disembunyikan'}</Badge>
                    {p.status === 'nonaktif' && <Badge tone="warning">Produk nonaktif</Badge>}
                    {p.updatedBy && (
                      <span className="text-[11px] text-text-faint">
                        diubah {p.updatedBy}, {fmtDate(p.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => open(p)} aria-label={`Edit tampilan ${p.name}`}>
                  <Pencil size={14} /> Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
        title={editing ? `Tampilan online: ${editing.name}` : ''}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Tutup
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan deskripsi'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted">Foto produk</span>
                <span className="text-xs text-text-faint">
                  {editing.photoIds.length}/{MAX_PRODUCT_PHOTOS} · foto langsung tersimpan
                </span>
              </div>
              {editing.photoIds.length > 0 && (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {editing.photoIds.map((id) => (
                    <li key={id} className="rounded-lg overflow-hidden border border-border bg-bg">
                      <div className="relative aspect-square">
                        <img src={mediaUrl(id)} alt="Foto produk" loading="lazy" className="w-full h-full object-cover" />
                        {id === editing.photoId && (
                          <span className="absolute left-1.5 top-1.5 text-[10px] font-bold bg-accent text-white rounded px-1.5 py-0.5">Utama</span>
                        )}
                      </div>
                      <div className="flex gap-1 p-1.5">
                        <button
                          onClick={() => makeMain(id)}
                          disabled={id === editing.photoId}
                          aria-label="Jadikan foto utama"
                          className="flex-1 h-9 rounded-md text-xs text-text-muted hover:text-text hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center gap-1"
                        >
                          <Star size={13} /> Utama
                        </button>
                        <button
                          onClick={() => removePhoto(id)}
                          aria-label="Hapus foto"
                          className="w-9 h-9 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Pilih foto produk" onChange={(e) => addPhotos(e.target.files)} />
              <Button type="button" variant="secondary" size="sm" disabled={busy || editing.photoIds.length >= MAX_PRODUCT_PHOTOS} onClick={() => input.current?.click()}>
                <ImagePlus size={14} /> {busy ? 'Mengunggah...' : 'Tambah foto'}
              </Button>
            </div>

            <FormField label="Deskripsi (tampil di halaman produk)">
              <Textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <label className="flex items-center gap-2.5 text-sm text-text cursor-pointer min-h-[44px] lg:min-h-0">
              <input type="checkbox" className="w-4 h-4 accent-[#8b5cf6]" checked={showOnline} onChange={(e) => setShowOnline(e.target.checked)} />
              Tampilkan di toko online
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}

// Pengumuman beranda + info toko publik. Hanya admin. Menyimpan lewat pengaturan toko yang sama dengan menu Pengaturan.
function InfoTab() {
  const { showToast } = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setForm)
      .catch(() => showToast('Gagal memuat info toko.', 'error'));
  }, [showToast]);

  if (!form) return <div className="text-sm text-text-muted">Memuat...</div>;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({ ...form, [k]: v });

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      setForm(await updateSettings(form));
      showToast('Info toko disimpan.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Beranda &amp; Info Toko</CardTitle>
      </CardHeader>
      <div className="p-4 space-y-3.5">
        <FormField label="Pengumuman beranda (kosongkan agar tidak tampil)">
          <Textarea
            rows={2}
            maxLength={300}
            value={form.announcement}
            onChange={(e) => set('announcement', e.target.value)}
            placeholder="Contoh: Toko libur 1 Januari. Pesanan online tetap masuk dan dibalas esok hari."
          />
        </FormField>
        <FormField label="Profil singkat toko (teks di beranda)">
          <Textarea rows={4} value={form.storeProfile} onChange={(e) => set('storeProfile', e.target.value)} />
        </FormField>
        <FormField label="Jam operasional">
          <Textarea rows={3} value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} placeholder={'Senin - Sabtu: 08.00 - 20.00\nMinggu: 09.00 - 17.00'} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@email.com" />
        </FormField>
        <FormField label="Link Google Maps (tombol &quot;Buka Google Maps&quot;)">
          <Input value={form.mapsUrl} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
        </FormField>
        <FormField label="Link Shopee (opsional)">
          <Input value={form.shopeeUrl} onChange={(e) => set('shopeeUrl', e.target.value)} placeholder="https://shopee.co.id/nama-toko" />
        </FormField>
        <p className="text-xs text-text-faint">Nama toko, alamat, dan nomor WhatsApp diubah di menu Pengaturan.</p>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SampahTab({ isAdmin }: { isAdmin: boolean }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<TrashPhoto[] | null>(null);

  const load = useCallback(
    () =>
      listTrash()
        .then(setItems)
        .catch(() => showToast('Gagal memuat tong sampah.', 'error')),
    [showToast],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      showToast(ok);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal.', 'error');
    }
  }

  if (!items) return <div className="text-sm text-text-muted">Memuat...</div>;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Tong Sampah Foto</CardTitle>
        <span className="text-xs text-text-faint">Foto dihapus otomatis setelah 14 hari</span>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState icon={Trash2} message="Tong sampah kosong." />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <img src={mediaUrl(t.id)} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover border border-border shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text truncate">{t.kind === 'toko' ? 'Foto toko' : (t.productName ?? 'Foto produk')}</div>
                <div className="text-xs text-text-faint">
                  dihapus {t.deletedBy ?? '-'}, {fmtDate(t.deletedAt)} · sisa {t.expiresInDays} hari
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => act(() => restoreImage(t.id), 'Foto dipulihkan.')}>
                <RotateCcw size={14} /> Pulihkan
              </Button>
              {isAdmin && (
                <button
                  onClick={() => window.confirm('Hapus foto ini permanen? Tidak bisa dipulihkan.') && act(() => purgeImage(t.id), 'Foto dihapus permanen.')}
                  aria-label="Hapus permanen"
                  className="w-9 h-9 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
