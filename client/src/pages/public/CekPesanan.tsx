import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../components/ui/Badge';
import { usePublicData } from '../../hooks/usePublicData';
import { ApiRequestError } from '../../services/api';
import { lookupOrder } from '../../services/public';
import type { OrderLookup } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ORDER_STEPS, orderStatusLabel, orderStatusTone, usePageTitle, waLink } from '../../utils/storefront';

const field =
  'w-full h-12 px-3.5 rounded-xl bg-surface border border-border text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50';

export default function CekPesanan() {
  usePageTitle('Cek Pesanan - Global Parfum Kutoarjo');
  const { store } = usePublicData();
  const [params] = useSearchParams();
  const [number, setNumber] = useState(params.get('no') ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderLookup | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!number.trim() || !phone.trim()) {
      setError('Isi nomor pesanan dan nomor WhatsApp.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await lookupOrder(number.trim(), phone.trim()));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Belum bisa mengecek pesanan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = result ? ORDER_STEPS.indexOf(result.status) : -1;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">Cek Pesanan</h1>
        <p className="text-sm text-text-muted mt-1">Masukkan nomor pesanan dan nomor WhatsApp yang dipakai saat memesan.</p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
        <div>
          <label htmlFor="no" className="block text-[13px] font-semibold text-text-muted mb-1.5">
            Nomor pesanan
          </label>
          <input id="no" className={field} value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="ORD-20261104-001" autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="hp" className="block text-[13px] font-semibold text-text-muted mb-1.5">
            Nomor WhatsApp
          </label>
          <input id="hp" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="081234567890" />
        </div>
        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="h-12 rounded-xl bg-accent text-white text-[15px] font-bold hover:bg-accent-hover transition disabled:opacity-60">
          {loading ? 'Mengecek...' : 'Cek status'}
        </button>
      </form>

      {result && (
        <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div>
              <div className="text-xs text-text-faint">Nomor pesanan</div>
              <div className="text-lg font-bold text-text whitespace-nowrap">{result.orderNumber}</div>
              <div className="text-xs text-text-muted mt-0.5">{formatDateTime(result.createdAt)}</div>
            </div>
            <Badge tone={orderStatusTone(result.status)}>{orderStatusLabel(result.status, result.fulfillment)}</Badge>
          </div>

          {result.status === 'batal' ? (
            <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2.5">Pesanan ini dibatalkan. Hubungi toko kalau ada pertanyaan.</p>
          ) : (
            <ol className="flex flex-col gap-0" aria-label="Tahapan pesanan">
              {ORDER_STEPS.map((step, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0', done ? 'bg-accent text-white' : 'bg-white/[0.08] text-text-faint')}>
                        {done ? <Check size={13} aria-hidden="true" /> : i + 1}
                      </span>
                      {i < ORDER_STEPS.length - 1 && <span className={clsx('w-0.5 flex-1 min-h-[18px]', i < stepIndex ? 'bg-accent' : 'bg-white/[0.08]')} />}
                    </div>
                    <div className={clsx('pb-3 text-sm', done ? 'text-text font-medium' : 'text-text-faint')}>{orderStatusLabel(step, result.fulfillment)}</div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="h-px bg-border" />
          <ul className="flex flex-col gap-2.5">
            {result.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-text">
                    {l.label} <span className="text-text-faint">× {l.quantity}</span>
                  </div>
                  <div className="text-xs text-text-muted">{l.detail}</div>
                </div>
                <div className="font-medium text-text whitespace-nowrap">{formatCurrency(l.subtotal)}</div>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Metode</span>
            <span className="text-text font-medium">{result.fulfillment === 'ambil' ? 'Ambil di toko' : 'Dikirim'}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-text-muted">Total</span>
            <span className="text-xl font-extrabold text-text">{formatCurrency(result.total)}</span>
          </div>

          {store?.whatsapp && (
            <a
              href={waLink(store.whatsapp, `Halo ${store.storeName}, saya ingin menanyakan pesanan ${result.orderNumber}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 rounded-xl bg-[#25D366] text-[#06210F] text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              <MessageCircle size={17} aria-hidden="true" /> Tanya lewat WhatsApp
            </a>
          )}
        </section>
      )}

      <Link to="/katalog" className="text-center text-sm text-text-muted hover:text-text h-10 flex items-center justify-center">
        Belanja lagi
      </Link>
    </div>
  );
}
