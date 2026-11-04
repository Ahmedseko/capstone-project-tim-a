import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { StoreInfoCard } from '../../components/public/StoreInfoCard';
import { usePublicData } from '../../hooks/usePublicData';
import { formatCurrency } from '../../utils/format';
import { usePageTitle, waLink } from '../../utils/storefront';
import { LAST_ORDER_KEY } from './Checkout';

interface LastOrder {
  orderNumber: string;
  total: number;
  fulfillment: 'ambil' | 'kirim';
}

function readLast(state: unknown): LastOrder | null {
  const s = state as Partial<LastOrder> | null;
  if (s?.orderNumber) return s as LastOrder;
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    return raw ? (JSON.parse(raw) as LastOrder) : null;
  } catch {
    return null;
  }
}

export default function PesananBerhasil() {
  usePageTitle('Pesanan terkirim - Global Parfum Kutoarjo');
  const { store } = usePublicData();
  const location = useLocation();
  const order = readLast(location.state);

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center flex flex-col gap-4 items-center">
        <p className="text-text-muted">Belum ada pesanan yang baru dikirim.</p>
        <Link to="/katalog" className="h-12 px-6 rounded-xl bg-accent text-white text-sm font-bold flex items-center">
          Lihat katalog
        </Link>
      </div>
    );
  }

  const message = `Halo ${store?.storeName ?? 'Global Parfum Kutoarjo'}, saya sudah memesan online dengan nomor pesanan ${order.orderNumber}.`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6">
      <div className="text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 size={34} className="text-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">Pesanan terkirim</h1>
        <p className="text-sm text-text-muted max-w-md leading-relaxed">
          Terima kasih! Admin akan menghubungi Anda lewat WhatsApp untuk mengonfirmasi pesanan
          {order.fulfillment === 'kirim' ? ', ongkos kirim,' : ''} dan pembayaran.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-text-faint">Nomor pesanan</div>
            <div className="text-lg font-bold text-text tracking-wide break-all">{order.orderNumber}</div>
          </div>
          <span className="text-xs font-bold text-warning bg-warning/10 rounded-full px-3 py-1.5 whitespace-nowrap">Menunggu konfirmasi</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Metode</span>
          <span className="text-text font-medium">{order.fulfillment === 'ambil' ? 'Ambil di toko' : 'Dikirim'}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-text-muted">Total{order.fulfillment === 'kirim' ? ' (belum termasuk ongkir)' : ''}</span>
          <span className="text-xl font-extrabold text-text">{formatCurrency(order.total)}</span>
        </div>
        <p className="text-xs text-text-faint leading-relaxed">
          Simpan nomor pesanan ini. Anda bisa mengecek statusnya kapan saja di menu Cek Pesanan dengan nomor WhatsApp yang dipakai saat memesan.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        {store?.whatsapp && (
          <a
            href={waLink(store.whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 flex-1 rounded-xl bg-[#25D366] text-[#06210F] text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition"
          >
            <MessageCircle size={17} aria-hidden="true" /> Chat WhatsApp toko
          </a>
        )}
        <Link
          to={`/cek-pesanan?no=${encodeURIComponent(order.orderNumber)}`}
          className="h-12 flex-1 rounded-xl border border-border-strong text-text text-sm font-semibold flex items-center justify-center hover:bg-white/[0.04] transition"
        >
          Cek status pesanan
        </Link>
      </div>

      {order.fulfillment === 'ambil' && store && <StoreInfoCard store={store} heading="Ambil pesanan di sini" />}

      <Link to="/" className="text-center text-sm text-text-muted hover:text-text h-10 flex items-center justify-center">
        Kembali ke beranda
      </Link>
    </div>
  );
}
