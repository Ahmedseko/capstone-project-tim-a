import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from '../components/CommandPalette';
import { MobileNav } from './MobileNav';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/produk': 'Produk',
  '/katalog': 'Katalog Harga',
  '/stok': 'Stok',
  '/penjualan': 'Penjualan',
  '/closing': 'Closing Harian',
  '/laporan': 'Laporan',
  '/pengaturan': 'Pengaturan',
};

export function AppLayout() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const title = titles[location.pathname] ?? 'Global Parfum Kutoarjo';

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden print:h-auto print:overflow-visible print:bg-white print:text-black">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Topbar
            title={title}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
