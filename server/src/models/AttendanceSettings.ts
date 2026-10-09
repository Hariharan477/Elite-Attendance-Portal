import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceSettings extends Document {
  attendanceDate: string; // YYYY-MM-DD
  startTime: Date;
  endTime: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'ENDED';
  createdBy: mongoose.Types.ObjectId | string;
  wifiAccessPointId?: mongoose.Types.ObjectId | string;
  wifiSSID?: string;
  wifiBSSID?: string;
  wifiLocation?: string;
  isExcluded?: boolean;
  excludedAt?: Date;
  excludedBy?: mongoose.Types.ObjectId | string;
  exclusionReason?: string;
}

const AttendanceSettingsSchema = new Schema<IAttendanceSettings>(
  {
    attendanceDate: { type: String, required: true, unique: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'ENDED'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wifiAccessPointId: { type: Schema.Types.ObjectId, ref: 'WifiAccessPoint' },
    wifiSSID: { type: String },
    wifiBSSID: { type: String },
    wifiLocation: { type: String },
    isExcluded: { type: Boolean, default: false },
    excludedAt: { type: Date },
    excludedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    exclusionReason: { type: String }
  },
  { timestamps: true }
);


export const AttendanceSettings = mongoose.model<IAttendanceSettings>('AttendanceSettings', AttendanceSettingsSchema);
