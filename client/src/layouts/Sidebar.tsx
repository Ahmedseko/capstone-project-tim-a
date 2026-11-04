import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  PackageCheck,
  Store,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  SprayCan,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { useOrderBadge } from '../hooks/useOrderBadge';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produk', label: 'Produk', icon: Package },
  { to: '/stok', label: 'Stok', icon: Boxes },
  { to: '/penjualan', label: 'Penjualan', icon: ShoppingCart },
  { to: '/pesanan-online', label: 'Pesanan Online', icon: PackageCheck },
  { to: '/etalase', label: 'Etalase Online', icon: Store },
  { to: '/closing', label: 'Closing Harian', icon: ClipboardCheck },
  { to: '/laporan', label: 'Laporan', icon: BarChart3, adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const newOrders = useOrderBadge();
  const items = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <aside className="hidden lg:flex flex-col h-full w-[240px] shrink-0 border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-accent/15 text-accent">
          <SprayCan size={15} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-text">Global Parfum</div>
          <div className="text-[11px] text-text-faint">Kutoarjo</div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition',
                isActive
                  ? 'bg-white/[0.06] text-text border border-border shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]'
                  : 'text-text-muted hover:text-text hover:bg-white/[0.04] border border-transparent',
              )
            }
          >
            <Icon size={15} />
            <span className="flex-1">{label}</span>
            {to === '/pesanan-online' && newOrders > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center" aria-label={`${newOrders} pesanan baru`}>
                {newOrders}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2.5 py-3 border-t border-border space-y-0.5">
        {user?.role === 'admin' && (
          <NavLink
            to="/pengaturan"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition',
                isActive
                  ? 'bg-white/[0.06] text-text border border-border'
                  : 'text-text-muted hover:text-text hover:bg-white/[0.04] border border-transparent',
              )
            }
          >
            <Settings size={15} />
            Pengaturan
          </NavLink>
        )}

        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent text-[11px] font-semibold shrink-0">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-text truncate">{user?.name}</div>
            <div className="text-[11px] text-text-faint truncate capitalize">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded text-text-faint hover:text-danger hover:bg-danger/10 transition shrink-0"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
