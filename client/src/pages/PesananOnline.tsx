import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, MessageCircle, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { ApiRequestError } from '../services/api';
import { cancelOrder, confirmOrder, listOrders, setOrderStatus } from '../services/orders';
import { getStoreInfo } from '../services/settings';
import type { OnlineOrder, OrderStatus, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import { orderStatusLabel, orderStatusTone, waLink } from '../utils/storefront';

const TABS: { id: string; label: string }[] = [
  { id: 'aktif', label: 'Aktif' },
  { id: 'baru', label: 'Baru' },
  { id: 'selesai', label: 'Selesai' },
  { id: 'batal', label: 'Batal' },
  { id: '', label: 'Semua' },
];

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { dikonfirmasi: 'diproses', diproses: 'siap', siap: 'selesai' };

function nextLabel(order: OnlineOrder): string {
  switch (order.status) {
    case 'dikonfirmasi':
      return 'Mulai diproses';
    case 'diproses':
      return order.fulfillment === 'ambil' ? 'Tandai siap diambil' : 'Tandai siap dikirim';
    default:
      return 'Tandai selesai';
  }
}

export default function PesananOnline() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('aktif');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [storeName, setStoreName] = useState('Global Parfum Kutoarjo');

  const [payment, setPayment] = useState<PaymentMethod>('tunai');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      listOrders({ status: tab || undefined, q: search.trim() || undefined })
        .then(setOrders)
        .catch(() => undefined)
        .finally(() => setLoading(false));
    },
    [tab, search],
  );

  useEffect(() => {
    const t = window.setTimeout(() => load(), search ? 300 : 0); // jeda saat mengetik pencarian
    return () => window.clearTimeout(t);
  }, [load, search]);

  // pesanan baru dari konsumen muncul sendiri tanpa memuat ulang halaman
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    getStoreInfo()
      .then((s) => setStoreName(s.storeName))
      .catch(() => undefined);
  }, []);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);

  function open(order: OnlineOrder) {
    setSelectedId(order.id);
    setCancelling(false);
    setReason('');
    setError(null);
    setPayment(order.fulfillment === 'kirim' ? 'transfer' : 'tunai');
  }

  async function run(fn: () => Promise<OnlineOrder>, okMessage: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setCancelling(false);
      setReason('');
      showToast(okMessage);
      load(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Aksi gagal. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const waText = (o: OnlineOrder) =>
    `Halo Kak ${o.customerName}, pesanan ${o.orderNumber} dari ${storeName} sudah kami terima. Kami ingin mengonfirmasi pesanan Kakak.`;

  const chip = (active: boolean) =>
    clsx('shrink-0 h-10 lg:h-8 px-4 lg:px-3.5 rounded-full text-[13px] font-medium border transition', active ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:text-text');

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-2 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 md:flex-1" role="group" aria-label="Filter status">
          {TABS.map((t) => (
            <button key={t.id} className={chip(tab === t.id)} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" aria-hidden="true" />
          <Input placeholder="Cari nomor, nama, atau WA" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari pesanan" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">Memuat pesanan...</div>
        ) : orders.length === 0 ? (
          <EmptyState icon={Inbox} message="Belum ada pesanan pada filter ini." />
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => open(o)} className="w-full text-left px-3.5 py-3 hover:bg-white/[0.03] transition grid gap-2 md:grid-cols-[170px_minmax(0,1fr)_110px_90px_150px] md:items-center">
                  <div>
                    <div className="text-sm font-semibold text-text">{o.orderNumber}</div>
                    <div className="text-[11px] text-text-faint">{formatDateTime(o.createdAt)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-text truncate">{o.customerName}</div>
                    <div className="text-[11px] text-text-faint">+{o.customerPhone}</div>
                  </div>
                  <div className="text-sm text-text-muted">{o.fulfillment === 'ambil' ? 'Ambil di toko' : 'Dikirim'}</div>
                  <div className="text-sm font-mono tnum text-text md:text-right">{formatCurrency(o.total)}</div>
                  <div className="md:text-right">
                    <Badge tone={orderStatusTone(o.status)}>{orderStatusLabel(o.status, o.fulfillment)}</Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `Pesanan ${selected.orderNumber}` : ''}
        size="lg"
        footer={
          selected && (
            <>
              {selected.status !== 'selesai' && selected.status !== 'batal' && !cancelling && (
                <Button variant="danger" className="mr-auto" onClick={() => setCancelling(true)} disabled={busy}>
                  Batalkan pesanan
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedId(null)}>
                Tutup
              </Button>
              {selected.status === 'baru' && (
                <Button onClick={() => run(() => confirmOrder(selected.id, payment), 'Pesanan dikonfirmasi, stok dikurangi.')} disabled={busy}>
                  {busy ? 'Memproses...' : 'Konfirmasi pesanan'}
                </Button>
              )}
              {NEXT[selected.status] && (
                <Button onClick={() => run(() => setOrderStatus(selected.id, NEXT[selected.status] as OrderStatus), 'Status pesanan diperbarui.')} disabled={busy}>
                  {busy ? 'Memproses...' : nextLabel(selected)}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <Badge tone={orderStatusTone(selected.status)}>{orderStatusLabel(selected.status, selected.fulfillment)}</Badge>
              <span className="text-xs text-text-faint">{formatDateTime(selected.createdAt)}</span>
            </div>

            <div className="rounded-lg border border-border p-3.5 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-text">{selected.customerName}</div>
                  <div className="text-text-muted">+{selected.customerPhone}</div>
                </div>
                <a
                  href={waLink(selected.customerPhone, waText(selected))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-full sm:w-auto justify-center h-10 px-3.5 rounded-lg bg-[#25D366] text-[#06210F] text-[13px] font-bold flex items-center gap-1.5 hover:brightness-110 transition"
                >
                  <MessageCircle size={15} aria-hidden="true" /> Hubungi via WhatsApp
                </a>
              </div>
              <div className="text-text-muted">
                <span className="text-text-faint">Metode: </span>
                {selected.fulfillment === 'ambil' ? 'Ambil di toko' : 'Dikirim'}
              </div>
              {selected.fulfillment === 'kirim' && selected.address && (
                <div className="text-text-muted">
                  <span className="text-text-faint">Alamat: </span>
                  {selected.address}
                </div>
              )}
              {selected.note && (
                <div className="text-text-muted">
                  <span className="text-text-faint">Catatan: </span>
                  {selected.note}
                </div>
              )}
            </div>

            <ul className="divide-y divide-border rounded-lg border border-border">
              {selected.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-text">
                      {l.label} <span className="text-text-faint">× {l.quantity}</span>
                    </div>
                    <div className="text-xs text-text-faint">{l.detail}</div>
                  </div>
                  <div className="font-mono tnum text-text whitespace-nowrap">{formatCurrency(l.subtotal)}</div>
                </li>
              ))}
              <li className="flex justify-between px-3.5 py-2.5 bg-white/[0.02]">
                <span className="font-semibold text-text">Total</span>
                <span className="font-mono tnum font-semibold text-text">{formatCurrency(selected.total)}</span>
              </li>
            </ul>

            {selected.saleNumber && (
              <p className="text-xs text-text-faint">
                Tercatat sebagai penjualan <strong className="text-text-muted">{selected.saleNumber}</strong>
                {selected.confirmedBy ? ` oleh ${selected.confirmedBy}` : ''}.
              </p>
            )}
            {selected.status === 'batal' && selected.cancelReason && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">Dibatalkan: {selected.cancelReason}</p>
            )}

            {selected.status === 'baru' && (
              <div className="rounded-lg border border-border p-3.5 space-y-2">
                <label htmlFor="bayar" className="block text-xs font-medium text-text-muted">
                  Metode pembayaran yang dipakai pelanggan
                </label>
                <Select id="bayar" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
                  <option value="tunai">Tunai / COD</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                </Select>
                <p className="text-xs text-text-faint leading-relaxed">
                  Stok produk berkurang saat Anda menekan &quot;Konfirmasi pesanan&quot;, dan pesanan dicatat sebagai penjualan. Stok tidak berkurang saat pelanggan baru memesan.
                </p>
              </div>
            )}

            {cancelling && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-3.5 space-y-2">
                <p className="text-text">
                  Batalkan pesanan ini?{' '}
                  {selected.saleId ? 'Stok yang sudah dikurangi akan dikembalikan otomatis.' : 'Stok tidak berubah karena belum dikonfirmasi.'}
                </p>
                <Input autoFocus placeholder="Alasan pembatalan (wajib)" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCancelling(false)}>
                    Tidak
                  </Button>
                  <Button variant="danger" size="sm" disabled={!reason.trim() || busy} onClick={() => run(() => cancelOrder(selected.id, reason.trim()), 'Pesanan dibatalkan.')}>
                    Ya, batalkan
                  </Button>
                </div>
              </div>
            )}

            {error && <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
