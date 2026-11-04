import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils/format';
import { type CartLine, available, bottleCapacity } from './cart';

const FRACTIONS = [
  { label: 'Penuh', f: 1 },
  { label: '¾', f: 0.75 },
  { label: '½', f: 0.5 },
  { label: '¼', f: 0.25 },
];

export function RacikPanel({
  products,
  lines,
  onAdd,
}: {
  products: Product[];
  lines: CartLine[];
  onAdd: (variant: Product, bottle: Product, ml: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [variantId, setVariantId] = useState<number | null>(null);
  const [bottleId, setBottleId] = useState<number | null>(null);
  const [ml, setMl] = useState(0);

  const variants = useMemo(
    () => products.filter((p) => p.unit === 'ml' && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search],
  );
  const bottles = useMemo(
    () =>
      products
        .filter((p) => p.category === 'Botol Kosong')
        .sort((a, b) => bottleCapacity(a) - bottleCapacity(b) || a.price - b.price),
    [products],
  );

  const variant = products.find((p) => p.id === variantId);
  const bottle = products.find((p) => p.id === bottleId);
  const capacity = bottle ? bottleCapacity(bottle) : 0;
  const mlLeft = variant ? available(variant, lines) : 0;
  const bottleLeft = bottle ? available(bottle, lines) : 0;
  const total = variant && bottle && ml > 0 ? ml * variant.price + bottle.price : 0;

  const error =
    !variant || !bottle || ml <= 0
      ? null
      : ml > capacity
        ? `Isi maksimal ${capacity} ml untuk botol ini.`
        : ml > mlLeft
          ? `Stok ${variant.name} tersisa ${mlLeft} ml.`
          : bottleLeft < 1
            ? 'Stok botol habis.'
            : null;
  const canAdd = !!variant && !!bottle && ml > 0 && !error;

  function pickBottle(b: Product) {
    setBottleId(b.id);
    // isi yang sudah diketik tidak boleh melebihi kapasitas botol baru
    setMl((cur) => Math.min(cur, bottleCapacity(b)));
  }

  function add() {
    if (!variant || !bottle || !canAdd) return;
    onAdd(variant, bottle, ml);
    setMl(0);
  }

  return (
    <div className="p-3.5 space-y-4">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-medium text-text-faint uppercase tracking-wide">1. Pilih varian</h3>
          <div className="relative w-full sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <Input placeholder="Cari varian..." className="pl-7 h-10 lg:h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {variants.length === 0 ? (
          <EmptyState message="Belum ada varian parfum. Tambahkan di menu Produk (kategori Parfum Refill)." />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {variants.map((v) => {
              const left = available(v, lines);
              const out = left <= 0;
              const selected = v.id === variantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => setVariantId(v.id)}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 disabled:cursor-not-allowed',
                    selected ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-border-strong hover:bg-white/[0.03]',
                  )}
                >
                  <div className="text-sm text-text truncate">{v.name}</div>
                  <div className="text-xs text-accent font-mono tnum">{formatCurrency(v.price)}/ml</div>
                  <div className={clsx('text-[11px]', left <= v.lowStockThreshold ? 'text-warning' : 'text-text-faint')}>
                    {out ? 'Habis' : `Stok ${left} ml`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-medium text-text-faint uppercase tracking-wide mb-2">2. Pilih botol</h3>
        {bottles.length === 0 ? (
          <EmptyState message="Belum ada botol. Tambahkan di menu Produk (kategori Botol Kosong)." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {bottles.map((b) => {
              const left = available(b, lines);
              const out = left <= 0;
              const selected = b.id === bottleId;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={out}
                  title={b.name}
                  onClick={() => pickBottle(b)}
                  className={clsx(
                    'min-w-[92px] rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 disabled:cursor-not-allowed',
                    selected ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-border-strong hover:bg-white/[0.03]',
                  )}
                >
                  <div className="text-sm font-semibold text-text">{bottleCapacity(b) || b.size} ml</div>
                  <div className="text-xs text-accent font-mono tnum">{formatCurrency(b.price)}</div>
                  <div className={clsx('text-[11px]', left <= b.lowStockThreshold ? 'text-warning' : 'text-text-faint')}>
                    {out ? 'Habis' : `Stok ${left}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-medium text-text-faint uppercase tracking-wide mb-2">
          3. Isi botol{capacity > 0 && <span className="normal-case"> (maks {capacity} ml)</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {FRACTIONS.map(({ label, f }) => {
            const value = Math.max(1, Math.round(capacity * f));
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={ml === value && capacity > 0 ? 'primary' : 'secondary'}
                disabled={!bottle}
                onClick={() => setMl(value)}
              >
                {label}
                {capacity > 0 && <span className="opacity-70 font-mono">{value}</span>}
              </Button>
            );
          })}
          <div className="flex items-center gap-1.5 ml-auto">
            <Input
              type="number"
              min={1}
              max={capacity || undefined}
              placeholder="ml"
              className="w-24"
              disabled={!bottle}
              value={ml || ''}
              onChange={(e) => setMl(Math.max(0, Math.floor(Number(e.target.value))))}
            />
            <span className="text-sm text-text-muted">ml</span>
          </div>
        </div>
      </section>

      {error && <div className="text-[13px] text-danger">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-bg px-3.5 py-3">
        <div className="text-sm text-text-muted">
          {total > 0 && variant && bottle ? (
            <>
              <div>
                {ml} ml &times; {formatCurrency(variant.price)} + botol {formatCurrency(bottle.price)}
              </div>
              <div className="text-lg font-semibold text-text font-mono tnum">{formatCurrency(total)}</div>
            </>
          ) : (
            'Pilih varian, botol, dan isi.'
          )}
        </div>
        <Button className="w-full sm:w-auto" disabled={!canAdd} onClick={add}>
          <Plus size={15} />
          Tambah ke Keranjang
        </Button>
      </div>
    </div>
  );
}
