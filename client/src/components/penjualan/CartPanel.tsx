import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import type { PaymentMethod } from '../../types';
import type { DiscountType, SaleInput } from '../../services/sales';
import { formatCurrency } from '../../utils/format';
import { type CartLine, computeDiscount, linePrice, maxMl, maxQty, toSaleItems } from './cart';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
];

const CASH_SHORTCUTS = [50000, 100000, 200000];

const stepBtn =
  'w-9 h-9 lg:w-6 lg:h-6 flex items-center justify-center rounded border border-border text-text-muted hover:text-text transition disabled:opacity-40';

export function CartPanel({
  lines,
  saving,
  error,
  onQty,
  onMl,
  onRemove,
  onSubmit,
}: {
  lines: CartLine[];
  saving: boolean;
  error: string | null;
  onQty: (id: string, qty: number) => void;
  onMl: (id: string, ml: number) => void;
  onRemove: (id: string) => void;
  onSubmit: (input: SaleInput) => Promise<boolean>;
}) {
  const [payment, setPayment] = useState<PaymentMethod>('tunai');
  const [discountType, setDiscountType] = useState<DiscountType>('rp');
  const [discountValue, setDiscountValue] = useState(0);
  const [note, setNote] = useState('');
  const [paid, setPaid] = useState(0);

  const subtotal = lines.reduce((sum, l) => sum + linePrice(l), 0);
  const discount = computeDiscount(subtotal, discountType, discountValue);
  const total = subtotal - discount;
  const cash = payment === 'tunai';
  const shortfall = cash && paid > 0 && paid < total;
  const change = cash && paid >= total && total > 0 ? paid - total : 0;
  const canSubmit = lines.length > 0 && !saving && !shortfall;

  async function submit() {
    const ok = await onSubmit({
      items: toSaleItems(lines),
      paymentMethod: payment,
      discountType,
      discountValue: discount > 0 ? discountValue : 0,
      customerNote: note.trim() || undefined,
      amountPaid: cash && paid > 0 ? paid : undefined,
    });
    if (ok) {
      setDiscountValue(0);
      setNote('');
      setPaid(0);
    }
  }

  return (
    <Card id="keranjang" className="overflow-hidden scroll-mt-4 xl:sticky xl:top-0">
      <div className="px-3.5 py-2.5 border-b border-border text-xs font-medium text-text-faint uppercase tracking-wide">
        Keranjang
      </div>

      {lines.length === 0 ? (
        <EmptyState icon={ShoppingCart} message="Belum ada produk dipilih." />
      ) : (
        <div className="divide-y divide-border max-h-[340px] overflow-y-auto">
          {lines.map((l) => (
            <div key={l.id} className="px-3.5 py-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {l.kind === 'racik' ? (
                    <>
                      <div className="text-sm text-text truncate">{l.variant.name}</div>
                      <div className="text-[11px] text-text-faint">
                        {l.ml} ml &times; {formatCurrency(l.variant.price)} + botol {l.bottle.size} {formatCurrency(l.bottle.price)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-text truncate">{l.product.name}</div>
                      <div className="text-[11px] text-text-faint">{formatCurrency(l.product.price)}/{l.product.unit}</div>
                    </>
                  )}
                </div>
                <button onClick={() => onRemove(l.id)} className="text-text-faint hover:text-danger transition p-2 -m-1.5 lg:p-0.5 lg:m-0" aria-label="Hapus">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button className={stepBtn} onClick={() => onQty(l.id, l.qty - 1)} aria-label="Kurangi">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-mono tnum">{l.qty}</span>
                    <button className={stepBtn} onClick={() => onQty(l.id, l.qty + 1)} disabled={l.qty >= maxQty(l, lines)} aria-label="Tambah">
                      <Plus size={12} />
                    </button>
                  </div>
                  {l.kind === 'racik' && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={maxMl(l, lines)}
                        value={l.ml}
                        onChange={(e) => onMl(l.id, Math.floor(Number(e.target.value)))}
                        className="h-9 w-16 px-2 text-xs lg:h-6"
                        aria-label="Isi ml"
                      />
                      <span className="text-[11px] text-text-faint">ml</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-mono tnum text-text">{formatCurrency(linePrice(l))}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3.5 border-t border-border space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Diskon</label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden h-9">
            {(['rp', 'persen'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDiscountType(t)}
                className={clsx('px-3 text-sm transition', discountType === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text')}
              >
                {t === 'rp' ? 'Rp' : '%'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Catatan / nama pembeli (opsional)</label>
          <Input value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="mis. Bu Rina" />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal</span>
            <span className="font-mono tnum">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Diskon</span>
              <span className="font-mono tnum">- {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-text-muted">Total</span>
            <span className="text-xl font-semibold font-mono tnum text-text">{formatCurrency(total)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Metode Pembayaran</label>
          <Select value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        {cash && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Uang diterima</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={paid || ''}
                onChange={(e) => setPaid(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="secondary" disabled={total <= 0} onClick={() => setPaid(total)}>
                Uang pas
              </Button>
              {CASH_SHORTCUTS.map((n) => (
                <Button key={n} type="button" size="sm" variant="secondary" onClick={() => setPaid(n)}>
                  {formatCurrency(n)}
                </Button>
              ))}
            </div>
            {shortfall ? (
              <div className="text-[13px] text-danger">Uang kurang {formatCurrency(total - paid)}.</div>
            ) : (
              change > 0 && (
                <div className="flex justify-between rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                  <span>Kembalian</span>
                  <span className="font-semibold font-mono tnum">{formatCurrency(change)}</span>
                </div>
              )
            )}
          </div>
        )}

        {error && <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}

        <Button className="w-full" disabled={!canSubmit} onClick={submit}>
          {saving ? 'Menyimpan...' : 'Simpan Penjualan'}
        </Button>
      </div>
    </Card>
  );
}
