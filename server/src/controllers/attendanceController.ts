import { Response } from 'express';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../middleware/authMiddleware';
import { AttendanceSettings } from '../models/AttendanceSettings';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import { WifiAccessPoint } from '../models/WifiAccessPoint';

// Helper to check and auto-expire today's session
const checkAndExpireTodaySession = async () => {
  const now = new Date();
  await AttendanceSettings.updateMany(
    { status: 'ACTIVE', endTime: { $lte: now } },
    { $set: { status: 'EXPIRED' } }
  );
};

// Start Daily Attendance (Admin)
export const startDailyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceDate, startTime, endTime, wifiAccessPointId } = req.body;
    if (!attendanceDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Attendance Date, Start Time, and End Time are required' });
    }

    let startDateTime: Date;
    let endDateTime: Date;

    if (startTime.includes('T')) {
      startDateTime = new Date(startTime);
    } else {
      const [sH, sM] = startTime.split(':').map(Number);
      startDateTime = new Date(attendanceDate);
      startDateTime.setHours(sH || 0, sM || 0, 0, 0);
    }

    if (endTime.includes('T')) {
      endDateTime = new Date(endTime);
    } else {
      const [eH, eM] = endTime.split(':').map(Number);
      endDateTime = new Date(attendanceDate);
      endDateTime.setHours(eH || 23, eM || 59, 59, 999);

      // If end time hour is earlier than start time (e.g. 11:00 PM to 12:38 AM across midnight), roll to next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
    }




    if (!wifiAccessPointId) {
      return res.status(400).json({
        message: 'Attendance cannot start because no authorized Wi-Fi access point is configured.'
      });
    }

    const ap = await WifiAccessPoint.findOne({ _id: wifiAccessPointId, isActive: true });
    if (!ap) {
      return res.status(400).json({
        message: 'Attendance cannot start because no authorized Wi-Fi access point is configured.'
      });
    }

    const wifiSSID = ap.ssid;
    const wifiBSSID = ap.bssid;
    const wifiLocation = ap.location;

    // Deactivate any existing setting for this date
    await AttendanceSettings.deleteMany({ attendanceDate });

    const settings = await AttendanceSettings.create({
      attendanceDate,
      startTime: startDateTime,
      endTime: endDateTime,
      status: 'ACTIVE',
      createdBy: req.user?.id,
      wifiAccessPointId: ap._id,
      wifiSSID,
      wifiBSSID,
      wifiLocation
    });


    return res.status(201).json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error starting daily attendance', error: error.message });
  }
};

// End Daily Attendance Early (Admin)
export const endDailyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceDate } = req.body;
    const dateStr = attendanceDate || new Date().toISOString().split('T')[0];
    const settings = await AttendanceSettings.findOne({ attendanceDate: dateStr });

    if (!settings) return res.status(404).json({ message: 'No attendance settings found for today' });

    settings.status = 'ENDED';
    settings.endTime = new Date();
    await settings.save();

    return res.json({ message: 'Attendance closed successfully', settings });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error ending daily attendance', error: error.message });
  }
};

// Mark Daily Attendance (Student)
export const markDailyAttendance = async (req: AuthRequest, res: Response) => {
  try {
    await checkAndExpireTodaySession();
    const todayStr = new Date().toISOString().split('T')[0];
    const studentId = req.user?.id;
    const { ssid, bssid } = req.body;

    let settings = await AttendanceSettings.findOne({ status: 'ACTIVE', endTime: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!settings) {
      settings = await AttendanceSettings.findOne({ attendanceDate: todayStr }).sort({ createdAt: -1 });
    }

    if (!settings) {
      return res.status(400).json({ success: false, message: 'No Active Attendance Today' });
    }

    const attendanceDate = settings.attendanceDate;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ message: 'Only registered students can mark attendance' });
    }


    const now = new Date();
    const startTime = new Date(settings.startTime);
    const endTime = new Date(settings.endTime);

    // 1. Time Check: BEFORE START
    if (now < startTime) {
      const formattedStart = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      console.log(`[ATTENDANCE TIME CHECK] REJECTED: Current time ${now.toISOString()} is before session start time ${startTime.toISOString()}`);
      return res.status(400).json({
        success: false,
        message: `Attendance has not started yet. It starts at ${formattedStart}.`
      });
    }

    // 2. Time Check: AFTER END TIME / EXPIRED
    if (now >= endTime || settings.status !== 'ACTIVE') {
      const formattedStart = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedEnd = endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      console.log(`[ATTENDANCE TIME CHECK] REJECTED: Current time ${now.toISOString()} is after session end time ${endTime.toISOString()}`);
      
      if (settings.status === 'ACTIVE') {
        settings.status = 'EXPIRED';
        await settings.save();
      }

      return res.status(400).json({
        success: false,
        message: `Attendance has ended. The attendance window was ${formattedStart} - ${formattedEnd}.`
      });
    }


    // Helper to normalize BSSID formatting (trim, lowercase, replace - with :)

    const normalizeBssid = (val?: string) => {
      if (!val) return '';
      return val.trim().toLowerCase().replace(/-/g, ':');
    };

    const receivedSsid = String(ssid || '').trim();
    const receivedBssid = normalizeBssid(bssid);

    // 12 & 13. Verify request contains SSID and BSSID
    if (!receivedSsid || !receivedBssid) {
      console.log(`[ATTENDANCE SERVER REQUEST] REJECTED: Missing SSID or BSSID. Received SSID: '${receivedSsid}', BSSID: '${receivedBssid}'`);
      return res.status(403).json({
        success: false,
        message: 'Unable to verify Wi-Fi. Please enable Wi-Fi and Location and try again.'
      });
    }

    console.log('\n====================================================');
    console.log('[ATTENDANCE SERVER REQUEST]');
    console.log(`Authenticated user: ${student.email} (${student.name})`);
    console.log(`Received SSID: ${receivedSsid}`);
    console.log(`Received BSSID: ${receivedBssid}`);
    console.log(`Attendance Date: ${attendanceDate}`);


    // DEVICE BINDING VERIFICATION:
    const { deviceId } = req.body;
    const receivedDeviceId = String(deviceId || '').trim();

    if (!receivedDeviceId) {
      console.log(`[DEVICE CHECK] REJECTED: Device ID missing in attendance mark payload for student ${student.email}`);
      return res.status(403).json({
        success: false,
        message: 'Unable to verify your device.'
      });
    }

    const { StudentDevice } = await import('../models/StudentDevice');

    // 1. Check if device is registered in MongoDB
    const registeredDevice = await StudentDevice.findOne({ deviceId: receivedDeviceId, isActive: true });
    if (!registeredDevice) {
      console.log(`[DEVICE CHECK] REJECTED: Device ${receivedDeviceId} is not registered in system.`);
      return res.status(403).json({
        success: false,
        message: 'Device is not registered for this student.'
      });
    }

    // 2. Check if the device belongs to the authenticated student
    const isDeviceOwner = String(registeredDevice.studentId) === String(student._id);
    console.log(`[DEVICE CHECK] Authenticated student: ${student.email} (${student._id}), Registered device owner: ${registeredDevice.studentId}, Match: ${isDeviceOwner}`);

    if (!isDeviceOwner) {
      console.log(`[DEVICE CHECK] REJECTED: Device ${receivedDeviceId} belongs to student ${registeredDevice.studentId}, but student ${student.email} (${student._id}) attempted to mark attendance.`);
      return res.status(403).json({
        success: false,
        message: 'This device is registered to another student.'
      });
    }

    // Update lastUsedAt for device
    registeredDevice.lastUsedAt = new Date();
    await registeredDevice.save();

    // 10 & 11. Load authorized Wi-Fi Access Point from MongoDB and verify isActive === true

    if (!settings.wifiAccessPointId) {
      console.log(`[ATTENDANCE SERVER WIFI] REJECTED: No Wi-Fi Access Point ID attached to settings.`);
      return res.status(403).json({
        success: false,
        message: 'Please connect to the authorized college Wi-Fi to mark attendance.'
      });
    }

    const authorizedAp = await WifiAccessPoint.findOne({ _id: settings.wifiAccessPointId, isActive: true });
    if (!authorizedAp) {
      console.log(`[ATTENDANCE SERVER WIFI] REJECTED: Authorized Access Point (${settings.wifiAccessPointId}) not found or inactive.`);
      return res.status(403).json({
        success: false,
        message: 'Please connect to the authorized college Wi-Fi to mark attendance.'
      });
    }

    const authorizedBssid = normalizeBssid(authorizedAp.bssid);
    const bssidMatch = receivedBssid === authorizedBssid;

    console.log('[ATTENDANCE SERVER WIFI]');
    console.log(`Attendance settings ID: ${settings._id}`);
    console.log(`Authorized Wi-Fi AP ID: ${authorizedAp._id}`);
    console.log(`Authorized SSID: ${authorizedAp.ssid}`);
    console.log(`Authorized BSSID: ${authorizedBssid}`);
    console.log(`Normalized received BSSID: ${receivedBssid}`);
    console.log(`Normalized authorized BSSID: ${authorizedBssid}`);
    console.log(`BSSID MATCH: ${bssidMatch}`);
    console.log('====================================================\n');


    // 14 & 15. Compare received BSSID with authorized BSSID
    if (!bssidMatch) {
      return res.status(403).json({
        success: false,
        message: 'Please connect to the authorized college Wi-Fi to mark attendance.'
      });
    }

    // 16. Duplicate check (enforced by MongoDB unique index on { studentId: 1, attendanceDate: 1 })
    const existing = await Attendance.findOne({ studentId: student._id, attendanceDate });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked today.' });
    }

    // 17 & 18. Create attendance record after successful BSSID validation
    const record = await Attendance.create({
      studentId: student._id,
      attendanceDate,
      checkInTime: new Date(),
      status: 'PRESENT',
      wifiVerified: true,
      ssidUsed: receivedSsid,
      bssidUsed: receivedBssid
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      status: 'PRESENT',
      attendance: record
    });

  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already marked today.' });
    }
    return res.status(500).json({ success: false, message: 'Error marking attendance', error: error.message });
  }
};


// Get Admin Today's Attendance Overview
export const getTodayAttendanceOverview = async (req: AuthRequest, res: Response) => {
  try {
    await checkAndExpireTodaySession();
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    const settings = await AttendanceSettings.findOne({ attendanceDate: targetDate });
    const allStudents = await User.find({ role: 'student' }).sort({ registerNo: 1, name: 1 });
    const markedRecords = await Attendance.find({ attendanceDate: targetDate }).populate('studentId', 'name rollNo registerNo email department year section');

    const markedStudentIds = new Set(markedRecords.map(r => String((r.studentId as any)._id || r.studentId)));

    const presentStudents = allStudents.filter(s => markedStudentIds.has(String(s._id)));
    const absentStudents = allStudents.filter(s => !markedStudentIds.has(String(s._id)));

    return res.json({
      settings: settings || null,
      stats: {
        total: allStudents.length,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        percentage: allStudents.length > 0 ? ((presentStudents.length / allStudents.length) * 100).toFixed(1) : '0'
      },
      presentStudents,
      absentStudents,
      records: markedRecords
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching today attendance overview', error: error.message });
  }
};

// Get Student Today Status
export const getStudentTodayStatus = async (req: AuthRequest, res: Response) => {
  try {
    await checkAndExpireTodaySession();
    const todayStr = new Date().toISOString().split('T')[0];
    const studentId = req.user?.id;

    // 1. Fetch active session currently open
    let settings = await AttendanceSettings.findOne({ status: 'ACTIVE' }).sort({ createdAt: -1 });

    // 2. If no active session, fetch today's or most recent setting
    if (!settings) {
      settings = await AttendanceSettings.findOne({}).sort({ createdAt: -1 });
    }

    const targetDate = settings ? settings.attendanceDate : todayStr;
    const record = await Attendance.findOne({ studentId, attendanceDate: targetDate });

    // Overall student attendance percentage
    const totalDaysConfigured = await AttendanceSettings.countDocuments();
    const totalAttendedDays = await Attendance.countDocuments({ studentId, status: 'PRESENT' });
    const percentage = totalDaysConfigured > 0
      ? ((totalAttendedDays / totalDaysConfigured) * 100).toFixed(1)
      : '100.0';

    return res.json({
      settings,
      marked: !!record,
      record,
      stats: {
        totalDays: totalDaysConfigured,
        attendedDays: totalAttendedDays,
        percentage
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching student today status', error: error.message });
  }
};



// Attendance Reports & Export Engine
export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    await checkAndExpireTodaySession();
    const { department, year, section, date, month, format } = req.query;

    let studentQuery: any = { role: 'student' };
    if (department) studentQuery.department = department;
    if (year) studentQuery.year = year;
    if (section) studentQuery.section = section;

    const matchingStudents = await User.find(studentQuery).select('_id');
    const studentIds = matchingStudents.map(s => s._id);

    let attendanceQuery: any = { studentId: { $in: studentIds } };
    if (date) attendanceQuery.attendanceDate = date;
    if (month) attendanceQuery.attendanceDate = new RegExp(`^${month}`);

    const records = await Attendance.find(attendanceQuery)
      .populate('studentId', 'name rollNo registerNo department year section email');

    // Excel Export
    if (format === 'excel') {
      const data = records.map((r: any) => ({
        'Register No': r.studentId?.registerNo || r.studentId?.rollNo || 'N/A',
        'Student Name': r.studentId?.name || 'N/A',
        'Official Email': r.studentId?.email || 'N/A',
        'Department': r.studentId?.department || 'N/A',
        'Year': r.studentId?.year || 'N/A',
        'Section': r.studentId?.section || 'N/A',
        'Attendance Date': r.attendanceDate,
        'Check-In Time': new Date(r.checkInTime).toLocaleTimeString(),
        'Status': r.status,
        'Wi-Fi Verified': r.wifiVerified ? 'YES' : 'NO'
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Attendance Report');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=IFET_Daily_Attendance_Report.xlsx');
      return res.send(buffer);
    }

    // PDF Export
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=IFET_Daily_Attendance_Report.pdf');
      doc.pipe(res);

      doc.fontSize(16).fillColor('#4f46e5').text('IFET COLLEGE OF ENGINEERING', { align: 'center' });
      doc.fontSize(12).fillColor('#374151').text('DAILY ATTENDANCE REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#6b7280').text(`Report Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      let y = doc.y;
      doc.fontSize(9).fillColor('#111827');
      doc.text('Reg No', 40, y, { width: 90 });
      doc.text('Student Name', 135, y, { width: 140 });
      doc.text('Dept/Year', 280, y, { width: 80 });
      doc.text('Date', 365, y, { width: 75 });
      doc.text('Check-In Time', 445, y, { width: 110 });

      doc.moveTo(40, y + 15).lineTo(560, y + 15).stroke('#d1d5db');
      y += 22;

      records.forEach((r: any) => {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        doc.fontSize(8).fillColor('#374151');
        doc.text(r.studentId?.registerNo || r.studentId?.rollNo || '-', 40, y, { width: 90 });
        doc.text(r.studentId?.name || '-', 135, y, { width: 140 });
        doc.text(`${r.studentId?.department || ''} Y${r.studentId?.year || ''}`, 280, y, { width: 80 });
        doc.text(r.attendanceDate, 365, y, { width: 75 });
        doc.fillColor('#16a34a').text(new Date(r.checkInTime).toLocaleTimeString(), 445, y, { width: 110 });
        y += 18;
      });

      doc.end();
      return;
    }

    return res.json({ records });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error generating attendance report', error: error.message });
  }
};
