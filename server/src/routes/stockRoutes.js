import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', stockController.list);
router.post('/add', stockController.add);
router.post('/adjust', stockController.adjust);

export default router;
