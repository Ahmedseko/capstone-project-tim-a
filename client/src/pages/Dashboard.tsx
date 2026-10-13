import { useEffect, useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShoppingBag, Wallet, Package2, AlertTriangle, Trophy, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { getDashboardSummary } from '../services/reports';
import type { DashboardSummary } from '../types';
import { formatCurrency, formatCompactCurrency, formatDate, formatDateTime } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-text-muted">Memuat dashboard...</div>;
  }

  if (!data) {
    return <EmptyState message="Gagal memuat data dashboard." />;
  }

  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-2 gap-3 ${data.profitToday == null ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
        <StatCard label="Penjualan Hari Ini" value={`${data.salesToday} transaksi`} icon={ShoppingBag} />
        <StatCard label="Pendapatan Hari Ini" value={formatCurrency(data.revenueToday)} icon={Wallet} tone="success" />
        {data.profitToday != null && (
          <StatCard
            label="Laba Hari Ini"
            value={formatCurrency(data.profitToday)}
            icon={TrendingUp}
            tone="success"
            hint={data.salesWithoutCostToday ? `${data.salesWithoutCostToday} transaksi belum ada modal` : undefined}
          />
        )}
        <StatCard label="Produk Terjual" value={`${data.itemsSoldToday} item`} icon={Package2} />
        <StatCard label="Stok Menipis" value={`${data.lowStockCount} produk`} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grafik Penjualan Bulan Ini</CardTitle>
          </CardHeader>
          <div className="p-4 h-64">
            {data.salesTrend.length === 0 ? (
              <EmptyState message="Belum ada data penjualan bulan ini." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.salesTrend} margin={{ top: 4, right: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => formatDate(v, { year: undefined })}
                    tick={{ fontSize: 11, fill: '#52525b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#52525b' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(value: number) => formatCompactCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#15161a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#9ca3af' }}
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
          <div className="p-4">
            {data.bestSellers.length === 0 ? (
              <EmptyState message="Belum ada penjualan." />
            ) : (
              <ul className="space-y-2.5">
                {data.bestSellers.slice(0, 5).map((p, i) => (
                  <li key={p.productName} className="flex items-center gap-2.5">
                    <span
                      className={
                        'flex items-center justify-center w-5 h-5 rounded text-[11px] font-medium shrink-0 ' +
                        (i === 0 ? 'bg-accent/15 text-accent' : 'bg-white/[0.05] text-text-faint')
                      }
                    >
                      {i === 0 ? <Trophy size={11} /> : i + 1}
                    </span>
                    <span className="flex-1 text-sm text-text truncate">{p.productName}</span>
                    <span className="text-xs text-text-muted tnum font-mono">{p.quantity} {p.unit} terjual</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas / Penjualan Terbaru</CardTitle>
          </CardHeader>
          <div className="p-2">
            {data.recentSales.length === 0 ? (
              <EmptyState message="Belum ada transaksi hari ini." />
            ) : (
              <div className="divide-y divide-border">
                {data.recentSales.slice(0, 6).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-2.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="text-text truncate">{sale.transactionNumber}</div>
                      <div className="text-[11px] text-text-faint">{formatDateTime(sale.createdAt)}</div>
                    </div>
                    <span className="font-mono text-text tnum">{formatCurrency(sale.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok Menipis</CardTitle>
          </CardHeader>
          <div className="p-2">
            {data.lowStockProducts.length === 0 ? (
              <EmptyState message="Semua stok produk aman." />
            ) : (
              <div className="divide-y divide-border">
                {data.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-2.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="text-text truncate">{p.name}</div>
                      <div className="text-[11px] text-text-faint">{p.category}</div>
                    </div>
                    <Badge tone="warning">{p.stock} tersisa</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
