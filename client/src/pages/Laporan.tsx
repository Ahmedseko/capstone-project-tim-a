import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Download, Printer, Receipt, Wallet, Package2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/StatCard';
import { getSalesReport, exportSalesExcel } from '../services/reports';
import { getSettings } from '../services/settings';
import type { ReportSummary, Settings } from '../types';
import { formatCurrency, formatCompactCurrency, formatDate, formatDateTime, todayIso } from '../utils/format';
import { useToast } from '../hooks/useToast';

type Preset = 'today' | 'week' | 'month' | 'custom';

function rangeFor(preset: Preset, customFrom: string, customTo: string) {
  const today = new Date();
  const to = todayIso();
  if (preset === 'today') return { from: to, to };
  if (preset === 'week') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: d.toISOString().slice(0, 10), to };
  }
  return { from: customFrom || to, to: customTo || to };
}

export default function Laporan() {
  const { showToast } = useToast();
  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const range = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);

  useEffect(() => {
    setLoading(true);
    getSalesReport(range)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await exportSalesExcel(range);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengekspor laporan.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <Select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className="w-44">
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="custom">Kustom</option>
        </Select>
        {preset === 'custom' && (
          <>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            <span className="text-text-faint text-sm">s/d</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
          </>
        )}
        <div className="flex-1" />
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          <Download size={14} />
          {exporting ? 'Mengekspor...' : 'Export Excel'}
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={14} />
          Cetak
        </Button>
      </div>

      {loading || !data ? (
        <div className="text-sm text-text-muted">Memuat laporan...</div>
      ) : (
        <>
          <div className="hidden print:block mb-2">
            <h1 className="text-lg font-semibold text-black">{settings?.storeName ?? 'Global Parfum Kutoarjo'}</h1>
            <p className="text-sm text-black">
              Laporan Penjualan &middot; {formatDate(range.from)} &ndash; {formatDate(range.to)}
            </p>
            <p className="text-xs text-gray-500">Dicetak {formatDateTime(new Date().toISOString())}</p>
            <div className="flex gap-6 mt-3 text-sm text-black">
              <span>
                Total Transaksi: <strong>{data.totalTransactions}</strong>
              </span>
              <span>
                Total Pendapatan: <strong>{formatCurrency(data.totalRevenue)}</strong>
              </span>
              <span>
                Produk Terjual: <strong>{data.totalItemsSold} item</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <StatCard label="Total Transaksi" value={`${data.totalTransactions}`} icon={Receipt} />
            <StatCard label="Total Pendapatan" value={formatCurrency(data.totalRevenue)} icon={Wallet} tone="success" />
            <StatCard label="Produk Terjual" value={`${data.totalItemsSold} item`} icon={Package2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Tren Penjualan</CardTitle>
              </CardHeader>
              <div className="p-4 h-56">
                {data.salesTrend.length === 0 ? (
                  <EmptyState message="Belum ada laporan pada periode ini." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salesTrend} margin={{ top: 4, right: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v: string) => formatDate(v, { year: undefined })} tick={{ fontSize: 11, fill: '#52525b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#52525b' }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        tickFormatter={(value: number) => formatCompactCurrency(value)}
                      />
                      <Tooltip
                        contentStyle={{ background: '#15161a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produk Terlaris</CardTitle>
              </CardHeader>
              <div className="p-4 h-56">
                {data.bestSellers.length === 0 ? (
                  <EmptyState message="Belum ada penjualan pada periode ini." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bestSellers.slice(0, 5)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#52525b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="productName"
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{ background: '#15161a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden print:border-0 print:shadow-none">
            <CardHeader className="print:hidden">
              <CardTitle>Transaksi Penjualan</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-black">
                <thead>
                  <tr className="border-b border-border bg-bg/50 print:border-gray-300 print:bg-transparent">
                    {['Tanggal', 'No. Transaksi', 'Produk', 'Total', 'Metode'].map((h) => (
                      <th
                        key={h}
                        className="text-left font-medium text-text-faint text-[11px] uppercase tracking-wide px-3.5 py-2.5 print:text-black print:px-2 print:py-1.5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-gray-200">
                  {data.sales.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState message="Belum ada laporan pada periode ini." />
                      </td>
                    </tr>
                  )}
                  {data.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition print:break-inside-avoid">
                      <td className="px-3.5 py-2.5 text-text-muted print:text-black print:px-2 print:py-1.5">{formatDate(s.date)}</td>
                      <td className="px-3.5 py-2.5 text-text print:text-black print:px-2 print:py-1.5">{s.transactionNumber}</td>
                      <td className="px-3.5 py-2.5 text-text-muted print:text-black print:px-2 print:py-1.5">
                        {s.items.map((i) => i.productName).join(', ')}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tnum text-text print:text-black print:px-2 print:py-1.5">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="px-3.5 py-2.5 text-text-muted capitalize print:text-black print:px-2 print:py-1.5">
                        {s.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
