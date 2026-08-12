import { Router } from 'express';
import { getStudents, createStudent, updateStudent, deleteStudent, resetStudentDevice, getStudentDeviceStatus } from '../controllers/studentController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('admin'), getStudents);
router.post('/', authorizeRoles('admin'), createStudent);
router.put('/:id', authorizeRoles('admin'), updateStudent);
router.delete('/:id', authorizeRoles('admin'), deleteStudent);

router.post('/:id/reset-device', authorizeRoles('admin'), resetStudentDevice);
router.get('/:id/device-status', authorizeRoles('admin'), getStudentDeviceStatus);

export default router;

