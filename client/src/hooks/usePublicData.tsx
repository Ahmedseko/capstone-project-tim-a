import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getPublicCatalog, getPublicStore } from '../services/public';
import type { PublicCatalog, PublicStore } from '../types';

interface PublicData {
  store: PublicStore | null;
  catalog: PublicCatalog | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

const PublicDataContext = createContext<PublicData | null>(null);

// Info toko dan katalog dimuat sekali untuk semua halaman publik.
export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PublicStore | null>(null);
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([getPublicStore(), getPublicCatalog()])
      .then(([s, c]) => {
        setStore(s);
        setCatalog(c);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  return <PublicDataContext.Provider value={{ store, catalog, loading, error, reload }}>{children}</PublicDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePublicData() {
  const ctx = useContext(PublicDataContext);
  if (!ctx) throw new Error('usePublicData must be used within PublicDataProvider');
  return ctx;
}
