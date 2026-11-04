import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, MessageCircle, ShoppingBag, Truck } from 'lucide-react';
import { ProductCard } from '../../components/public/ProductCard';
import { StoreInfoCard } from '../../components/public/StoreInfoCard';
import { usePublicData } from '../../hooks/usePublicData';
import { mediaUrl } from '../../services/public';
import { usePageTitle, waLink } from '../../utils/storefront';

const STEPS = [
  { title: 'Pilih Parfum', text: 'Lihat katalog, pilih aroma, ukuran botol, dan isi sesuai selera. Harga langsung terlihat.' },
  { title: 'Isi Data Pesanan', text: 'Tulis nama, nomor WhatsApp, dan pilih ambil di toko atau dikirim. Tidak perlu membuat akun.' },
  { title: 'Konfirmasi Pesanan', text: 'Admin akan menghubungi Anda melalui WhatsApp. Status pesanan dapat dipantau kapan saja melalui menu Cek Pesanan.' },
];

export default function Beranda() {
  const { store, catalog, loading, error, reload } = usePublicData();
  usePageTitle(store ? `${store.storeName} - Toko Parfum Kutoarjo` : 'Global Parfum Kutoarjo');

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-text-muted mb-4">Halaman belum bisa dimuat. Periksa koneksi Anda lalu coba lagi.</p>
        <button onClick={reload} className="h-11 px-5 rounded-lg bg-accent text-white text-sm font-semibold">
          Muat ulang
        </button>
      </div>
    );
  }

  const featured = (catalog?.products ?? []).filter((p) => p.available).slice(0, 8);
  const photos = store?.photoIds ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-14">
      {store?.announcement && (
        <div role="status" className="-mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text leading-relaxed">
          {store.announcement}
        </div>
      )}
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div className="flex flex-col gap-5">
          <span className="text-xs font-bold tracking-[0.14em] text-accent-glow">PARFUM RACIK &middot; KUTOARJO</span>
          <h1 className="text-[28px] sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] text-text">
            Wangi pilihanmu, diracik sesuai selera dan siap diantar ke rumah.
          </h1>
          <p className="text-[15px] sm:text-base text-text-muted leading-relaxed max-w-xl">
            {store?.storeProfile || 'Global Parfum Kutoarjo adalah toko parfum di Kutoarjo, Purworejo. Kami melayani parfum racik per ml sesuai selera Anda, parfum botolan, dan perlengkapan parfum. Datang langsung ke toko atau pesan secara online. Kami siap membantu Anda menemukan aroma yang sesuai.'}
          </p>
          <div className="flex flex-wrap gap-3 mt-1">
            <Link to="/katalog" className="h-12 px-6 rounded-xl bg-accent text-white text-sm font-bold flex items-center gap-2 hover:bg-accent-hover transition">
              Lihat katalog <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {store?.whatsapp && (
              <a
                href={waLink(store.whatsapp, `Halo ${store.storeName}, saya ingin bertanya.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-xl bg-[#25D366] text-[#06210F] text-sm font-bold flex items-center gap-2 hover:brightness-110 transition"
              >
                <MessageCircle size={17} aria-hidden="true" /> Hubungi via WhatsApp
              </a>
            )}
            {store?.shopeeUrl && (
              <a
                href={store.shopeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-xl border border-border-strong text-text text-sm font-semibold flex items-center gap-2 hover:bg-white/[0.04] transition"
              >
                <ShoppingBag size={16} aria-hidden="true" /> Beli di Shopee
              </a>
            )}
          </div>
          <ul className="grid grid-cols-3 gap-2 mt-2 text-center text-xs font-semibold text-text-muted max-w-md">
            <li className="rounded-xl border border-border bg-surface px-2 py-3 flex flex-col items-center gap-1.5">
              <Droplets size={18} className="text-accent-glow" aria-hidden="true" /> Racik Sesuai Selera
            </li>
            <li className="rounded-xl border border-border bg-surface px-2 py-3 flex flex-col items-center gap-1.5">
              <Truck size={18} className="text-accent-glow" aria-hidden="true" /> Antar ke Rumah
            </li>
            <li className="rounded-xl border border-border bg-surface px-2 py-3 flex flex-col items-center gap-1.5">
              <MessageCircle size={18} className="text-accent-glow" aria-hidden="true" /> Konfirmasi via WhatsApp
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-surface overflow-hidden aspect-[4/3] lg:aspect-[5/4]">
          {photos.length > 0 ? (
            <img src={mediaUrl(photos[0])} alt={`Toko ${store?.storeName ?? ''}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-end justify-center gap-4 pb-10 bg-surface-elevated" role="img" aria-label="Ilustrasi botol parfum">
              {[
                { w: 62, c: '#4a2a4a' },
                { w: 86, c: '#3b2a63' },
                { w: 62, c: '#1f3a4d' },
              ].map((b, i) => (
                <svg key={i} width={b.w} height={b.w * 1.5} viewBox="0 0 64 96" aria-hidden="true">
                  <rect x="24" y="2" width="16" height="12" rx="3" fill="#E9E2F7" />
                  <rect x="28" y="14" width="8" height="8" fill="#BFB6D6" />
                  <rect x="8" y="22" width="48" height="70" rx="12" fill="#F4F2F8" fillOpacity="0.92" />
                  <rect x="16" y="46" width="32" height="22" rx="4" fill={b.c} />
                </svg>
              ))}
            </div>
          )}
        </div>
      </section>

      {photos.length > 1 && (
        <section aria-label="Foto toko" className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-text">Galeri Toko</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.slice(1).map((id) => (
              <div key={id} className="rounded-xl overflow-hidden border border-border aspect-[4/3] bg-surface">
                <img src={mediaUrl(id)} alt="Foto toko" loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text">Parfum Pilihan</h2>
          <Link to="/katalog" className="text-sm font-semibold text-accent-glow hover:underline underline-offset-2 whitespace-nowrap">
            Lihat semua
          </Link>
        </div>
        {loading && !catalog ? (
          <p className="text-sm text-text-muted">Memuat katalog...</p>
        ) : featured.length === 0 ? (
          <p className="text-sm text-text-muted">Katalog segera hadir.</p>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xl sm:text-2xl font-bold text-text">Cara Pesan</h2>
        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-2">
              <span className="w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
              <h3 className="font-semibold text-text">{s.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {store && <StoreInfoCard store={store} />}

      {store?.shopeeUrl && (
        <section className="rounded-2xl bg-surface-elevated border border-border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text">Lebih suka belanja di Shopee?</h2>
            <p className="text-sm text-text-muted mt-1">Etalase kami juga ada di sana.</p>
          </div>
          <a
            href={store.shopeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-6 rounded-xl bg-text text-bg text-sm font-bold flex items-center justify-center hover:opacity-90 transition"
          >
            Buka toko di Shopee
          </a>
        </section>
      )}
    </div>
  );
}
