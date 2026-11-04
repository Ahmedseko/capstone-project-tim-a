import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { CartProvider } from './hooks/useCart';
import { PublicDataProvider } from './hooks/usePublicData';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Produk from './pages/Produk';
import Katalog from './pages/Katalog';
import Stok from './pages/Stok';
import Penjualan from './pages/Penjualan';
import ClosingHarian from './pages/ClosingHarian';
import Laporan from './pages/Laporan';
import Pengaturan from './pages/Pengaturan';
import PesananOnline from './pages/PesananOnline';
import EtalaseOnline from './pages/EtalaseOnline';
import { PublicLayout } from './components/public/PublicLayout';
import Beranda from './pages/public/Beranda';
import KatalogToko from './pages/public/Katalog';
import ProdukDetail from './pages/public/ProdukDetail';
import Keranjang from './pages/public/Keranjang';
import Checkout from './pages/public/Checkout';
import PesananBerhasil from './pages/public/PesananBerhasil';
import CekPesanan from './pages/public/CekPesanan';

// Halaman publik memuat info toko + katalog sekali; halaman admin tidak ikut memuatnya.
function PublicRoot() {
  return (
    <PublicDataProvider>
      <PublicLayout />
    </PublicDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
        <Routes>
          <Route element={<PublicRoot />}>
            <Route path="/" element={<Beranda />} />
            <Route path="/katalog" element={<KatalogToko />} />
            <Route path="/katalog/:id" element={<ProdukDetail />} />
            <Route path="/keranjang" element={<Keranjang />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pesanan-berhasil" element={<PesananBerhasil />} />
            <Route path="/cek-pesanan" element={<CekPesanan />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produk" element={<Produk />} />
            <Route
              path="/katalog-harga"
              element={
                <ProtectedRoute adminOnly>
                  <Katalog />
                </ProtectedRoute>
              }
            />
            <Route path="/stok" element={<Stok />} />
            <Route path="/penjualan" element={<Penjualan />} />
            <Route path="/pesanan-online" element={<PesananOnline />} />
            <Route path="/etalase" element={<EtalaseOnline />} />
            <Route path="/closing" element={<ClosingHarian />} />
            <Route
              path="/laporan"
              element={
                <ProtectedRoute adminOnly>
                  <Laporan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pengaturan"
              element={
                <ProtectedRoute adminOnly>
                  <Pengaturan />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
