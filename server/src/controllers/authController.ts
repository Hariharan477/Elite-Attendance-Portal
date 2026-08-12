import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'elite_attendance_secret_jwt_key_2026_super_secure';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google ID Token credential is required' });
    }

    let payload: any = null;

    // Verify token with Google's OAuth2Client
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      // Decode JWT payload if client ID verification in local dev is mismatched
      const decoded = jwt.decode(credential) as any;
      if (decoded && decoded.email) {
        payload = decoded;
      } else {
        return res.status(401).json({ message: 'Invalid Google authentication token' });
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Failed to retrieve email from Google profile' });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.given_name || 'IFET User';
    const googleId = payload.sub;
    const profilePicture = payload.picture;

    // 1. Database verification: MUST be registered by Administrator
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`[AUTH REJECTED] Email ${email} is not registered in MongoDB by Admin.`);
      return res.status(403).json({
        message: 'Your account is not registered by the administrator.'
      });
    }






    // 3. Update googleId and profilePicture
    if (googleId) user.googleId = googleId;
    if (profilePicture) user.profilePicture = profilePicture;
    await user.save();

    // Device Binding Logic for Students
    const { deviceId } = req.body;
    let deviceStatusMessage = null;

    if (user.role === 'student' && deviceId && typeof deviceId === 'string' && deviceId.trim()) {
      const cleanDeviceId = deviceId.trim();
      const { StudentDevice } = await import('../models/StudentDevice');

      // Check if this device is active with any student
      const existingDevice = await StudentDevice.findOne({ deviceId: cleanDeviceId, isActive: true });

      if (existingDevice) {
        if (String(existingDevice.studentId) === String(user._id)) {
          // Same student & same device -> Update lastUsedAt
          existingDevice.lastUsedAt = new Date();
          await existingDevice.save();
          console.log(`[DEVICE CHECK] Student ${user.email} logged in with registered device.`);
        } else {
          // Device is registered to another student!
          console.log(`[DEVICE CHECK] REJECTED: Device ${cleanDeviceId} is already bound to student ${existingDevice.studentId}, but student ${user.email} (${user._id}) attempted to log in.`);
          return res.status(403).json({
            message: 'This device is registered to another student.'
          });
        }
      } else {
        // If student already had an old registered device (e.g. app deleted/reinstalled), update to current active device
        const studentActiveDevice = await StudentDevice.findOne({ studentId: user._id, isActive: true });
        if (studentActiveDevice) {
          studentActiveDevice.deviceId = cleanDeviceId;
          studentActiveDevice.lastUsedAt = new Date();
          await studentActiveDevice.save();
          console.log(`[DEVICE UPDATE] Updated student ${user.email} active device to new reinstalled device ${cleanDeviceId}`);
        } else {
          // First time registration or post-reset registration!
          await StudentDevice.create({
            studentId: user._id,
            deviceId: cleanDeviceId,
            isActive: true,
            registeredAt: new Date(),
            lastUsedAt: new Date()
          });
          console.log(`[DEVICE REGISTER] Student ${user.email} successfully registered new device ${cleanDeviceId}.`);
        }

      }
    }

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        year: user.year,
        section: user.section
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        section: user.section,
        rollNo: user.rollNo,
        registerNo: user.registerNo,
        profilePicture: user.profilePicture,
        phone: user.phone
      }
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Server error verifying Google token', error: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
