import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId | string;
  attendanceDate: string; // YYYY-MM-DD
  checkInTime: Date;
  status: 'PRESENT' | 'ABSENT';
  wifiVerified?: boolean;
  ssidUsed?: string;
  bssidUsed?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attendanceDate: { type: String, required: true },
    checkInTime: { type: Date, default: Date.now },
    status: { type: String, enum: ['PRESENT', 'ABSENT'], default: 'PRESENT' },
    wifiVerified: { type: Boolean, default: false },
    ssidUsed: { type: String },
    bssidUsed: { type: String }
  },
  { timestamps: true }
);

// Prevent duplicate attendance per student per day
AttendanceSchema.index({ studentId: 1, attendanceDate: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
