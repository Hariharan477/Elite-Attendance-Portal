import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarDay extends Document {
  date: string; // YYYY-MM-DD
  isHoliday: boolean;
  holidayName?: string;
  updatedBy?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarDaySchema = new Schema<ICalendarDay>(
  {
    date: { type: String, required: true, unique: true },
    isHoliday: { type: Boolean, required: true, default: false },
    holidayName: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export const CalendarDay = mongoose.model<ICalendarDay>('CalendarDay', CalendarDaySchema);
