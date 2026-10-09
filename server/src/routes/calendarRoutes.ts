import { Router } from 'express';
import { getMonthCalendar, setHolidayStatus, toggleSessionExclusion } from '../controllers/calendarController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

router.get('/:year/:month', getMonthCalendar);
router.put('/:date/holiday', setHolidayStatus);
router.put('/session/:id/exclude', toggleSessionExclusion);

export default router;
