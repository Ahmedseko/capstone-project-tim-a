import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ProductPhoto } from './ProductPhoto';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import type { CatalogProduct } from '../../types';
import { formatCurrency } from '../../utils/format';
import { categoryLabel } from '../../utils/storefront';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const { showToast } = useToast();
  const racik = product.unit === 'ml';

  function quickAdd() {
    add({ kind: 'produk', productId: product.id, qty: 1 });
    showToast(`${product.name} masuk keranjang.`);
  }

  return (
    <article className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
      <Link to={`/katalog/${product.id}`} className="block aspect-square bg-surface-elevated" aria-label={`Lihat detail ${product.name}`}>
        <ProductPhoto photoId={product.photoId} alt={product.name} />
      </Link>
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-text leading-snug">{product.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {categoryLabel(product.category)}
              {!racik && product.size ? ` · ${product.size}` : ''}
            </p>
          </div>
          <Badge tone={!product.available ? 'neutral' : product.limited ? 'warning' : 'success'}>{!product.available ? 'Habis' : product.limited ? 'Stok terbatas' : 'Tersedia'}</Badge>
        </div>

        <div className="text-[15px] font-bold text-accent-glow">
          {formatCurrency(product.price)}
          <span className="text-xs font-medium text-text-faint"> /{racik ? 'ml' : 'botol'}</span>
        </div>
        {racik && <p className="text-xs text-text-muted">Pilih ukuran botol dan isi sesuai selera.</p>}

        <div className="mt-auto pt-1 grid grid-cols-2 gap-2">
          <Link
            to={`/katalog/${product.id}`}
            className="h-10 rounded-lg border border-border-strong text-[13px] font-medium text-text flex items-center justify-center hover:bg-white/[0.04] transition"
          >
            Lihat detail
          </Link>
          {racik ? (
            <Link
              to={`/katalog/${product.id}`}
              aria-disabled={!product.available}
              className={`h-10 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition ${
                product.available ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-white/[0.06] text-text-faint pointer-events-none'
              }`}
            >
              <Plus size={14} />
              Racik
            </Link>
          ) : (
            <button
              onClick={quickAdd}
              disabled={!product.available}
              className="h-10 rounded-lg bg-accent text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-accent-hover transition disabled:bg-white/[0.06] disabled:text-text-faint disabled:pointer-events-none"
            >
              <Plus size={14} />
              Tambah
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
