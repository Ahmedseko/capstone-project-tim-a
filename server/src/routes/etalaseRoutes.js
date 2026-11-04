import { Router } from 'express';
import * as etalaseService from '../services/etalaseService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Admin dan staf. Info toko, foto toko, dan pengumuman diatur lewat /api/settings dan /api/media (khusus admin).
const router = Router();

router.use(requireAuth);
router.get('/products', asyncHandler(async (req, res) => res.json(await etalaseService.listOnlineProducts())));
router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => res.json(await etalaseService.updateOnlineProduct(Number(req.params.id), req.body ?? {}, req.user))),
);

export default router;
