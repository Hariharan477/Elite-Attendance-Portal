import { Router } from 'express';
import {
  startDailyAttendance,
  endDailyAttendance,
  markDailyAttendance,
  getTodayAttendanceOverview,
  getStudentTodayStatus,
  getAttendanceReport
} from '../controllers/attendanceController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);

router.post('/start', authorizeRoles('admin'), startDailyAttendance);
router.post('/end', authorizeRoles('admin'), endDailyAttendance);
router.post('/mark', authorizeRoles('student'), markDailyAttendance);
router.get('/student-today', authorizeRoles('student'), getStudentTodayStatus);
router.get('/today-overview', authorizeRoles('admin'), getTodayAttendanceOverview);
router.get('/report', authorizeRoles('admin'), getAttendanceReport);

export default router;
