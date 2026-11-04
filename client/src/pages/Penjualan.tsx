import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ShoppingCart, FlaskConical, Package, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { RacikPanel } from '../components/penjualan/RacikPanel';
import { CartPanel } from '../components/penjualan/CartPanel';
import { ReceiptModal } from '../components/penjualan/Receipt';
import { type CartLine, available, isRacik, linePrice, maxMl, maxQty } from '../components/penjualan/cart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { listProducts } from '../services/products';
import { listSales, createSale, type SaleInput } from '../services/sales';
import { getStoreInfo } from '../services/settings';
import { ApiRequestError } from '../services/api';
import type { Product, Sale, StoreInfo } from '../types';
import { formatCurrency, formatDateTime, todayIso } from '../utils/format';

type Tab = 'racik' | 'produk';

// crypto.randomUUID butuh HTTPS; id baris keranjang cukup penghitung biasa.
let lineSeq = 0;
const newId = () => `line-${++lineSeq}`;

export default function Penjualan() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [tab, setTab] = useState<Tab>('racik');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  function load() {
    listProducts().then((p) => setProducts(p.filter((prod) => prod.status === 'aktif')));
    listSales().then(setSales);
  }

  useEffect(load, []);
  useEffect(() => {
    getStoreInfo().then(setStore).catch(() => setStore(null));
  }, []);

  const otherProducts = useMemo(
    () => products.filter((p) => !isRacik(p) && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );
  const cartTotal = lines.reduce((sum, l) => sum + linePrice(l), 0);
  const todaySales = useMemo(() => sales.filter((s) => s.date === todayIso()), [sales]);

  function addRacik(variant: Product, bottle: Product, ml: number) {
    setError(null);
    setLines((prev) => {
      const same = prev.find((l) => l.kind === 'racik' && l.variant.id === variant.id && l.bottle.id === bottle.id && l.ml === ml);
      if (same) {
        return prev.map((l) => (l.id === same.id && l.kind === 'racik' ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { kind: 'racik', id: newId(), variant, bottle, ml, qty: 1 }];
    });
  }

  function addProduct(product: Product) {
    setError(null);
    setLines((prev) => {
      if (available(product, prev) < 1) return prev;
      const existing = prev.find((l) => l.kind === 'produk' && l.product.id === product.id);
      if (existing) return prev.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { kind: 'produk', id: newId(), product, qty: 1 }];
    });
  }

  // Jumlah dibatasi stok; 0 berarti baris dihapus.
  function setQty(id: string, qty: number) {
    setError(null);
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: Math.min(Math.max(0, qty), maxQty(l, prev)) } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function setMl(id: string, ml: number) {
    setError(null);
    setLines((prev) =>
      prev.map((l) => (l.id === id && l.kind === 'racik' ? { ...l, ml: Math.min(Math.max(1, ml || 1), maxMl(l, prev)) } : l)),
    );
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleSubmit(input: SaleInput): Promise<boolean> {
    if (lines.length === 0) return false;
    setSaving(true);
    setError(null);
    try {
      const sale = await createSale(input);
      showToast('Penjualan berhasil disimpan.');
      setLines([]);
      setReceipt(sale);
      load();
      return true;
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal menyimpan penjualan.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'racik', label: 'Racik Parfum', icon: FlaskConical },
    { id: 'produk', label: 'Produk Lain', icon: Package },
  ];

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-5 gap-4 ${lines.length > 0 ? 'pb-20 xl:pb-0' : ''}`}>
      <div className="xl:col-span-3 space-y-4">
        <Card className="overflow-hidden">
          <div className="flex border-b border-border">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  'flex items-center gap-2 px-4 h-11 text-sm font-medium border-b-2 -mb-px transition',
                  tab === id ? 'border-accent text-text' : 'border-transparent text-text-muted hover:text-text',
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'racik' ? (
            <RacikPanel products={products} lines={lines} onAdd={addRacik} />
          ) : (
            <>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <Input placeholder="Cari produk..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                {otherProducts.length === 0 && <EmptyState message="Produk tidak ditemukan." />}
                {otherProducts.map((p) => {
                  const left = available(p, lines);
                  const inCart = p.stock - left;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm text-text truncate">{p.name}</div>
                        <div className="text-[11px] text-text-faint font-mono">
                          {formatCurrency(p.price)}/{p.unit} &middot; Stok {p.stock} {p.unit}
                        </div>
                      </div>
                      <Button size="sm" variant={inCart > 0 ? 'secondary' : 'primary'} disabled={left < 1} onClick={() => addProduct(p)}>
                        <Plus size={13} />
                        {inCart > 0 ? inCart : 'Tambah'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border text-xs font-medium text-text-faint uppercase tracking-wide">
            Transaksi Hari Ini
          </div>
          {todaySales.length === 0 ? (
            <EmptyState icon={ShoppingCart} message="Belum ada transaksi hari ini." />
          ) : (
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {todaySales.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-text', s.status === 'batal' && 'line-through opacity-60')}>{s.transactionNumber}</span>
                      {s.status === 'batal' && <Badge tone="danger">Batal</Badge>}
                    </div>
                    <div className="text-[11px] text-text-faint truncate">
                      {formatDateTime(s.createdAt)} &middot; {s.items.length} item
                      {s.customerNote && <> &middot; {s.customerNote}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={clsx('font-mono tnum text-text', s.status === 'batal' && 'line-through opacity-60')}>
                      {formatCurrency(s.total)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => setReceipt(s)}>
                      <Eye size={13} />
                      Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="xl:col-span-2">
        <CartPanel lines={lines} saving={saving} error={error} onQty={setQty} onMl={setMl} onRemove={removeLine} onSubmit={handleSubmit} />
      </div>

      {/* Ponsel/tablet: keranjang ada di bawah, jadi tampilkan bilah ringkas agar kasir tidak perlu menggulir mencarinya. */}
      {lines.length > 0 && (
        <div className="xl:hidden fixed bottom-0 inset-x-0 lg:left-[240px] z-30 flex items-center gap-3 border-t border-border bg-surface/95 backdrop-blur px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-text-faint">{lines.length} item di keranjang</div>
            <div className="text-base font-semibold font-mono tnum text-text truncate">{formatCurrency(cartTotal)}</div>
          </div>
          <Button onClick={() => document.getElementById('keranjang')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <ShoppingCart size={15} />
            Lihat Keranjang
          </Button>
        </div>
      )}

      <ReceiptModal sale={receipt} store={store} isAdmin={user?.role === 'admin'} onClose={() => setReceipt(null)} onChanged={load} />
    </div>
  );
}
