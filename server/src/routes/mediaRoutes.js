import express, { Router } from 'express';
import * as mediaController from '../controllers/mediaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Admin dan staf mengelola foto produk; foto toko dibatasi admin di mediaService (berdasarkan jenis foto).
const router = Router();

router.use(requireAuth);
router.get('/trash', mediaController.trash);
router.post('/', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' }), mediaController.upload);
router.delete('/:id', mediaController.remove);
router.post('/:id/restore', mediaController.restore);
router.delete('/:id/permanent', requireRole('admin'), mediaController.purge);

export default router;
