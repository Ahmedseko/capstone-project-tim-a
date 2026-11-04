import { Clock, MapPin, MessageCircle, Navigation } from 'lucide-react';
import type { PublicStore } from '../../types';
import { waLink } from '../../utils/storefront';

const linkBtn =
  'h-11 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition flex-1 min-w-[150px]';

// Kartu "Kunjungi Toko": alamat, jam, tombol Google Maps dan WhatsApp, plus pratinjau peta.
export function StoreInfoCard({ store, heading = 'Kunjungi Toko' }: { store: PublicStore; heading?: string }) {
  return (
    <section id="kunjungi" className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text">{heading}</h2>
          <div>
            <div className="text-[15px] font-semibold text-text">{store.storeName}</div>
            <p className="mt-1 flex gap-2 text-sm text-text-muted leading-relaxed">
              <MapPin size={16} className="shrink-0 mt-0.5 text-accent-glow" aria-hidden="true" />
              {store.address}
            </p>
          </div>

          <dl className="grid gap-2 text-sm text-text-muted">
            <div className="flex gap-2">
              <Clock size={16} className="shrink-0 mt-0.5 text-accent-glow" aria-hidden="true" />
              <div>
                <dt className="sr-only">Jam operasional</dt>
                <dd className="whitespace-pre-line">{store.openingHours || 'Hubungi kami via WhatsApp untuk informasi jam operasional.'}</dd>
              </div>
            </div>
            {store.phone && (
              <div className="flex gap-2">
                <img src="/icons/whatsapp.png" alt="" width={16} height={16} className="shrink-0 mt-0.5" />
                <div>
                  <dt className="sr-only">Telepon / WhatsApp</dt>
                  <dd>{store.phone}</dd>
                </div>
              </div>
            )}
            {store.email && (
              <div className="flex gap-2">
                <img src="/icons/gmail.png" alt="" width={18} height={14} className="shrink-0 mt-1" />
                <div>
                  <dt className="sr-only">Email</dt>
                  <dd>
                    <a href={`mailto:${store.email}`} className="hover:text-text underline-offset-2 hover:underline break-all">
                      {store.email}
                    </a>
                  </dd>
                </div>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2.5 mt-1">
            {store.mapsUrl && (
              <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${linkBtn} bg-accent text-white hover:bg-accent-hover`}>
                <Navigation size={16} aria-hidden="true" />
                Buka Google Maps
              </a>
            )}
            {store.whatsapp && (
              <a
                href={waLink(store.whatsapp, `Halo ${store.storeName}, saya ingin bertanya.`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkBtn} bg-[#25D366] text-[#06210F] hover:brightness-110`}
              >
                <MessageCircle size={16} aria-hidden="true" />
                Hubungi via WhatsApp
              </a>
            )}
          </div>
        </div>

        {store.mapsEmbedUrl && (
          <div className="min-h-[260px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-border bg-bg">
            <iframe
              title={`Peta lokasi ${store.storeName}`}
              src={store.mapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full min-h-[260px] border-0"
            />
          </div>
        )}
      </div>
    </section>
  );
}
