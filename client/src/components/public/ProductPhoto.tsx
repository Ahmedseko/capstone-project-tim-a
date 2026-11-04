import { mediaUrl } from '../../services/public';
import { cn } from '../../utils/cn';

// Foto produk; kalau belum ada foto tampil ilustrasi botol (bukan foto sungguhan).
export function ProductPhoto({ photoId, alt, className }: { photoId: number | null; alt: string; className?: string }) {
  if (photoId) {
    return <img src={mediaUrl(photoId)} alt={alt} loading="lazy" className={cn('w-full h-full object-cover', className)} />;
  }
  return (
    <div className={cn('w-full h-full flex items-center justify-center bg-surface-elevated', className)} role="img" aria-label={`${alt} (belum ada foto)`}>
      <svg width="44" height="66" viewBox="0 0 64 96" aria-hidden="true">
        <rect x="24" y="2" width="16" height="12" rx="3" fill="#E9E2F7" />
        <rect x="28" y="14" width="8" height="8" fill="#BFB6D6" />
        <rect x="8" y="22" width="48" height="70" rx="12" fill="#F4F2F8" fillOpacity="0.9" />
        <rect x="16" y="46" width="32" height="22" rx="4" fill="#8b5cf6" fillOpacity="0.55" />
      </svg>
    </div>
  );
}
