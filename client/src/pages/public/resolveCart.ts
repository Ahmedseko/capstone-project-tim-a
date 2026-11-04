import { useMemo } from 'react';
import { type CartLine, useCart } from '../../hooks/useCart';
import { usePublicData } from '../../hooks/usePublicData';
import { type OrderLineInput, racikPrice } from '../../services/public';

export interface ResolvedRow {
  line: CartLine;
  label: string;
  detail: string;
  unitTotal: number;
  photoId: number | null;
  valid: boolean;
}

// Menggabungkan isi keranjang (id + pilihan) dengan katalog terbaru: harga, nama, dan apakah masih tersedia.
export function useResolvedCart() {
  const { lines } = useCart();
  const { catalog } = usePublicData();

  return useMemo(() => {
    const products = catalog?.products ?? [];
    const bottles = catalog?.bottles ?? [];
    const rows: ResolvedRow[] = lines.map((line) => {
      if (line.kind === 'racik') {
        const variant = products.find((p) => p.id === line.variantId);
        const bottle = bottles.find((b) => b.id === line.bottleId);
        const valid = !!variant && !!bottle && variant.available && bottle.available && line.ml >= 1 && line.ml <= bottle.capacity;
        return {
          line,
          label: variant?.name ?? 'Produk tidak ditemukan',
          detail: bottle ? `${line.ml} ml dalam botol ${bottle.capacity} ml` : 'Botol tidak tersedia',
          unitTotal: variant && bottle ? racikPrice(variant, bottle, line.ml) : 0,
          photoId: variant?.photoId ?? null,
          valid,
        };
      }
      const product = products.find((p) => p.id === line.productId);
      return {
        line,
        label: product?.name ?? 'Produk tidak ditemukan',
        detail: product?.size ?? '',
        unitTotal: product?.price ?? 0,
        photoId: product?.photoId ?? null,
        valid: !!product && product.available,
      };
    });

    const orderLines: OrderLineInput[] = lines.map((l) =>
      l.kind === 'racik'
        ? { kind: 'racik', variantId: l.variantId, bottleId: l.bottleId, ml: l.ml, quantity: l.qty }
        : { kind: 'produk', productId: l.productId, quantity: l.qty },
    );

    return {
      rows,
      orderLines,
      total: rows.reduce((sum, r) => sum + r.unitTotal * r.line.qty, 0),
      hasInvalid: rows.some((r) => !r.valid),
      ready: !!catalog,
    };
  }, [lines, catalog]);
}
