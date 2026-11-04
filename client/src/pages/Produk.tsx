import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, PackageX, Power, ImagePlus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select, FormField, Textarea } from '../components/ui/Input';
import { SizeField } from '../components/SizeField';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { listProducts, createProduct, updateProduct, deleteProduct, type ProductInput } from '../services/products';
import { updateOnlineProduct } from '../services/etalase';
import { deleteImage, uploadImage } from '../services/media';
import { mediaUrl } from '../services/public';
import { resizeImage } from '../utils/image';
import type { Product, ProductUnit } from '../types';
import { formatCurrency } from '../utils/format';
import { CATEGORIES, CATEGORY_DEFAULTS, UNITS } from '../utils/productOptions';

const emptyForm: ProductInput = {
  name: '',
  category: CATEGORIES[0],
  size: 'curah',
  unit: 'ml',
  price: 0,
  costPrice: 0,
  stock: 0,
  lowStockThreshold: 5,
  description: '',
  showOnline: true,
  status: 'aktif',
};

// Kata satuan di label: ml untuk curah, botol untuk produk per botol/pcs.
const unitWord = (unit: ProductUnit) => (unit === 'ml' ? 'ml' : 'botol');

export default function Produk() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    return listProducts()
      .then((list) => {
        setProducts(list);
        return list;
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get('new') && isAdmin) {
      openCreate();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (categoryFilter && p.category !== categoryFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        return true;
      }),
    [products, search, categoryFilter, statusFilter],
  );

  function resetPhoto() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    resetPhoto();
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      size: product.size,
      unit: product.unit,
      price: product.price,
      costPrice: product.costPrice ?? 0,
      lowStockThreshold: product.lowStockThreshold,
      description: product.description ?? '',
      showOnline: product.showOnline,
      status: product.status,
    });
    resetPhoto();
    setModalOpen(true);
  }

  function closeModal() {
    resetPhoto();
    setModalOpen(false);
  }

  function onPickPhoto(file?: File) {
    if (!file) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  // Foto baru jadi foto utama; foto utama lama dipindah ke Tong Sampah (bisa dipulihkan di Etalase Online).
  async function attachPhoto(productId: number, oldMainId: number | null) {
    if (!pendingFile) return;
    const { id } = await uploadImage(await resizeImage(pendingFile), 'produk', productId);
    if (oldMainId) {
      await updateOnlineProduct(productId, { mainPhotoId: id });
      await deleteImage(oldMainId);
    }
  }

  async function removeCurrentPhoto() {
    if (!editing?.photoId) return;
    if (!window.confirm('Hapus foto utama produk ini? Foto masuk Tong Sampah dan bisa dipulihkan 14 hari.')) return;
    try {
      await deleteImage(editing.photoId);
      showToast('Foto dipindah ke Tong Sampah.');
      const list = await load();
      setEditing(list.find((p) => p.id === editing.id) ?? null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus foto.', 'error');
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || form.price <= 0) return;
    setSaving(true);
    let savedId: number | null = null;
    try {
      if (editing) {
        const { stock: _stock, ...changes } = form; // stok diubah lewat menu Stok agar riwayatnya tercatat
        void _stock;
        await updateProduct(editing.id, changes);
        savedId = editing.id;
      } else {
        savedId = (await createProduct(form)).id;
      }
      try {
        await attachPhoto(savedId, editing?.photoId ?? null);
        showToast(editing ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
      } catch (err) {
        showToast(`Produk tersimpan, tetapi foto gagal diunggah: ${err instanceof Error ? err.message : 'coba lagi'}`, 'error');
      }
      closeModal();
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan produk.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(product: Product) {
    const next = product.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      await updateProduct(product.id, { status: next });
      showToast(next === 'aktif' ? `${product.name} diaktifkan.` : `${product.name} dinonaktifkan (tidak tampil di kasir dan toko online).`);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status.', 'error');
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const result = await deleteProduct(product.id);
      showToast(
        result.deleted
          ? 'Produk berhasil dihapus.'
          : 'Produk sudah punya riwayat transaksi/stok, jadi dinonaktifkan (tidak dihapus) agar data tetap konsisten.',
      );
      load();
    } catch {
      showToast('Gagal menghapus produk.', 'error');
    }
  }

  const isValid =
    form.name.trim().length > 0 &&
    form.price > 0 &&
    form.lowStockThreshold >= 0 &&
    (editing || ((form.stock ?? 0) >= 0 && Number.isInteger(form.stock ?? 0)));
  const word = unitWord(form.unit);
  const shownPhoto = pendingPreview ?? (editing?.photoId ? mediaUrl(editing.photoId) : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <Input
            placeholder="Cari produk..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-48">
          <option value="">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </Select>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={15} />
            Tambah Produk
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-sm max-md:[&_:is(th,td):nth-child(2)]:hidden max-md:[&_:is(th,td):nth-child(3)]:hidden ${isAdmin ? 'max-md:[&_:is(th,td):nth-child(5)]:hidden max-sm:[&_:is(th,td):nth-child(7)]:hidden' : 'max-sm:[&_:is(th,td):nth-child(6)]:hidden'}`}>
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {(isAdmin
                  ? ['Nama Produk', 'Kategori', 'Ukuran', 'Harga', 'Modal', 'Stok', 'Status', '']
                  : ['Nama Produk', 'Kategori', 'Ukuran', 'Harga', 'Stok', 'Status']
                ).map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6}>
                    <EmptyState icon={PackageX} message="Belum ada data produk." />
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-3.5 py-2.5 text-text">
                    {p.photoId && <img src={mediaUrl(p.photoId)} alt="" loading="lazy" className="inline-block w-8 h-8 rounded object-cover align-middle mr-2.5" />}
                    {p.name}
                    <div className="md:hidden text-[11px] text-text-faint font-normal mt-0.5">{p.category} · {p.size}{p.status === 'nonaktif' ? ' · Nonaktif' : ''}</div>
                  </td>
                  <td className="px-3.5 py-2.5 text-text-muted">{p.category}</td>
                  <td className="px-3.5 py-2.5 text-text-muted font-mono">{p.size}</td>
                  <td className="px-3.5 py-2.5 text-text font-mono tnum">
                    {formatCurrency(p.price)}
                    <span className="text-text-faint"> /{p.unit}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-3.5 py-2.5 font-mono tnum text-text-muted">
                      {p.costPrice ? formatCurrency(p.costPrice) : <span className="text-text-faint">-</span>}
                    </td>
                  )}
                  <td className="px-3.5 py-2.5 font-mono tnum">
                    <span className={p.stock <= p.lowStockThreshold ? 'text-warning' : 'text-text'}>{p.stock}</span>{' '}
                    <span className="text-text-faint">{p.unit}</span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge tone={p.status === 'aktif' ? 'success' : 'neutral'}>
                      {p.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleStatus(p)}
                          className="p-1.5 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
                          aria-label={p.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                          title={p.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition"
                          aria-label="Hapus"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Produk' : 'Tambah Produk'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="space-y-2">
            <span className="block text-xs font-medium text-text-muted">Foto produk (dipakai di toko online)</span>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg border border-border bg-bg overflow-hidden flex items-center justify-center shrink-0">
                {shownPhoto ? (
                  <img src={shownPhoto} alt="Foto produk" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-text-faint" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col gap-2 items-start">
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Pilih foto produk" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                  {shownPhoto ? 'Ganti foto' : 'Pilih foto'}
                </Button>
                {editing?.photoId && !pendingFile && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeCurrentPhoto}>
                    Hapus foto
                  </Button>
                )}
                <span className="text-[11px] text-text-faint">Foto tambahan: menu Etalase Online.</span>
              </div>
            </div>
          </div>

          <FormField label="Nama Produk">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Baccarat" />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Kategori">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, ...CATEGORY_DEFAULTS[e.target.value] })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={form.category === 'Botol Kosong' ? 'Ukuran Botol' : 'Ukuran'}>
              <SizeField category={form.category} value={form.size} onChange={(size) => setForm({ ...form, size })} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Satuan Jual">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as ProductUnit })}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={`Harga Jual per ${word} (Rp)`}>
              <Input
                type="number"
                min={0}
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label={`Harga Modal per ${word} (Rp, opsional)`}>
            <Input
              type="number"
              min={0}
              placeholder="Untuk menghitung laba"
              value={form.costPrice || ''}
              onChange={(e) => setForm({ ...form, costPrice: Math.max(0, Number(e.target.value)) })}
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editing ? (
              <FormField label={`Stok saat ini (${word})`}>
                <div className="h-9 flex items-center text-sm text-text font-mono">
                  {editing.stock}
                  <Link to="/stok" className="ml-3 text-xs font-sans text-accent hover:text-accent-hover">
                    Ubah di menu Stok
                  </Link>
                </div>
              </FormField>
            ) : (
              <FormField label={`Stok Awal (${word})`}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock || ''}
                  placeholder="0"
                  onChange={(e) => setForm({ ...form, stock: Math.max(0, Math.floor(Number(e.target.value))) })}
                />
              </FormField>
            )}
            <FormField label={`Batas Stok Menipis (${word})`}>
              <Input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label="Deskripsi (tampil di halaman produk)">
            <Textarea rows={3} maxLength={2000} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <label className="flex items-center gap-2.5 text-sm text-text cursor-pointer min-h-[44px] lg:min-h-0">
            <input type="checkbox" className="w-4 h-4 accent-[#8b5cf6]" checked={form.showOnline !== false} onChange={(e) => setForm({ ...form, showOnline: e.target.checked })} />
            Tampilkan di Etalase Online
          </label>
          <FormField label="Status">
            <Select value={form.status ?? 'aktif'} onChange={(e) => setForm({ ...form, status: e.target.value as 'aktif' | 'nonaktif' })}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
