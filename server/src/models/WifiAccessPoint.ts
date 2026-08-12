import mongoose, { Schema, Document } from 'mongoose';

export interface IWifiAccessPoint extends Document {
  ssid: string;
  bssid: string;
  location: string;
  isActive: boolean;
}

const WifiAccessPointSchema = new Schema<IWifiAccessPoint>(
  {
    ssid: { type: String, required: true, trim: true },
    bssid: { type: String, required: true, unique: true, lowercase: true, trim: true },
    location: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const WifiAccessPoint = mongoose.model<IWifiAccessPoint>('WifiAccessPoint', WifiAccessPointSchema);
