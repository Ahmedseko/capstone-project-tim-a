import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Tags } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, FormField } from '../components/ui/Input';
import { SizeField } from '../components/SizeField';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { ApiRequestError } from '../services/api';
import {
  listCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type CatalogInput,
} from '../services/catalog';
import type { CatalogItem, ProductUnit } from '../types';
import { CATEGORIES, CATEGORY_DEFAULTS, UNITS } from '../utils/productOptions';
import { formatCurrency } from '../utils/format';

const emptyForm: CatalogInput = { name: '', category: CATEGORIES[0], size: 'curah', unit: 'ml', price: 0, costPrice: 0 };

export default function Katalog() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<CatalogInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listCatalog()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) && (!categoryFilter || i.category === categoryFilter),
      ),
    [items, search, categoryFilter],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditing(item);
    setForm({ name: item.name, category: item.category, size: item.size, unit: item.unit, price: item.price, costPrice: item.costPrice });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (editing && form.price !== editing.price && editing.linkedCount > 0) {
      const ok = window.confirm(
        `Ubah harga ${editing.linkedCount} produk yang terhubung ke "${editing.name}" menjadi ${formatCurrency(form.price)}? Transaksi lama tidak berubah.`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCatalogItem(editing.id, form);
        showToast('Katalog berhasil diperbarui.');
      } else {
        await createCatalogItem(form);
        showToast('Item ditambahkan ke katalog.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Gagal menyimpan katalog.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: CatalogItem) {
    const note = item.linkedCount > 0 ? ` ${item.linkedCount} produk terkait tetap ada, hanya tidak lagi terhubung.` : '';
    if (!window.confirm(`Hapus "${item.name}" dari katalog?${note}`)) return;
    try {
      await deleteCatalogItem(item.id);
      showToast('Item katalog dihapus.');
      load();
    } catch {
      showToast('Gagal menghapus item katalog.', 'error');
    }
  }

  const isValid = form.name.trim().length > 0 && form.size.trim().length > 0 && form.price > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <Input placeholder="Cari di katalog..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
          <option value="">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Button onClick={openCreate}>
          <Plus size={15} />
          Tambah ke Katalog
        </Button>
      </div>

      <p className="text-xs text-text-faint">
        Daftar harga eceran acuan. Saat menambah produk, ketik namanya dan harga terisi otomatis dari sini.
      </p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {['Nama', 'Kategori', 'Ukuran', 'Harga Eceran', 'Modal', 'Produk Terkait', ''].map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={Tags} message="Katalog masih kosong." />
                  </td>
                </tr>
              )}
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-3.5 py-2.5 text-text">{i.name}</td>
                  <td className="px-3.5 py-2.5 text-text-muted">{i.category}</td>
                  <td className="px-3.5 py-2.5 text-text-muted">{i.size}</td>
                  <td className="px-3.5 py-2.5 text-text font-mono tnum">
                    {formatCurrency(i.price)}
                    <span className="text-text-faint"> /{i.unit === 'ml' ? 'ml' : 'pcs'}</span>
                  </td>
                  <td className="px-3.5 py-2.5 text-text-muted font-mono tnum">
                    {i.costPrice ? formatCurrency(i.costPrice) : <span className="text-text-faint">-</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-text-muted font-mono tnum">{i.linkedCount}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(i)}
                        className="p-1.5 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition"
                        aria-label="Hapus"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Katalog' : 'Tambah ke Katalog'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <FormField label="Nama">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Baccarat / Botol 30 ml" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kategori">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, ...CATEGORY_DEFAULTS[e.target.value] })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Ukuran">
              <SizeField category={form.category} value={form.size} onChange={(size) => setForm({ ...form, size })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Satuan Jual">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as ProductUnit })}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={`Harga eceran per ${form.unit === 'ml' ? 'ml' : 'pcs'} (Rp)`}>
              <Input
                type="number"
                min={0}
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label={`Harga modal per ${form.unit === 'ml' ? 'ml' : 'pcs'} (Rp, opsional)`}>
            <Input
              type="number"
              min={0}
              placeholder="Untuk menghitung laba"
              value={form.costPrice || ''}
              onChange={(e) => setForm({ ...form, costPrice: Math.max(0, Number(e.target.value)) })}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
