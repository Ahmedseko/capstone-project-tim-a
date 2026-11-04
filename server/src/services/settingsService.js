import { pool } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { normalizePhone } from '../utils/phone.js';
import { listStorePhotoIds } from './mediaService.js';

function mapSettings(row) {
  return {
    storeName: row.store_name,
    ownerName: row.owner_name,
    address: row.address,
    phone: row.phone,
    currency: row.currency,
    defaultLowStockThreshold: row.default_low_stock_threshold,
    email: row.email ?? '',
    mapsUrl: row.maps_url ?? '',
    openingHours: row.opening_hours ?? '',
    storeProfile: row.store_profile ?? '',
    shopeeUrl: row.shopee_url ?? '',
    announcement: row.announcement ?? '',
  };
}

export async function getSettings() {
  const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
  if (!rows[0]) {
    throw new AppError('Pengaturan toko belum tersedia.', 404);
  }
  return mapSettings(rows[0]);
}

// Info toko untuk halaman publik. Hanya data yang memang untuk konsumen.
export async function getPublicStoreInfo() {
  const s = await getSettings();
  const whatsapp = normalizePhone(s.phone);
  return {
    storeName: s.storeName,
    address: s.address,
    phone: s.phone,
    whatsapp,
    email: s.email,
    mapsUrl: s.mapsUrl,
    // embed Google Maps berdasarkan alamat (tanpa API key); tombol "Buka Google Maps" memakai mapsUrl
    mapsEmbedUrl: s.address ? `https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed` : '',
    openingHours: s.openingHours,
    storeProfile: s.storeProfile,
    shopeeUrl: s.shopeeUrl,
    announcement: s.announcement,
    photoIds: await listStorePhotoIds(),
  };
}

// Tautan yang dipakai di href harus https agar tidak bisa disisipi javascript: atau data:.
function cleanUrl(value, label) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (v.length > 500 || !/^https:\/\/[^\s<>"']+$/i.test(v)) {
    throw new AppError(`${label} harus berupa tautan https yang valid.`, 400);
  }
  return v;
}

function cleanText(value, max, label) {
  const v = String(value ?? '').trim();
  if (v.length > max) throw new AppError(`${label} maksimal ${max} karakter.`, 400);
  return v || null;
}

export async function updateSettings(input) {
  if (!input.storeName?.trim() || !input.ownerName?.trim()) {
    throw new AppError('Nama toko dan nama owner wajib diisi.', 400);
  }
  if (input.defaultLowStockThreshold < 0) {
    throw new AppError('Batas stok menipis tidak boleh negatif.', 400);
  }
  const phone = String(input.phone ?? '').trim();
  if (phone && !normalizePhone(phone)) {
    throw new AppError('Nomor WhatsApp tidak valid. Contoh: 082328329333.', 400);
  }
  const email = String(input.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Format email tidak valid.', 400);
  }

  const extra = [
    email || null,
    cleanUrl(input.mapsUrl, 'Link Google Maps'),
    cleanText(input.openingHours, 500, 'Jam operasional'),
    cleanText(input.storeProfile, 2000, 'Profil toko'),
    cleanUrl(input.shopeeUrl, 'Link Shopee'),
    cleanText(String(input.announcement ?? '').replace(/\s+/g, ' '), 300, 'Pengumuman'),
  ];

  const [rows] = await pool.query('SELECT id FROM settings LIMIT 1');

  if (rows[0]) {
    await pool.query(
      `UPDATE settings SET store_name = ?, owner_name = ?, address = ?, phone = ?, currency = ?, default_low_stock_threshold = ?,
         email = ?, maps_url = ?, opening_hours = ?, store_profile = ?, shopee_url = ?, announcement = ?
       WHERE id = ?`,
      [input.storeName, input.ownerName, input.address, phone, input.currency, input.defaultLowStockThreshold, ...extra, rows[0].id],
    );
  } else {
    await pool.query(
      `INSERT INTO settings (store_name, owner_name, address, phone, currency, default_low_stock_threshold,
         email, maps_url, opening_hours, store_profile, shopee_url, announcement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.storeName, input.ownerName, input.address, phone, input.currency, input.defaultLowStockThreshold, ...extra],
    );
  }

  return getSettings();
}
