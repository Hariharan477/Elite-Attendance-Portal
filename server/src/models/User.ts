import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  googleId?: string;
  profilePicture?: string;
  role: 'admin' | 'student';
  rollNo?: string;
  registerNo?: string;
  department?: string;
  year?: string;
  section?: string;
  phone?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, trim: true },
    profilePicture: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'student'], required: true },
    rollNo: { type: String, trim: true },
    registerNo: { type: String, trim: true },
    department: { type: String, trim: true },
    year: { type: String, trim: true },
    section: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
