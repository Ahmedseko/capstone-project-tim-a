import { Link, NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, Home, Search, ShoppingCart, SprayCan, Store } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { usePublicData } from '../../hooks/usePublicData';
import { waLink } from '../../utils/storefront';

const NAV = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/katalog', label: 'Katalog', icon: Store, end: false },
  { to: '/cek-pesanan', label: 'Cek Pesanan', icon: ClipboardList, end: false },
];

function CartButton({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      to="/keranjang"
      aria-label={`Keranjang, ${count} item`}
      className={clsx('relative flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-surface text-text hover:bg-white/[0.05] transition', className)}
    >
      <ShoppingCart size={19} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}

export function PublicLayout() {
  const { store } = usePublicData();
  const { user } = useAuth();
  const { count } = useCart();
  const name = store?.storeName ?? 'Global Parfum Kutoarjo';

  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 text-accent shrink-0">
              <SprayCan size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-bold truncate">{name}</span>
              <span className="block text-[11px] text-text-faint truncate">Kutoarjo, Purworejo</span>
            </span>
          </Link>

          <nav aria-label="Menu utama" className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx('px-3.5 h-10 flex items-center rounded-lg text-sm font-medium transition', isActive ? 'text-text bg-white/[0.06]' : 'text-text-muted hover:text-text')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />
          <Link to="/katalog" aria-label="Cari produk" className="md:hidden flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-surface">
            <Search size={18} aria-hidden="true" />
          </Link>
          <CartButton />
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface/50 mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-2 text-sm text-text-muted">
          <div className="flex flex-col gap-1.5">
            <div className="text-text font-semibold">{name}</div>
            {store?.address && <p className="leading-relaxed">{store.address}</p>}
            {store?.openingHours && <p className="whitespace-pre-line">{store.openingHours}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex gap-3">
              {store?.whatsapp && (
                <a
                  href={waLink(store.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat WhatsApp ${store.phone}`}
                  title={`WhatsApp ${store.phone}`}
                  className="w-11 h-11 rounded-xl border border-border bg-surface flex items-center justify-center hover:bg-white/[0.07] transition"
                >
                  <img src="/icons/whatsapp.png" alt="" width={26} height={26} />
                </a>
              )}
              {store?.email && (
                <a
                  href={`mailto:${store.email}`}
                  aria-label={`Kirim email ke ${store.email}`}
                  title={store.email}
                  className="w-11 h-11 rounded-xl border border-border bg-surface flex items-center justify-center hover:bg-white/[0.07] transition"
                >
                  <img src="/icons/gmail.png" alt="" width={28} height={21} />
                </a>
              )}
            </div>
            <Link to={user ? '/dashboard' : '/login'} className="text-xs text-text-faint hover:text-text-muted mt-2">
              {user ? 'Buka dashboard' : 'Masuk admin / staff'}
            </Link>
          </div>
        </div>
      </footer>

      {/* ponsel: bilah menu bawah ala aplikasi */}
      <nav aria-label="Menu bawah" className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md">
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx('h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-accent-glow' : 'text-text-muted')
                }
              >
                <Icon size={19} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink
              to="/keranjang"
              className={({ isActive }) =>
                clsx('relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-accent-glow' : 'text-text-muted')
              }
            >
              <ShoppingCart size={19} aria-hidden="true" />
              Keranjang
              {count > 0 && (
                <span className="absolute top-2 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
