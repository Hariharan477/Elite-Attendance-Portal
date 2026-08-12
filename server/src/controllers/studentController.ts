import { Request, Response } from 'express';
import XLSX from 'xlsx';
import { User } from '../models/User';

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

export const createStudent = async (req: Request, res: Response) => {
  try {
    const { name, email, registerNo, rollNo, department, year, section, phone } = req.body;
    console.log('[createStudent] Received payload:', { name, email, registerNo, rollNo, department, year, section });

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(400).json({ message: `Student with email '${cleanEmail}' already exists in database` });
    }

    const student = await User.create({
      name,
      email: cleanEmail,
      role: 'student',
      registerNo: registerNo || rollNo || `REG-${Date.now()}`,
      rollNo: rollNo || registerNo || `ROLL-${Date.now()}`,
      department: department || 'CSE',
      year: year || '1',
      section: section || 'A',
      phone
    });

    console.log('[createStudent] Successfully created student:', student._id);
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
    return res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
};

// Import Students from Excel file upload
export const importStudentsExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel file (.xlsx or .xls)' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let createdCount = 0;
    let skippedCount = 0;

    for (const row of sheetData) {
      const name = row.Name || row.name;
      const email = (row.Email || row.email || '').toString().toLowerCase().trim();
      const department = row.Department || row.department || 'CSE';
      const year = String(row.Year || row.year || '3');
      const section = row.Section || row.section || 'A';
      const registerNo = String(row['Register Number'] || row.registerNo || row.RegisterNo || '');
      const rollNo = String(row['Roll Number'] || row.rollNo || row.RollNo || registerNo);

      if (name && email) {
        const existing = await User.findOne({ email });

        if (!existing) {
          await User.create({
            name,
            email,
            role: 'student',
            registerNo,
            rollNo,
            department,
            year,
            section
          });
          createdCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return res.json({
      message: `Excel import completed successfully.`,
      createdCount,
      skippedCount,
      totalRows: sheetData.length
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error parsing Excel file', error: error.message });
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

