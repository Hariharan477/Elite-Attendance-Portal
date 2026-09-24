import { Router } from 'express';
import multer from 'multer';
import {
  getStudents,
  getStudentCount,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudentsExcel,
  resetStudentDevice,
  getStudentDeviceStatus
} from '../controllers/studentController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateJWT);

router.get('/count', authorizeRoles('admin'), getStudentCount);
router.get('/', authorizeRoles('admin'), getStudents);
router.post('/import-excel', authorizeRoles('admin'), upload.single('file'), importStudentsExcel);
router.post('/', authorizeRoles('admin'), createStudent);
router.put('/:id', authorizeRoles('admin'), updateStudent);
router.delete('/:id', authorizeRoles('admin'), deleteStudent);

router.post('/:id/reset-device', authorizeRoles('admin'), resetStudentDevice);
router.get('/:id/device-status', authorizeRoles('admin'), getStudentDeviceStatus);

export default router;


