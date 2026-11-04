import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Navigation, Store, Truck } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '../../hooks/useCart';
import { usePublicData } from '../../hooks/usePublicData';
import { ApiRequestError } from '../../services/api';
import { createPublicOrder } from '../../services/public';
import type { Fulfillment } from '../../types';
import { formatCurrency } from '../../utils/format';
import { usePageTitle } from '../../utils/storefront';
import { useResolvedCart } from './resolveCart';

export const LAST_ORDER_KEY = 'gpk_last_order';

const field =
  'w-full h-12 px-3.5 rounded-xl bg-surface border border-border text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50';

const looksLikePhone = (v: string) => /^(\+?62|0)8\d{8,11}$/.test(v.replace(/[\s-]/g, ''));

export default function Checkout() {
  usePageTitle('Checkout - Global Parfum Kutoarjo');
  const navigate = useNavigate();
  const { store } = usePublicData();
  const { clear } = useCart();
  const { rows, orderLines, total, hasInvalid, ready } = useResolvedCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('ambil');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // kolom jebakan bot
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && rows.length === 0) return <Navigate to="/keranjang" replace />;

  const errors = {
    name: name.trim().length < 2 ? 'Nama minimal 2 huruf.' : '',
    phone: looksLikePhone(phone) ? '' : 'Gunakan nomor WhatsApp aktif, mis. 081234567890.',
    address: fulfillment === 'kirim' && address.trim().length < 10 ? 'Alamat lengkap wajib diisi (jalan, nomor, RT/RW, kecamatan, kota).' : '',
  };
  const valid = !errors.name && !errors.phone && !errors.address && !hasInvalid;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const order = await createPublicOrder({
        customerName: name,
        customerPhone: phone,
        fulfillment,
        address: fulfillment === 'kirim' ? address : undefined,
        note: note || undefined,
        website,
        lines: orderLines,
      });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNumber: order.orderNumber, total: order.total, fulfillment: order.fulfillment }));
      } catch {
        /* sessionStorage diblokir: halaman sukses memakai state navigasi */
      }
      clear();
      navigate('/pesanan-berhasil', { replace: true, state: order });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Pesanan belum bisa dikirim. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  const showErr = (msg: string) => touched && msg && <p className="text-xs text-warning mt-1.5">{msg}</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <h1 className="text-2xl font-extrabold text-text">Checkout</h1>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-sm font-bold text-text mb-2.5">Metode pesanan</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                { v: 'ambil', t: 'Ambil di toko', d: 'Ambil langsung setelah pesanan siap.', icon: Store },
                { v: 'kirim', t: 'Dikirim', d: 'Dikirim ke alamat Anda. Ongkir dikonfirmasi admin.', icon: Truck },
              ] as const
            ).map(({ v, t, d, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setFulfillment(v)}
                aria-pressed={fulfillment === v}
                className={clsx(
                  'text-left rounded-xl border p-4 flex gap-3 transition min-h-[76px]',
                  fulfillment === v ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <Icon size={20} className="text-accent-glow shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="block text-[15px] font-semibold text-text">{t}</span>
                  <span className="block text-xs text-text-muted mt-0.5">{d}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {fulfillment === 'ambil' && store && (
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
            <div>
              <div className="text-sm font-semibold text-text">Ambil di {store.storeName}</div>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">{store.address}</p>
              {store.openingHours && <p className="text-xs text-text-faint mt-1 whitespace-pre-line">{store.openingHours}</p>}
            </div>
            {store.mapsUrl && (
              <a
                href={store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-lg bg-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent-hover transition"
              >
                <Navigation size={16} aria-hidden="true" /> Buka Google Maps
              </a>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-text">Data pemesan</h2>
          <div>
            <label htmlFor="nama" className="block text-[13px] font-semibold text-text-muted mb-1.5">
              Nama lengkap
            </label>
            <input id="nama" className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} placeholder="Nama pemesan" />
            {showErr(errors.name)}
          </div>
          <div>
            <label htmlFor="wa" className="block text-[13px] font-semibold text-text-muted mb-1.5">
              Nomor WhatsApp
            </label>
            <input id="wa" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="081234567890" />
            <p className="text-xs text-text-faint mt-1.5">Admin menghubungi nomor ini. Nomor ini juga dipakai untuk mengecek status pesanan.</p>
            {showErr(errors.phone)}
          </div>
          {fulfillment === 'kirim' && (
            <div>
              <label htmlFor="alamat" className="block text-[13px] font-semibold text-text-muted mb-1.5">
                Alamat pengiriman
              </label>
              <textarea
                id="alamat"
                rows={4}
                maxLength={400}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"
                className="w-full px-3.5 py-3 rounded-xl bg-surface border border-border text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 resize-none leading-relaxed"
              />
              {showErr(errors.address)}
            </div>
          )}
          <div>
            <label htmlFor="catatan" className="block text-[13px] font-semibold text-text-muted mb-1.5">
              Catatan <span className="font-normal text-text-faint">(opsional)</span>
            </label>
            <input id="catatan" className={field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Mis. kirim sore hari, patokan rumah" />
          </div>

          {/* kolom jebakan: manusia tidak melihatnya, bot biasanya mengisinya */}
          <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
            <label>
              Situs web
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>
        </div>

        <p className="text-xs text-text-faint leading-relaxed">
          Nama, nomor WhatsApp, dan alamat Anda hanya dipakai untuk memproses pesanan ini dan hanya dilihat admin toko.
        </p>

        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}
        {hasInvalid && (
          <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 text-warning text-sm px-4 py-3">
            Ada produk yang sudah tidak tersedia. <Link to="/keranjang" className="underline">Periksa keranjang</Link>.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-13 min-h-[52px] rounded-xl bg-accent text-white text-[15px] font-bold hover:bg-accent-hover transition disabled:opacity-60"
        >
          {saving ? 'Mengirim pesanan...' : `Kirim pesanan · ${formatCurrency(total)}`}
        </button>
      </form>

      <aside className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3 lg:sticky lg:top-24">
        <h2 className="font-bold text-text">Pesanan Anda</h2>
        <ul className="flex flex-col gap-2.5">
          {rows.map(({ line, label, detail, unitTotal }) => (
            <li key={line.id} className="flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium text-text">
                  {label} <span className="text-text-faint">× {line.qty}</span>
                </div>
                <div className="text-xs text-text-muted">{detail}</div>
              </div>
              <div className="font-medium text-text whitespace-nowrap">{formatCurrency(unitTotal * line.qty)}</div>
            </li>
          ))}
        </ul>
        <div className="h-px bg-border" />
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-text">Total</span>
          <span className="text-xl font-extrabold text-text">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-text-faint">{fulfillment === 'kirim' ? 'Belum termasuk ongkos kirim.' : 'Dibayar saat pesanan diambil / sesuai konfirmasi admin.'}</p>
        <Link to="/keranjang" className="text-center text-sm text-text-muted hover:text-text h-10 flex items-center justify-center">
          Ubah keranjang
        </Link>
      </aside>
    </div>
  );
}
