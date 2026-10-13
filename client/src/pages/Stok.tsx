import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, History, Trash2, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select, FormField, Input, Label } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { listProducts } from '../services/products';
import { listStockMovements, addStock } from '../services/stock';
import type { Product, StockMovement, StockMovementType } from '../types';
import { ApiRequestError } from '../services/api';
import { formatDate, todayIso } from '../utils/format';

const typeTone: Record<StockMovementType, { label: string; tone: 'success' | 'accent' | 'warning' }> = {
  masuk: { label: 'Stok Masuk', tone: 'success' },
  penjualan: { label: 'Penjualan', tone: 'accent' },
  penyesuaian: { label: 'Penyesuaian', tone: 'warning' },
};

interface StockLine {
  key: number;
  productId: number | null;
  quantity: number;
  note: string;
}

let lineKeyCounter = 0;
function newLine(productId: number | null): StockLine {
  return { key: ++lineKeyCounter, productId, quantity: 0, note: '' };
}

export default function Stok() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [lines, setLines] = useState<StockLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  function load() {
    setLoading(true);
    Promise.all([listProducts(), listStockMovements()])
      .then(([p, m]) => {
        setProducts(p);
        setMovements(m);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (searchParams.get('new')) {
      openModal();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeProducts = useMemo(() => products.filter((p) => p.status === 'aktif'), [products]);

  function openModal() {
    setDate(todayIso());
    setLines([newLine(activeProducts[0]?.id ?? null)]);
    setError(null);
    setModalOpen(true);
  }

  function addLine() {
    setLines((prev) => [...prev, newLine(activeProducts[0]?.id ?? null)]);
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateLine(key: number, patch: Partial<StockLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      for (const line of lines) {
        if (!line.productId || line.quantity <= 0) continue;
        await addStock({ productId: line.productId, quantity: line.quantity, date, note: line.note.trim() || undefined });
      }
      showToast(
        lines.length > 1 ? `Stok ${lines.length} produk berhasil ditambahkan.` : 'Stok berhasil diperbarui.',
      );
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal menambah stok.');
      load();
    } finally {
      setSaving(false);
    }
  }

  const isValid = lines.length > 0 && lines.every((l) => l.productId !== null && l.quantity > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Pantau stok saat ini dan riwayat pergerakan stok.</p>
        <Button onClick={openModal}>
          <Plus size={15} />
          Tambah Stok
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-border text-xs font-medium text-text-faint uppercase tracking-wide">
          Stok Saat Ini
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {['Produk', 'Kategori', 'Stok', 'Batas Minimum', 'Status'].map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && activeProducts.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message="Belum ada data produk." />
                  </td>
                </tr>
              )}
              {activeProducts.map((p) => {
                const low = p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-3.5 py-2.5 text-text">{p.name}</td>
                    <td className="px-3.5 py-2.5 text-text-muted">{p.category}</td>
                    <td className="px-3.5 py-2.5 font-mono tnum text-text">
                      {p.stock} <span className="text-text-faint">{p.unit}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono tnum text-text-muted">{p.lowStockThreshold}</td>
                    <td className="px-3.5 py-2.5">
                      {low ? <Badge tone="warning">Menipis</Badge> : <Badge tone="success">Aman</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-border text-xs font-medium text-text-faint uppercase tracking-wide">
          Riwayat Stok
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {['Tanggal', 'Produk', 'Jenis', 'Jumlah', 'Stok Sebelum', 'Stok Sesudah', 'Catatan'].map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && movements.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={History} message="Belum ada riwayat stok." />
                  </td>
                </tr>
              )}
              {movements.map((m) => {
                const unit = products.find((p) => p.id === m.productId)?.unit ?? '';
                // pembatalan transaksi dicatat sebagai movement 'penjualan' bernilai positif (stok kembali)
                const kind = m.type === 'penjualan' && m.quantity > 0 ? { label: 'Pembatalan', tone: 'warning' as const } : typeTone[m.type];
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-3.5 py-2.5 text-text-muted">{formatDate(m.createdAt)}</td>
                    <td className="px-3.5 py-2.5 text-text">{m.productName}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge tone={kind.tone}>{kind.label}</Badge>
                    </td>
                    <td className={'px-3.5 py-2.5 font-mono tnum ' + (m.quantity < 0 ? 'text-danger' : 'text-success')}>
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity} <span className="text-text-faint">{unit}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono tnum text-text-muted">{m.stockBefore}</td>
                    <td className="px-3.5 py-2.5 font-mono tnum text-text">{m.stockAfter}</td>
                    <td className="px-3.5 py-2.5 text-text-faint">{m.note ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Stok"
        description="Bisa tambah stok untuk beberapa produk sekaligus."
        size="lg"
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
          <FormField label="Tanggal">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
          </FormField>

          <div>
            <Label>Produk</Label>
            <div className="space-y-2">
              {lines.map((line) => {
                const product = activeProducts.find((p) => p.id === line.productId) ?? null;
                return (
                  <div key={line.key} className="rounded-lg border border-border bg-bg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={line.productId ?? ''}
                        onChange={(e) => updateLine(line.key, { productId: Number(e.target.value) })}
                        className="flex-1 min-w-0"
                      >
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.size}) · per {p.unit}
                          </option>
                        ))}
                      </Select>
                      <button
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded text-text-faint hover:text-danger hover:bg-danger/10 transition disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="Hapus baris"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder={product ? `Jumlah (${product.unit})` : 'Jumlah'}
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                        className="w-28 shrink-0"
                      />
                      {product && (
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono tnum text-text-faint shrink-0">
                          <span>{product.stock}</span>
                          <ArrowRight size={11} />
                          <span className="text-text font-medium">{product.stock + (line.quantity || 0)}</span>
                          <span>{product.unit}</span>
                        </div>
                      )}
                      <Input
                        placeholder="Catatan (opsional)"
                        value={line.note}
                        onChange={(e) => updateLine(line.key, { note: e.target.value })}
                        className="flex-1 min-w-0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addLine}
              className="mt-2 flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-hover transition"
            >
              <Plus size={13} />
              Tambah Produk Lain
            </button>
          </div>

          {error && <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
