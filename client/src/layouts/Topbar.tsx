import { Menu, Search } from 'lucide-react';

export function Topbar({
  title,
  onOpenPalette,
  onOpenMobileNav,
}: {
  title: string;
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="flex items-center gap-3 h-14 px-4 lg:px-6 border-b border-border bg-surface/80 backdrop-blur-md shrink-0">
      <button
        onClick={onOpenMobileNav}
        className="lg:hidden p-2 -ml-2 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
        aria-label="Buka menu"
      >
        <Menu size={18} />
      </button>

      <h1 className="text-[15px] font-semibold text-text truncate min-w-0">{title}</h1>

      <div className="flex-1" />

      <button
        onClick={onOpenPalette}
        className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-bg text-text-faint text-[13px] hover:border-border-strong transition w-56"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Cari...</span>
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">Ctrl K</kbd>
      </button>

      <button
        onClick={onOpenPalette}
        className="sm:hidden p-2 rounded text-text-muted hover:text-text hover:bg-white/[0.06] transition"
        aria-label="Cari"
      >
        <Search size={17} />
      </button>
    </header>
  );
}
