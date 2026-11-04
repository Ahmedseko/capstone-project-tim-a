import * as mediaService from '../services/mediaService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const upload = asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError('Kirim file foto (JPEG, PNG, atau WebP).', 415);
  }
  res.status(201).json(
    await mediaService.saveImage({ buffer: req.body, kind: req.query.kind, productId: req.query.productId, user: req.user }),
  );
});

export const remove = asyncHandler(async (req, res) => {
  res.json(await mediaService.deleteImage(Number(req.params.id), req.user));
});

export const restore = asyncHandler(async (req, res) => {
  res.json(await mediaService.restoreImage(Number(req.params.id), req.user));
});

export const purge = asyncHandler(async (req, res) => {
  res.json(await mediaService.purgeImage(Number(req.params.id)));
});

export const trash = asyncHandler(async (req, res) => {
  res.json(await mediaService.listTrash(req.user));
});
