import { Request, Response } from 'express';
import { WifiAccessPoint } from '../models/WifiAccessPoint';

export const getWifiAccessPoints = async (req: Request, res: Response) => {
  try {
    const aps = await WifiAccessPoint.find().sort({ ssid: 1 });
    return res.json(aps);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching Wi-Fi access points', error: error.message });
  }
};

export const createWifiAccessPoint = async (req: Request, res: Response) => {
  try {
    const { ssid, bssid, location } = req.body;
    if (!ssid || !bssid || !location) {
      return res.status(400).json({ message: 'ssid, bssid, and location are required' });
    }

    const existing = await WifiAccessPoint.findOne({ bssid: bssid.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Access point with this BSSID already exists' });
    }

    const ap = await WifiAccessPoint.create({
      ssid: ssid.trim(),
      bssid: bssid.toLowerCase().trim(),
      location: location.trim(),
      isActive: true
    });
    return res.status(201).json(ap);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error creating Wi-Fi access point', error: error.message });
  }
};

export const deleteWifiAccessPoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await WifiAccessPoint.findByIdAndDelete(id);
    return res.json({ message: 'Wi-Fi access point deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting Wi-Fi access point', error: error.message });
  }
};
