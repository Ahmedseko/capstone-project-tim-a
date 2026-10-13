import { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2, Receipt, Package2, ListChecks } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/StatCard';
import { useToast } from '../hooks/useToast';
import { getTodayClosing, closeDay } from '../services/closing';
import type { DailyClosing } from '../types';
import { ApiRequestError } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

export default function ClosingHarian() {
  const { showToast } = useToast();
  const [closing, setClosing] = useState<DailyClosing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actuals, setActuals] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [openingCash, setOpeningCash] = useState(0);
  const [cashCounted, setCashCounted] = useState<number | null>(null); // null = belum diubah, ikut uang seharusnya
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getTodayClosing()
      .then((data) => {
        setClosing(data);
        const initialActuals: Record<number, number> = {};
        data.items.forEach((item) => {
          initialActuals[item.productId] = item.actualStock ?? item.systemStock;
        });
        setActuals(initialActuals);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const isClosed = closing?.status === 'ditutup';

  const cashExpected = isClosed ? (closing?.cashExpected ?? 0) : openingCash + (closing?.totalCash ?? 0);
  const cashActual = isClosed ? (closing?.cashActual ?? null) : (cashCounted ?? cashExpected);
  const cashDiff = cashActual == null ? null : cashActual - cashExpected;

  async function handleClose() {
    if (!closing) return;
    setSaving(true);
    setError(null);
    try {
      const result = await closeDay({
        items: closing.items.map((item) => ({
          productId: item.productId,
          actualStock: actuals[item.productId] ?? item.systemStock,
          note: notes[item.productId]?.trim() || undefined,
        })),
        openingCash,
        cashActual: cashActual ?? cashExpected,
      });
      setClosing(result);
      showToast('Closing harian berhasil dilakukan.');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal melakukan closing harian.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-text-muted">Memuat data closing...</div>;
  if (!closing) return <EmptyState message="Gagal memuat data closing harian." />;

  const totalDifference = closing.items.reduce(
    (sum, item) => sum + Math.abs((isClosed ? item.actualStock : actuals[item.productId] ?? item.systemStock) - item.systemStock),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text">{formatDate(closing.closingDate, { weekday: 'long' })}</p>
          <p className="text-xs text-text-faint">Rekonsiliasi stok &amp; ringkasan penjualan harian</p>
        </div>
        {isClosed ? (
          <Badge tone="success">
            <CheckCircle2 size={12} />
            Sudah Ditutup
          </Badge>
        ) : (
          <Badge tone="warning">Belum Ditutup</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Produk Terjual" value={`${closing.totalItemsSold} item`} icon={Package2} />
        <StatCard label="Total Pendapatan" value={formatCurrency(closing.totalRevenue)} icon={Receipt} tone="success" />
        <StatCard label="Total Transaksi" value={`${closing.totalTransactions}`} icon={ListChecks} />
        <StatCard label="Jumlah Selisih Stok" value={`${totalDifference}`} icon={ClipboardCheck} tone={totalDifference > 0 ? 'warning' : 'accent'} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Rekonsiliasi Kas</CardTitle>
        </CardHeader>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium text-text-faint uppercase tracking-wide mb-1">Penjualan per metode bayar</div>
            {[
              ['Tunai', closing.totalCash],
              ['QRIS', closing.totalQris],
              ['Transfer', closing.totalTransfer],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-text-muted">{label}</span>
                <span className="font-mono tnum text-text">{formatCurrency(value as number)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Total</span>
              <span className="font-mono tnum font-semibold text-text">{formatCurrency(closing.totalRevenue)}</span>
            </div>
            <p className="text-[11px] text-text-faint">QRIS dan transfer masuk ke rekening, bukan ke laci kas.</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="text-xs font-medium text-text-faint uppercase tracking-wide">Uang tunai di laci</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-muted">Modal awal laci</span>
              {isClosed ? (
                <span className="font-mono tnum text-text">{formatCurrency(closing.openingCash)}</span>
              ) : (
                <Input type="number" min={0} className="w-36 h-8 text-right" value={openingCash || ''} placeholder="0"
                  onChange={(e) => setOpeningCash(Math.max(0, Number(e.target.value)))} />
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">+ Penjualan tunai</span>
              <span className="font-mono tnum text-text">{formatCurrency(closing.totalCash)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-muted">Uang seharusnya</span>
              <span className="font-mono tnum font-semibold text-text">{formatCurrency(cashExpected)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-muted">Uang hasil hitung</span>
              {isClosed ? (
                <span className="font-mono tnum text-text">{cashActual == null ? '-' : formatCurrency(cashActual)}</span>
              ) : (
                <Input type="number" min={0} className="w-36 h-8 text-right" value={cashActual ?? ''}
                  onChange={(e) => setCashCounted(Math.max(0, Number(e.target.value)))} />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Selisih kas</span>
              {cashDiff == null ? (
                <span className="text-text-faint">-</span>
              ) : cashDiff === 0 ? (
                <Badge tone="success">Sesuai</Badge>
              ) : (
                <Badge tone="warning">
                  {cashDiff > 0 ? '+' : '-'} {formatCurrency(Math.abs(cashDiff))} {cashDiff > 0 ? 'lebih' : 'kurang'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Rekonsiliasi Stok per Produk</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {['Produk', 'Stok Awal', 'Stok Tambahan', 'Terjual', 'Stok Sistem', 'Stok Aktual', 'Selisih', 'Catatan'].map((h) => (
                  <th key={h} className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {closing.items.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="Tidak ada produk aktif untuk direkonsiliasi." />
                  </td>
                </tr>
              )}
              {closing.items.map((item) => {
                const actual = isClosed ? item.actualStock : actuals[item.productId] ?? item.systemStock;
                const diff = actual - item.systemStock;
                return (
                  <tr key={item.productId} className="hover:bg-white/[0.02] transition">
                    <td className="px-3 py-2.5 text-text">{item.productName}</td>
                    <td className="px-3 py-2.5 font-mono tnum text-text-muted">{item.openingStock}</td>
                    <td className="px-3 py-2.5 font-mono tnum text-text-muted">{item.stockAdded}</td>
                    <td className="px-3 py-2.5 font-mono tnum text-text-muted">{item.quantitySold}</td>
                    <td className="px-3 py-2.5 font-mono tnum text-text">{item.systemStock}</td>
                    <td className="px-3 py-2.5">
                      {isClosed ? (
                        <span className="font-mono tnum text-text">{item.actualStock}</span>
                      ) : (
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={actuals[item.productId] ?? item.systemStock}
                          onChange={(e) =>
                            setActuals((prev) => ({ ...prev, [item.productId]: Number(e.target.value) }))
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {diff === 0 ? (
                        <Badge tone="success">Sesuai</Badge>
                      ) : (
                        <Badge tone="warning">{diff > 0 ? `+${diff}` : diff} Selisih</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isClosed ? (
                        <span className="text-text-faint">{item.note ?? '-'}</span>
                      ) : (
                        <Input
                          className="w-36 h-8"
                          placeholder={diff !== 0 ? 'Contoh: Pecah 1 botol' : '-'}
                          value={notes[item.productId] ?? ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {error && <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}

      {!isClosed && (
        <div className="flex justify-end">
          <Button onClick={handleClose} disabled={saving || closing.items.length === 0}>
            {saving ? 'Memproses...' : 'Tutup Hari Ini'}
          </Button>
        </div>
      )}
    </div>
  );
}
