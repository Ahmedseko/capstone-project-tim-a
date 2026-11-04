import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductPhoto } from '../../components/public/ProductPhoto';
import { useCart } from '../../hooks/useCart';
import { usePublicData } from '../../hooks/usePublicData';
import { formatCurrency } from '../../utils/format';
import { usePageTitle } from '../../utils/storefront';
import { useResolvedCart } from './resolveCart';

const stepBtn = 'w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text hover:bg-white/[0.08] transition disabled:opacity-40';

export default function Keranjang() {
  usePageTitle('Keranjang - Global Parfum Kutoarjo');
  const { loading } = usePublicData();
  const { setQty, remove } = useCart();
  const { rows, total, hasInvalid } = useResolvedCart();

  if (rows.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <ShoppingBag size={40} className="text-text-faint" aria-hidden="true" />
        <h1 className="text-xl font-bold text-text">{loading ? 'Memuat keranjang...' : 'Keranjang Masih Kosong'}</h1>
        {!loading && (
          <>
            <p className="text-sm text-text-muted">Pilih parfum di katalog, lalu tambahkan ke keranjang.</p>
            <Link to="/katalog" className="h-12 px-6 rounded-xl bg-accent text-white text-sm font-bold flex items-center hover:bg-accent-hover transition">
              Lihat katalog
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <section>
        <h1 className="text-2xl font-extrabold text-text mb-4">Keranjang</h1>
        <ul className="flex flex-col gap-3">
          {rows.map(({ line, label, detail, unitTotal, photoId, valid }) => (
            <li key={line.id} className="rounded-xl border border-border bg-surface p-3.5 flex gap-3">
              <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-elevated">
                <ProductPhoto photoId={photoId} alt={label} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-text leading-snug">{label}</div>
                    <div className="text-xs text-text-muted">{detail}</div>
                  </div>
                  <button onClick={() => remove(line.id)} aria-label={`Hapus ${label}`} className="p-2 -m-1 text-text-faint hover:text-danger transition">
                    <Trash2 size={16} />
                  </button>
                </div>
                {valid ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mt-auto">
                    <div className="flex items-center gap-2">
                      <button className={stepBtn} aria-label="Kurangi jumlah" onClick={() => setQty(line.id, line.qty - 1)} disabled={line.qty <= 1}>
                        <Minus size={15} />
                      </button>
                      <span className="w-8 text-center font-semibold">{line.qty}</span>
                      <button className={stepBtn} aria-label="Tambah jumlah" onClick={() => setQty(line.id, line.qty + 1)}>
                        <Plus size={15} />
                      </button>
                    </div>
                    <div className="text-[15px] font-bold text-text">{formatCurrency(unitTotal * line.qty)}</div>
                  </div>
                ) : (
                  <p className="text-xs text-warning">Tidak tersedia lagi. Hapus dari keranjang untuk melanjutkan.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3 lg:sticky lg:top-24">
        <h2 className="font-bold text-text">Ringkasan</h2>
        <div className="flex justify-between text-sm text-text-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm text-text-muted">
          <span>Ongkos kirim</span>
          <span>dikonfirmasi admin</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-text">Total</span>
          <span className="text-2xl font-extrabold text-text">{formatCurrency(total)}</span>
        </div>
        <Link
          to="/checkout"
          aria-disabled={hasInvalid}
          className={`h-12 rounded-xl text-[15px] font-bold flex items-center justify-center transition ${
            hasInvalid ? 'bg-white/[0.06] text-text-faint pointer-events-none' : 'bg-accent text-white hover:bg-accent-hover'
          }`}
        >
          Lanjut ke checkout
        </Link>
        <Link to="/katalog" className="text-center text-sm text-text-muted hover:text-text h-10 flex items-center justify-center">
          Tambah produk lain
        </Link>
      </aside>
    </div>
  );
}
