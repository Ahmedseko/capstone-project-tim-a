import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  PlusCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface Command {
  label: string;
  icon: typeof LayoutDashboard;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      { label: 'Buka Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard') },
      { label: 'Tambah Stok', icon: Boxes, action: () => navigate('/stok?new=1') },
      { label: 'Catat Penjualan', icon: ShoppingCart, action: () => navigate('/penjualan') },
      { label: 'Pesanan Online', icon: ShoppingCart, action: () => navigate('/pesanan-online') },
      { label: 'Closing Hari Ini', icon: ClipboardCheck, action: () => navigate('/closing') },
    ];
    if (user?.role === 'admin') {
      base.splice(1, 0, { label: 'Tambah Produk', icon: Package, action: () => navigate('/produk?new=1') });
      base.push({ label: 'Buka Laporan', icon: BarChart3, action: () => navigate('/laporan') });
    }
    return base;
  }, [navigate, user]);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface-elevated shadow-2xl overflow-hidden animate-in">
        <div className="flex items-center gap-2.5 px-3.5 h-11 border-b border-border">
          <Search size={15} className="text-text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari perintah..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] text-text-faint">Esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <div className="px-3.5 py-6 text-center text-xs text-text-faint">Tidak ada hasil.</div>
          )}
          {filtered.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 h-9 text-sm text-text hover:bg-white/[0.06] transition text-left"
            >
              <cmd.icon size={15} className="text-text-muted" />
              {cmd.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-3.5 h-8 border-t border-border text-[11px] text-text-faint">
          <PlusCircle size={12} />
          Navigasi cepat & aksi umum
        </div>
      </div>
    </div>,
    document.body,
  );
}
