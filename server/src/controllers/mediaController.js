import * as mediaService from '../services/mediaService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const upload = asyncHandler(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError('Kirim file foto (JPEG, PNG, atau WebP).', 415);
  }
  res.status(201).json(await mediaService.saveImage({ buffer: req.body, kind: req.query.kind, userId: req.user.id }));
});

export const remove = asyncHandler(async (req, res) => {
  res.json(await mediaService.deleteImage(Number(req.params.id)));
});
