import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

// Admin dan Staff sama-sama boleh melihat, mengonfirmasi, mengubah status, dan membatalkan pesanan.
const router = Router();

router.use(requireAuth);
router.get('/', orderController.list);
router.get('/summary', orderController.summary);
router.get('/:id', orderController.get);
router.post('/:id/confirm', orderController.confirm);
router.post('/:id/status', orderController.setStatus);
router.post('/:id/cancel', orderController.cancel);

export default router;
