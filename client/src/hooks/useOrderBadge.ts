import { useEffect, useState } from 'react';
import { getOrderSummary } from '../services/orders';

// Jumlah pesanan online berstatus Baru untuk lencana menu. Disegarkan berkala selama dashboard terbuka.
export function useOrderBadge(intervalMs = 45000): number {
  const [baru, setBaru] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getOrderSummary()
        .then((s) => alive && setBaru(s.baru))
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return baru;
}
