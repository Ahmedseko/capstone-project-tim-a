import express, { Router } from 'express';
import * as mediaController from '../controllers/mediaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Hanya admin yang mengelola foto produk dan foto toko.
const router = Router();

router.use(requireAuth, requireRole('admin'));
router.post('/', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' }), mediaController.upload);
router.delete('/:id', mediaController.remove);

export default router;
