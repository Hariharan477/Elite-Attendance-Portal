import { Router } from 'express';
import multer from 'multer';
import { googleAuth, getMe } from '../controllers/authController';
import { getStudents, createStudent, updateStudent, deleteStudent, importStudentsExcel } from '../controllers/studentController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Auth Routes
router.post('/google', googleAuth);
router.get('/me', authenticateJWT, getMe);

// Student Routes
router.get('/students', authenticateJWT, authorizeRoles('admin'), getStudents);
router.post('/students', authenticateJWT, authorizeRoles('admin'), createStudent);
router.post('/students/import-excel', authenticateJWT, authorizeRoles('admin'), upload.single('file'), importStudentsExcel);
router.put('/students/:id', authenticateJWT, authorizeRoles('admin'), updateStudent);
router.delete('/students/:id', authenticateJWT, authorizeRoles('admin'), deleteStudent);

export default router;
