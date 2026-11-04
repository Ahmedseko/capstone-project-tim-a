import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import { ProductCard } from '../../components/public/ProductCard';
import { usePublicData } from '../../hooks/usePublicData';
import { categoryLabel, usePageTitle } from '../../utils/storefront';

type Sort = 'nama' | 'termurah' | 'termahal';

export default function Katalog() {
  usePageTitle('Katalog Parfum - Global Parfum Kutoarjo');
  const { catalog, loading, error, reload } = usePublicData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<Sort>('nama');

  const categories = useMemo(() => [...new Set((catalog?.products ?? []).map((p) => p.category))].sort(), [catalog]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (catalog?.products ?? []).filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
        (!category || p.category === category) &&
        (!onlyAvailable || p.available),
    );
    return [...list].sort((a, b) => (sort === 'termurah' ? a.price - b.price : sort === 'termahal' ? b.price - a.price : a.name.localeCompare(b.name)));
  }, [catalog, search, category, onlyAvailable, sort]);

  const chip = (active: boolean) =>
    clsx(
      'shrink-0 h-10 px-4 rounded-full text-[13px] font-semibold border transition',
      active ? 'bg-accent border-accent text-white' : 'border-border-strong text-text-muted hover:text-text',
    );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text">Katalog</h1>
        <p className="text-sm text-text-muted mt-1">Pilih parfum, lalu tambahkan ke keranjang.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="cari-produk" className="sr-only">
            Cari parfum
          </label>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
          <input
            id="cari-produk"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari parfum, mis. Baccarat"
            className="w-full h-12 pl-10 pr-3 rounded-xl bg-surface border border-border text-text placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
          />
        </div>
        <label className="sr-only" htmlFor="urut">
          Urutkan
        </label>
        <select
          id="urut"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-12 px-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:border-accent"
        >
          <option value="nama">Urut nama</option>
          <option value="termurah">Harga termurah</option>
          <option value="termahal">Harga termahal</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="group" aria-label="Filter kategori">
        <button className={chip(category === '')} aria-pressed={category === ''} onClick={() => setCategory('')}>
          Semua
        </button>
        {categories.map((c) => (
          <button key={c} className={chip(category === c)} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {categoryLabel(c)}
          </button>
        ))}
        <button className={chip(onlyAvailable)} aria-pressed={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
          Hanya yang tersedia
        </button>
      </div>

      {error ? (
        <div className="py-16 text-center">
          <p className="text-text-muted mb-4">Katalog belum bisa dimuat.</p>
          <button onClick={reload} className="h-11 px-5 rounded-lg bg-accent text-white text-sm font-semibold">
            Coba lagi
          </button>
        </div>
      ) : loading && !catalog ? (
        <p className="text-sm text-text-muted py-10">Memuat katalog...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted py-10 text-center">Tidak ada produk yang cocok dengan pencarian Anda.</p>
      ) : (
        <>
          <p className="text-xs text-text-faint" aria-live="polite">
            {items.length} produk
          </p>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
