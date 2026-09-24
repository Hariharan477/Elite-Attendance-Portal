import { Request, Response } from 'express';
import XLSX from 'xlsx';
import { User } from '../models/User';
import { StudentDevice } from '../models/StudentDevice';

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { department, year, section, search } = req.query;
    let query: any = { role: 'student' };

    if (department) query.department = department;
    if (year) query.year = year;
    if (section) query.section = section;
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [
        { name: searchRegex },
        { rollNo: searchRegex },
        { registerNo: searchRegex },
        { email: searchRegex }
      ];
    }

    const students = await User.find(query).sort({ rollNo: 1, name: 1 });
    return res.json(students);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};

export const getStudentCount = async (req: Request, res: Response) => {
  try {
    const count = await User.countDocuments({ role: 'student' });
    return res.json({ count });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching student count', error: error.message });
  }
};


export const createStudent = async (req: Request, res: Response) => {
  try {
    const { name, email, registerNo, rollNo, department, year, section, phone } = req.body;
    console.log('[createStudent] Received payload:', { name, email, registerNo, rollNo, department, year, section });

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const student = await User.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          name,
          email: cleanEmail,
          role: 'student',
          registerNo: registerNo || rollNo || `REG-${Date.now()}`,
          rollNo: rollNo || registerNo || `ROLL-${Date.now()}`,
          department: department || 'CSE',
          year: year || '1',
          section: section || 'A',
          phone
        }
      },
      { new: true, upsert: true }
    );


    console.log('[createStudent] Successfully saved/updated student:', student._id);
    return res.status(201).json(student);

  } catch (error: any) {
    console.error('[createStudent] Exception error:', error);
    return res.status(500).json({ message: `Error creating student: ${error.message}` });
  }
};


export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, registerNo, rollNo, department, year, section, phone } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (name) student.name = name;
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      student.email = cleanEmail;
    }

    if (registerNo) student.registerNo = registerNo;
    if (rollNo) student.rollNo = rollNo;
    if (department) student.department = department;
    if (year) student.year = year;
    if (section) student.section = section;
    if (phone) student.phone = phone;

    await student.save();
    return res.json(student);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating student', error: error.message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'student' });
    if (!deleted) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Clean up device bindings belonging to the deleted student
    const deleteDeviceResult = await StudentDevice.deleteMany({ studentId: id });
    console.log(`[DEVICE DELETE] Removed ${deleteDeviceResult.deletedCount} device binding(s) for deleted student ${deleted.email} (${id})`);

    return res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
};

// Import Students from Excel file upload
export const importStudentsExcel = async (req: Request, res: Response) => {
  try {
    console.log('[importStudentsExcel] Incoming request received.');
    console.log('[importStudentsExcel] req.file exists:', !!req.file);

    if (!req.file) {
      console.error('[importStudentsExcel] REJECTED: No file uploaded in request.');
      return res.status(400).json({
        message: 'Please upload an Excel file (.xlsx or .xls)',
        error: 'No file provided in form-data payload'
      });
    }

    console.log(`[importStudentsExcel] File Details -> Name: '${req.file.originalname}', MimeType: '${req.file.mimetype}', Size: ${req.file.size} bytes`);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (parseError: any) {
      console.error('[importStudentsExcel] XLSX parse buffer error:', parseError);
      return res.status(400).json({
        message: 'Failed to parse Excel file format',
        error: parseError.message
      });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.error('[importStudentsExcel] REJECTED: No worksheet found in Excel file.');
      return res.status(400).json({
        message: 'Excel workbook contains no sheets',
        error: 'Empty workbook'
      });
    }

    console.log(`[importStudentsExcel] Target Worksheet Name: '${sheetName}'`);

    const sheetData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      raw: false
    });

    console.log(`[importStudentsExcel] Parsed Row Count: ${sheetData.length}`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const rowErrors: string[] = [];

    for (let i = 0; i < sheetData.length; i++) {
      const row: any = sheetData[i];
      const rowNum = i + 2;

      const name = String(row.Name || row.name || '').trim();
      const email = String(row.Email || row.email || '').toLowerCase().trim();
      const department = String(row.Department || row.department || 'CSE').trim();
      const year = String(row.Year || row.year || '3').trim();
      const section = String(row.Section || row.section || 'A').trim();

      const regNoRaw = row['Register Number'] || row['RegisterNo'] || row.registerNo || row.RegisterNo || row['Reg No'] || row['RegNo'] || '';
      const registerNo = String(regNoRaw).trim();

      const rollNoRaw = row['Roll Number'] || row['RollNo'] || row.rollNo || row.RollNo || registerNo;
      const rollNo = String(rollNoRaw).trim();

      if (!name || !email) {
        skippedCount++;
        const missingFields = [!name && 'Name', !email && 'Email'].filter(Boolean).join(', ');
        rowErrors.push(`Row ${rowNum}: Missing mandatory ${missingFields}`);
        console.warn(`[importStudentsExcel] Skipping Row ${rowNum}: Missing ${missingFields}`);
        continue;
      }

      try {
        const existing = await User.findOne({ email });

        if (!existing) {
          await User.create({
            name,
            email,
            role: 'student',
            registerNo: registerNo || `REG-${Date.now()}-${i}`,
            rollNo: rollNo || registerNo || `ROLL-${Date.now()}-${i}`,
            department,
            year,
            section
          });
          createdCount++;
        } else {
          existing.name = name;
          if (registerNo) existing.registerNo = registerNo;
          if (rollNo) existing.rollNo = rollNo;
          if (department) existing.department = department;
          if (year) existing.year = year;
          if (section) existing.section = section;
          await existing.save();
          updatedCount++;
        }
      } catch (rowError: any) {
        skippedCount++;
        rowErrors.push(`Row ${rowNum} (${email}): ${rowError.message}`);
        console.error(`[importStudentsExcel] Error processing Row ${rowNum} (${email}):`, rowError.message);
      }
    }

    console.log(`[importStudentsExcel] Completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Total Rows: ${sheetData.length}`);

    const resultMessage = `Excel import completed. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`;

    return res.json({
      message: resultMessage,
      createdCount,
      updatedCount,
      skippedCount,
      totalRows: sheetData.length,
      rowErrors: rowErrors.length > 0 ? rowErrors : undefined
    });

  } catch (error: any) {
    console.error('[importStudentsExcel] Unexpected exception error:', error);
    return res.status(500).json({
      message: 'Error parsing Excel file',
      error: error.message || 'Server Exception'
    });
  }
};

// Admin Controller: Reset Student Device Association
export const resetStudentDevice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { StudentDevice } = await import('../models/StudentDevice');

    // Deactivate all active device bindings for this student
    const result = await StudentDevice.updateMany(
      { studentId: student._id, isActive: true },
      { $set: { isActive: false, resetAt: new Date() } }
    );

    console.log(`[DEVICE RESET] Admin reset device for student ${student.email} (${student._id}). Modified: ${result.modifiedCount}`);

    return res.json({
      success: true,
      message: `Device registration for student ${student.name} (${student.email}) has been reset successfully.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error resetting student device', error: error.message });
  }
};

// Admin Controller: Get Student Device Status
export const getStudentDeviceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { StudentDevice } = await import('../models/StudentDevice');
    const device = await StudentDevice.findOne({ studentId: id, isActive: true });
    return res.json({
      isRegistered: !!device,
      device: device || null
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching student device status', error: error.message });
  }
};

