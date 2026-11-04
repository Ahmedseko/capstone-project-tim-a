import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  Settings,
  Tags,
  LogOut,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produk', label: 'Produk', icon: Package },
  { to: '/stok', label: 'Stok', icon: Boxes },
  { to: '/penjualan', label: 'Penjualan', icon: ShoppingCart },
  { to: '/closing', label: 'Closing Harian', icon: ClipboardCheck },
  { to: '/katalog', label: 'Katalog', icon: Tags, adminOnly: true },
  { to: '/laporan', label: 'Laporan', icon: BarChart3, adminOnly: true },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings, adminOnly: true },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  if (!open) return null;
  const items = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-64 max-w-[85vw] h-full bg-surface border-r border-border flex flex-col animate-in">
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <span className="text-[13px] font-semibold text-text">Global Parfum</span>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text" aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 px-2.5 h-11 rounded-md text-[14px] transition',
                  isActive ? 'bg-white/[0.06] text-text' : 'text-text-muted hover:text-text hover:bg-white/[0.04]',
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2.5 py-3 border-t border-border flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent text-[11px] font-semibold">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-text truncate">{user?.name}</div>
          </div>
          <button onClick={logout} className="p-1.5 text-text-faint hover:text-danger transition" aria-label="Keluar">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
