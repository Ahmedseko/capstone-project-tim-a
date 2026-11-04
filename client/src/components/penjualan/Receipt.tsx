import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { cancelSale } from '../../services/sales';
import type { Sale, StoreInfo } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const METHOD_LABEL = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer' } as const;

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: bold ? 700 : 400 }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

const dashed = { borderTop: '1px dashed #000', margin: '6px 0' } as const;

// Dirender dengan gaya inline (hitam di atas putih) agar hasil cetak/PDF sama di semua printer.
function ReceiptBody({ sale, store, screen }: { sale: Sale; store: StoreInfo | null; screen?: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: screen ? 380 : '80mm',
        margin: '0 auto',
        padding: screen ? 20 : 8,
        background: '#fff',
        color: '#000',
        fontSize: screen ? 15 : 12,
        lineHeight: 1.5,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: screen ? 19 : 15, fontWeight: 700 }}>{store?.storeName ?? 'Struk Penjualan'}</div>
        {store?.address && <div>{store.address}</div>}
        {store?.phone && <div>Telp. {store.phone}</div>}
      </div>
      <div style={dashed} />
      <Row left="No" right={sale.transactionNumber} />
      <Row left="Waktu" right={formatDateTime(sale.createdAt)} />
      <Row left="Kasir" right={sale.userName} />
      {sale.customerNote && <Row left="Pembeli" right={sale.customerNote} />}
      <div style={dashed} />
      {sale.items.map((i) => (
        <div key={i.id} style={{ marginBottom: 4 }}>
          <div>{i.productName}</div>
          <Row
            left={`${i.quantity} ${i.productUnit === 'ml' ? 'ml' : 'x'} @ ${formatCurrency(i.unitPrice)}`}
            right={formatCurrency(i.subtotal)}
          />
        </div>
      ))}
      <div style={dashed} />
      {sale.discount > 0 && (
        <>
          <Row left="Subtotal" right={formatCurrency(sale.subtotal)} />
          <Row left="Diskon" right={`- ${formatCurrency(sale.discount)}`} />
        </>
      )}
      <Row left="TOTAL" right={formatCurrency(sale.total)} bold />
      <Row left="Bayar" right={METHOD_LABEL[sale.paymentMethod]} />
      {sale.amountPaid != null && (
        <>
          <Row left="Diterima" right={formatCurrency(sale.amountPaid)} />
          <Row left="Kembali" right={formatCurrency(sale.change ?? 0)} />
        </>
      )}
      <div style={dashed} />
      {sale.status === 'batal' ? (
        <div style={{ textAlign: 'center', fontWeight: 700 }}>
          *** DIBATALKAN ***
          {sale.cancelReason && <div style={{ fontWeight: 400 }}>{sale.cancelReason}</div>}
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>Terima kasih sudah berbelanja!</div>
      )}
    </div>
  );
}

export function ReceiptModal({
  sale,
  store,
  isAdmin,
  onClose,
  onChanged,
}: {
  sale: Sale | null;
  store: StoreInfo | null;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const open = sale !== null;

  // Tandai body agar CSS print hanya menampilkan struk (halaman Laporan tetap bisa dicetak seperti biasa).
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-receipt');
    return () => document.body.classList.remove('printing-receipt');
  }, [open]);

  if (!sale) return null;

  function close() {
    setCancelling(false);
    setReason('');
    onClose();
  }

  // Judul halaman jadi nama file default saat "Simpan sebagai PDF".
  function print() {
    const prev = document.title;
    document.title = sale!.transactionNumber;
    window.addEventListener('afterprint', () => (document.title = prev), { once: true });
    window.print();
  }

  async function confirmCancel() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await cancelSale(sale!.id, reason.trim());
      showToast('Transaksi dibatalkan, stok dikembalikan.');
      onChanged();
      close();
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Gagal membatalkan transaksi.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open
        onClose={close}
        title={`Struk ${sale.transactionNumber}`}
        size="md"
        footer={
          <>
            {isAdmin && sale.status === 'selesai' && !cancelling && (
              <Button variant="danger" className="mr-auto" onClick={() => setCancelling(true)}>
                Batalkan Transaksi
              </Button>
            )}
            <Button variant="secondary" onClick={close}>
              Tutup
            </Button>
            <Button className="order-first w-full sm:order-none sm:w-auto" onClick={print}>
              <Printer size={15} />
              Cetak / Simpan PDF
            </Button>
          </>
        }
      >
        <div className="rounded-md overflow-hidden">
          <ReceiptBody sale={sale} store={store} screen />
        </div>
        {cancelling && (
          <div className="mt-4 space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
            <div className="text-sm text-text">Batalkan transaksi ini? Stok akan dikembalikan dan transaksi keluar dari laporan.</div>
            <Input autoFocus placeholder="Alasan pembatalan (wajib)" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCancelling(false)}>
                Tidak
              </Button>
              <Button variant="danger" size="sm" disabled={!reason.trim() || busy} onClick={confirmCancel}>
                {busy ? 'Memproses...' : 'Ya, batalkan'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Salinan khusus cetak: seluruh aplikasi disembunyikan lewat CSS print (index.css). */}
      {createPortal(
        <div className="print-only">
          <ReceiptBody sale={sale} store={store} />
        </div>,
        document.body,
      )}
    </>
  );
}
