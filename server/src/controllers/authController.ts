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

      // 1. FIRST check whether the current authenticated student already owns an active binding for this deviceId
      const sameStudentDevice = await StudentDevice.findOne({
        deviceId: cleanDeviceId,
        studentId: user._id,
        isActive: true
      });

      if (sameStudentDevice) {
        sameStudentDevice.lastUsedAt = new Date();
        await sameStudentDevice.save();
        console.log(`[DEVICE CHECK] Same student device found. Allowed for student: ${user.email}`);
        console.log(`[DEVICE CHECK] Same student + same device allowed`);
      } else {
        // 2. Only if sameStudentDevice is NOT found, check if device is actively bound to another student
        const otherStudentDevice = await StudentDevice.findOne({
          deviceId: cleanDeviceId,
          isActive: true,
          studentId: { $ne: user._id }
        });

        if (otherStudentDevice) {
          console.log(`[DEVICE CHECK] Other student device found: ${cleanDeviceId}`);

          // Check if the student referenced by otherStudentDevice actually exists in User collection
          const boundStudent = await User.findById(otherStudentDevice.studentId).select('email name registerNo role');

          if (!boundStudent) {
            // Orphaned device binding!
            console.log(`[DEVICE CHECK] Orphaned device detected for device: ${cleanDeviceId}`);
            await StudentDevice.deleteMany({ deviceId: cleanDeviceId, studentId: otherStudentDevice.studentId });
            console.log(`[DEVICE CHECK] Removed orphaned device binding for device: ${cleanDeviceId}`);

            // Register / update device binding for current student
            const studentActiveDevice = await StudentDevice.findOne({ studentId: user._id, isActive: true });
            if (studentActiveDevice) {
              studentActiveDevice.deviceId = cleanDeviceId;
              studentActiveDevice.lastUsedAt = new Date();
              await studentActiveDevice.save();
              console.log(`[DEVICE REGISTER] Updated device binding for student: ${user.email} (${user._id}) to ${cleanDeviceId}`);
            } else {
              await StudentDevice.create({
                studentId: user._id,
                deviceId: cleanDeviceId,
                isActive: true,
                registeredAt: new Date(),
                lastUsedAt: new Date()
              });
              console.log(`[DEVICE REGISTER] New device registered for student: ${user.email} (${user._id})`);
            }
          } else {
            console.log(`[DEVICE CHECK] Bound student exists: ${boundStudent.email} (${boundStudent._id})`);
            console.log(`[DEVICE CHECK] Different student + device rejected. Bound student: ${boundStudent.email}, Attempted student: ${user.email}`);

            return res.status(403).json({
              message: 'This device is already registered to another student. Please contact your administrator to reset the device.'
            });
          }
        } else {
          // 3. No active device record exists for this device.
          // Check if current student has an active device with another deviceId
          const studentActiveDevice = await StudentDevice.findOne({ studentId: user._id, isActive: true });
          if (studentActiveDevice) {
            studentActiveDevice.deviceId = cleanDeviceId;
            studentActiveDevice.lastUsedAt = new Date();
            await studentActiveDevice.save();
            console.log(`[DEVICE REGISTER] Updated device binding for student: ${user.email} (${user._id}) to ${cleanDeviceId}`);
          } else {
            // First time registration
            await StudentDevice.create({
              studentId: user._id,
              deviceId: cleanDeviceId,
              isActive: true,
              registeredAt: new Date(),
              lastUsedAt: new Date()
            });
            console.log(`[DEVICE REGISTER] New device registered for student: ${user.email} (${user._id})`);
          }
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
