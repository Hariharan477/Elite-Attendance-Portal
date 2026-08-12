import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentDevice extends Document {
  studentId: mongoose.Types.ObjectId;
  deviceId: string;
  isActive: boolean;
  registeredAt: Date;
  lastUsedAt: Date;
  resetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentDeviceSchema = new Schema<IStudentDevice>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    registeredAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    resetAt: { type: Date }
  },
  { timestamps: true }
);

// Ensure index for quick queries
StudentDeviceSchema.index({ studentId: 1, isActive: 1 });
StudentDeviceSchema.index({ deviceId: 1, isActive: 1 });

export const StudentDevice = mongoose.model<IStudentDevice>('StudentDevice', StudentDeviceSchema);
