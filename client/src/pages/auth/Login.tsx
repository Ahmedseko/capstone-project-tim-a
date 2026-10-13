import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SprayCan, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ApiRequestError } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('expired') ? 'Sesi Anda berakhir. Silakan masuk lagi.' : null,
  );

  const isValid = email.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await login(email, password, remember);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent-glow/10 blur-[110px]" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
          <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-surface via-surface-elevated/50 to-surface">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 text-accent">
                  <SprayCan size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">Global Parfum Kutoarjo</div>
                  <div className="text-[11px] text-text-faint">Sistem Manajemen Penjualan &amp; Stok</div>
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-text leading-snug max-w-sm">
                Kelola penjualan dan stok parfum dengan lebih rapi.
              </h1>
              <p className="text-sm text-text-muted mt-2 max-w-sm">
                Satu sistem untuk produk, stok, penjualan harian, dan laporan usaha Anda.
              </p>
            </div>
            <p className="text-[11px] text-text-faint">
              Sistem Informasi UMKM &middot; &copy; 2026 Global Parfum Kutoarjo
            </p>
          </div>

          <div className="p-8 sm:p-10 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-text mb-1">Masuk ke Akun Anda</h2>
            <p className="text-sm text-text-muted mb-6">Gunakan email dan kata sandi Anda.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1.5">
                  Email / Nama Pengguna
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="nama@globalparfum.id"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-text-muted mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-faint hover:text-text transition"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
                />
                <span className="text-sm text-text">Ingat saya</span>
              </label>

              {error && (
                <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={!isValid || loading} className="w-full h-10.5">
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
