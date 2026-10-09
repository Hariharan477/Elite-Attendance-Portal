import { Response } from 'express';
import { CalendarDay } from '../models/CalendarDay';
import { AttendanceSettings } from '../models/AttendanceSettings';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMonthCalendar = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.params;
    const regex = new RegExp(`^${year}-${month}-`);

    const days = await CalendarDay.find({ date: regex });
    const sessions = await AttendanceSettings.find({ attendanceDate: regex }).populate('createdBy', 'name email');

    return res.json({ success: true, days, sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error fetching calendar', error: error.message });
  }
};

export const setHolidayStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.params;
    const { isHoliday, holidayName } = req.body;

    let day = await CalendarDay.findOne({ date });
    if (!day) {
      day = new CalendarDay({ date });
    }

    if (isHoliday) {
      const existingSession = await AttendanceSettings.findOne({ attendanceDate: date });
      if (existingSession) {
        return res.status(400).json({
          success: false,
          message: 'Conflict: An attendance session exists for this date. Exclude or remove the session first.'
        });
      }
    }

    day.isHoliday = isHoliday;
    day.holidayName = holidayName || '';
    day.updatedBy = req.user?.id as any;
    await day.save();

    return res.json({ success: true, day });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error updating holiday status', error: error.message });
  }
};

export const toggleSessionExclusion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isExcluded, exclusionReason } = req.body;

    const session = await AttendanceSettings.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.isExcluded = isExcluded;
    session.exclusionReason = exclusionReason || '';
    if (isExcluded) {
      session.excludedAt = new Date();
      session.excludedBy = req.user?.id as any;
    } else {
      session.excludedAt = undefined;
      session.excludedBy = undefined;
    }

    await session.save();
    return res.json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error updating exclusion status', error: error.message });
  }
};
