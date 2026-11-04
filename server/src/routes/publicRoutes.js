import { Router } from 'express';
import * as publicController from '../controllers/publicController.js';

// Tanpa login: hanya data untuk konsumen. Pembatasan laju ada di Nginx (zona gpk_order / gpk_lookup)
// dan batas per nomor WhatsApp di publicService.
const router = Router();

router.get('/store', publicController.store);
router.get('/products', publicController.catalog);
router.get('/media/:id', publicController.media);
router.post('/orders', publicController.createOrder);
router.post('/orders/lookup', publicController.lookupOrder);

export default router;
