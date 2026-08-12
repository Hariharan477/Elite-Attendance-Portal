import { Router } from 'express';
import { getWifiAccessPoints, createWifiAccessPoint, deleteWifiAccessPoint } from '../controllers/wifiController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', getWifiAccessPoints);
router.post('/', authorizeRoles('admin'), createWifiAccessPoint);
router.delete('/:id', authorizeRoles('admin'), deleteWifiAccessPoint);

export default router;
