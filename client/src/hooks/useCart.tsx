import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Keranjang konsumen disimpan di browser (tanpa akun). Hanya id dan pilihan; harga selalu diambil dari katalog terbaru.
export type CartLine =
  | { id: string; kind: 'racik'; variantId: number; bottleId: number; ml: number; qty: number }
  | { id: string; kind: 'produk'; productId: number; qty: number };

type NewLine =
  | { kind: 'racik'; variantId: number; bottleId: number; ml: number; qty: number }
  | { kind: 'produk'; productId: number; qty: number };

const KEY = 'gpk_cart_v1';
const MAX_QTY = 20;

function isLine(x: unknown): x is CartLine {
  const l = x as Record<string, unknown>;
  if (!l || typeof l !== 'object' || typeof l.id !== 'string' || !Number.isInteger(l.qty)) return false;
  if (l.kind === 'racik') return Number.isInteger(l.variantId) && Number.isInteger(l.bottleId) && Number.isInteger(l.ml);
  return l.kind === 'produk' && Number.isInteger(l.productId);
}

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

interface CartValue {
  lines: CartLine[];
  count: number;
  add: (line: NewLine) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
let seq = 0;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* penyimpanan diblokir (mode privat): keranjang tetap jalan selama halaman terbuka */
    }
  }, [lines]);

  const add = useCallback((line: NewLine) => {
    setLines((prev) => {
      const same = prev.find((l) =>
        l.kind === 'racik' && line.kind === 'racik'
          ? l.variantId === line.variantId && l.bottleId === line.bottleId && l.ml === line.ml
          : l.kind === 'produk' && line.kind === 'produk' && l.productId === line.productId,
      );
      if (same) return prev.map((l) => (l.id === same.id ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l));
      seq += 1;
      return [...prev, { ...line, id: `c${Date.now()}-${seq}` } as CartLine];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)));
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
