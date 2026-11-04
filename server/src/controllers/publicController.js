import * as settingsService from '../services/settingsService.js';
import * as publicService from '../services/publicService.js';
import * as mediaService from '../services/mediaService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const store = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(await settingsService.getPublicStoreInfo());
});

export const catalog = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(await publicService.getCatalog());
});

export const media = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const image = Number.isInteger(id) ? await mediaService.getImage(id) : null;
  if (!image) {
    return res.status(404).json({ message: 'Foto tidak ditemukan.' });
  }
  // id foto unik (foto baru = id baru), jadi aman di-cache lama. Tipe dikunci dan tidak boleh dijalankan sebagai halaman.
  res.set({
    'Content-Type': image.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  return res.send(image.data);
});

export const createOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await publicService.createOrder(req.body ?? {}));
});

export const lookupOrder = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await publicService.lookupOrder(req.body ?? {}));
});
