import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { ProductPhoto } from '../../components/public/ProductPhoto';
import { useCart } from '../../hooks/useCart';
import { usePublicData } from '../../hooks/usePublicData';
import { useToast } from '../../hooks/useToast';
import { racikPrice } from '../../services/public';
import { formatCurrency } from '../../utils/format';
import { categoryLabel, usePageTitle } from '../../utils/storefront';

const FRACTIONS = [
  { label: 'Penuh', f: 1 },
  { label: '¾', f: 0.75 },
  { label: '½', f: 0.5 },
  { label: '¼', f: 0.25 },
];

const stepBtn =
  'w-11 h-11 rounded-lg bg-surface-elevated border border-border text-text flex items-center justify-center hover:bg-white/[0.08] transition disabled:opacity-40';

export default function ProdukDetail() {
  const { id } = useParams();
  const { catalog, loading } = usePublicData();
  const { add } = useCart();
  const { showToast } = useToast();

  const product = catalog?.products.find((p) => p.id === Number(id)) ?? null;
  usePageTitle(product ? `${product.name} - Global Parfum Kutoarjo` : 'Produk - Global Parfum Kutoarjo');

  const racik = product?.unit === 'ml';
  const bottles = useMemo(() => (catalog?.bottles ?? []).filter((b) => b.available), [catalog]);

  const [bottleId, setBottleId] = useState<number | null>(null);
  const [ml, setMl] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [photoId, setPhotoId] = useState<number | null>(null);

  // pilihan awal: botol 30 ml (atau yang terdekat) terisi penuh
  useEffect(() => {
    if (!racik || bottles.length === 0 || bottleId !== null) return;
    const first = bottles.find((b) => b.capacity >= 30) ?? bottles[bottles.length - 1];
    setBottleId(first.id);
    setMl(first.capacity);
  }, [racik, bottles, bottleId]);

  const bottle = bottles.find((b) => b.id === bottleId) ?? null;
  const activePhoto = product && photoId && product.photoIds.includes(photoId) ? photoId : (product?.photoIds[0] ?? product?.photoId ?? null);

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-text-muted mb-4">{loading ? 'Memuat produk...' : 'Produk tidak ditemukan atau sudah tidak dijual.'}</p>
        {!loading && (
          <Link to="/katalog" className="inline-flex h-11 px-5 rounded-lg bg-accent text-white text-sm font-semibold items-center">
            Kembali ke katalog
          </Link>
        )}
      </div>
    );
  }

  const unitTotal = racik ? (bottle ? racikPrice(product, bottle, ml) : 0) : product.price;
  const total = unitTotal * qty;
  const canAdd = product.available && (!racik || (!!bottle && ml >= 1 && ml <= bottle.capacity));

  function pickBottle(id2: number) {
    const b = bottles.find((x) => x.id === id2);
    if (!b) return;
    setBottleId(id2);
    setMl((cur) => Math.min(Math.max(cur, 1), b.capacity));
    setAdded(false);
  }

  function handleAdd() {
    if (!product || !canAdd) return;
    if (racik && bottle) add({ kind: 'racik', variantId: product.id, bottleId: bottle.id, ml, qty });
    else add({ kind: 'produk', productId: product.id, qty });
    setAdded(true);
    showToast(`${product.name} masuk keranjang.`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link to="/katalog" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-5 h-10">
        <ArrowLeft size={16} aria-hidden="true" /> Katalog
      </Link>

      <div className="grid md:grid-cols-2 gap-6 md:gap-10">
        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden aspect-square">
            <ProductPhoto photoId={activePhoto} alt={product.name} />
          </div>
          {product.photoIds.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto" aria-label="Foto produk">
              {product.photoIds.map((id, i) => (
                <li key={id} className="shrink-0">
                  <button
                    onClick={() => setPhotoId(id)}
                    aria-label={`Lihat foto ${i + 1}`}
                    aria-pressed={id === activePhoto}
                    className={clsx('w-16 h-16 rounded-lg overflow-hidden border-2 transition', id === activePhoto ? 'border-accent' : 'border-border opacity-70 hover:opacity-100')}
                  >
                    <ProductPhoto photoId={id} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text leading-tight">{product.name}</h1>
              <Badge tone={product.available ? 'success' : 'neutral'}>{product.available ? 'Tersedia' : 'Habis'}</Badge>
            </div>
            <p className="text-sm text-text-muted">
              {categoryLabel(product.category)}
              {!racik && product.size ? ` · ${product.size}` : ''}
            </p>
            <div className="text-xl font-bold text-accent-glow">
              {formatCurrency(product.price)}
              <span className="text-sm font-medium text-text-faint"> /{racik ? 'ml' : 'pcs'}</span>
            </div>
            {product.description && <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">{product.description}</p>}
          </div>

          {racik && (
            <>
              <section className="flex flex-col gap-2.5">
                <h2 className="text-sm font-bold text-text">1. Pilih ukuran botol</h2>
                {bottles.length === 0 ? (
                  <p className="text-sm text-warning">Botol sedang habis. Hubungi toko untuk info stok.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ukuran botol">
                    {bottles.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => pickBottle(b.id)}
                        aria-pressed={b.id === bottleId}
                        className={clsx(
                          'min-h-[62px] rounded-xl border px-2 py-2 flex flex-col items-center justify-center gap-0.5 transition',
                          b.id === bottleId ? 'border-accent bg-accent/15' : 'border-border bg-surface hover:border-border-strong',
                        )}
                      >
                        <span className="text-[15px] font-bold text-text">{b.capacity} ml</span>
                        <span className="text-xs text-text-muted">{formatCurrency(b.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {bottle && (
                <section className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-text">2. Isi botol</h2>
                    <span className="text-xs text-text-faint">maksimal {bottle.capacity} ml</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FRACTIONS.map(({ label, f }) => {
                      const v = Math.max(1, Math.round(bottle.capacity * f));
                      return (
                        <button
                          key={label}
                          onClick={() => {
                            setMl(v);
                            setAdded(false);
                          }}
                          className={clsx(
                            'h-10 px-3.5 rounded-full text-[13px] font-semibold border transition',
                            ml === v ? 'bg-accent border-accent text-white' : 'border-border-strong text-text-muted hover:text-text',
                          )}
                        >
                          {label} &middot; {v} ml
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-2">
                    <button className={stepBtn} aria-label="Kurangi isi" onClick={() => setMl((v) => Math.max(1, v - 1))} disabled={ml <= 1}>
                      <Minus size={18} />
                    </button>
                    <label className="flex items-baseline gap-1.5">
                      <span className="sr-only">Isi dalam ml</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={bottle.capacity}
                        value={ml || ''}
                        onChange={(e) => {
                          setMl(Math.min(bottle.capacity, Math.max(0, Math.floor(Number(e.target.value)))));
                          setAdded(false);
                        }}
                        className="w-16 bg-transparent text-center text-3xl font-extrabold text-text focus:outline-none"
                      />
                      <span className="text-sm text-text-muted">ml</span>
                    </label>
                    <button className={stepBtn} aria-label="Tambah isi" onClick={() => setMl((v) => Math.min(bottle.capacity, v + 1))} disabled={ml >= bottle.capacity}>
                      <Plus size={18} />
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          <section className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-text">{racik ? '3. Jumlah botol' : 'Jumlah'}</h2>
            <div className="flex items-center gap-2">
              <button className={stepBtn} aria-label="Kurangi jumlah" onClick={() => setQty((v) => Math.max(1, v - 1))} disabled={qty <= 1}>
                <Minus size={18} />
              </button>
              <span className="w-10 text-center text-lg font-bold text-text">{qty}</span>
              <button className={stepBtn} aria-label="Tambah jumlah" onClick={() => setQty((v) => Math.min(racik ? 10 : 20, v + 1))}>
                <Plus size={18} />
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-1.5 text-sm">
            {racik && bottle && (
              <>
                <div className="flex justify-between text-text-muted">
                  <span>
                    {ml} ml &times; {formatCurrency(product.price)}
                  </span>
                  <span>{formatCurrency(ml * product.price)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Botol {bottle.capacity} ml</span>
                  <span>{formatCurrency(bottle.price)}</span>
                </div>
                <div className="h-px bg-border my-1" />
              </>
            )}
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-text">Total</span>
              <span className="text-2xl font-extrabold text-text">{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-text-faint">Ongkos kirim (jika dikirim) dikonfirmasi admin lewat WhatsApp.</p>
          </section>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="h-13 min-h-[52px] rounded-xl bg-accent text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-accent-hover transition disabled:bg-white/[0.06] disabled:text-text-faint"
            >
              <ShoppingCart size={17} aria-hidden="true" />
              {product.available ? 'Tambah ke keranjang' : 'Stok habis'}
            </button>
            {added && (
              <Link to="/keranjang" className="h-12 rounded-xl border border-border-strong text-text text-sm font-semibold flex items-center justify-center hover:bg-white/[0.04] transition">
                Lihat keranjang &amp; checkout
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
