import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { WifiAccessPoint } from '../models/WifiAccessPoint';
import { connectDB } from '../config/db';


export const seedDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    console.log('[Seeder] Database connection ready');

    // 1. Departments
    const depts = [
      { code: 'CSE', name: 'Computer Science and Engineering' },
      { code: 'ECE', name: 'Electronics and Communication Engineering' },
      { code: 'MECH', name: 'Mechanical Engineering' }
    ];
    for (const d of depts) {
      await Department.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
    }

    // 2. Admin Users (Authorized admin accounts)
    const adminEmails = [
      'admin@ifet.ac.in',
      'hariharan477hr@gmail.com'
    ].map(e => e.toLowerCase().trim());

    for (const email of adminEmails) {
      await User.updateOne(
        { email },
        {
          $set: {
            email,
            role: 'admin',
            department: 'CSE'
          },
          $setOnInsert: {
            name: email.split('@')[0].toUpperCase(),
            registerNo: 'ADM-001'
          }
        },
        { upsert: true }
      );
      console.log(`[Seeder] Admin account verified/created: ${email}`);
    }

    // Clean up old demo student 'hariharan.cse25@ifet.ac.in' if previously created as admin/student
    await User.deleteMany({ email: 'hariharan.cse25@ifet.ac.in' });




    // 5. Wi-Fi Access Points
    const wifis = [
      { ssid: 'IFET_CAMPUS_WIFI', bssid: 'a1:b2:c3:d4:e5:f6', location: 'CSE Computer Lab 3' },
      { ssid: 'IFET_SEMINAR_HALL', bssid: '11:22:33:44:55:66', location: 'Main Auditorium' }
    ];
    for (const w of wifis) {
      await WifiAccessPoint.updateOne({ bssid: w.bssid }, { $setOnInsert: w }, { upsert: true });
    }

    // 6. Generate 110 IFET Domain Students for CSE III Year Section A
    // Clean up auto-generated demo students
    await User.deleteMany({ role: 'student', email: { $regex: '^student[0-9]+@' } });

    console.log('[Seeder] Database initialized with Admin accounts. Demo students cleared.');

    // Safe startup cleanup of orphaned StudentDevice records
    await cleanupOrphanedDevices();
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error);
  }
};

export const cleanupOrphanedDevices = async () => {
  try {
    const { StudentDevice } = await import('../models/StudentDevice');

    // 1. Remove orphaned device records (studentId no longer exists in User collection)
    const allDevices = await StudentDevice.find({});
    let orphanedCount = 0;

    for (const dev of allDevices) {
      const studentExists = await User.exists({ _id: dev.studentId });
      if (!studentExists) {
        await StudentDevice.deleteOne({ _id: dev._id });
        orphanedCount++;
        console.log(`[DEVICE CLEANUP] Removed orphaned device ${dev.deviceId} (studentId: ${dev.studentId})`);
      }
    }

    // 2. Deduplicate active deviceId records (keep most recently used active record per deviceId)
    const activeDevices = await StudentDevice.find({ isActive: true }).sort({ lastUsedAt: -1, updatedAt: -1 });
    const seenDeviceIds = new Set<string>();
    let duplicateCleanedCount = 0;

    for (const dev of activeDevices) {
      if (seenDeviceIds.has(dev.deviceId)) {
        await StudentDevice.deleteOne({ _id: dev._id });
        duplicateCleanedCount++;
        console.log(`[DEVICE CLEANUP] Removed duplicate active device binding for deviceId: ${dev.deviceId} (studentId: ${dev.studentId})`);
      } else {
        seenDeviceIds.add(dev.deviceId);
      }
    }

    // 3. Deduplicate active studentId records (keep most recently used active record per studentId)
    const activeStudentDevices = await StudentDevice.find({ isActive: true }).sort({ lastUsedAt: -1, updatedAt: -1 });
    const seenStudentIds = new Set<string>();

    for (const dev of activeStudentDevices) {
      const sId = String(dev.studentId);
      if (seenStudentIds.has(sId)) {
        await StudentDevice.deleteOne({ _id: dev._id });
        duplicateCleanedCount++;
        console.log(`[DEVICE CLEANUP] Removed extra active device for studentId: ${sId}`);
      } else {
        seenStudentIds.add(sId);
      }
    }

    if (orphanedCount > 0 || duplicateCleanedCount > 0) {
      console.log(`[DEVICE CLEANUP] Startup cleanup completed: ${orphanedCount} orphan(s) and ${duplicateCleanedCount} duplicate active binding(s) removed.`);
    } else {
      console.log(`[DEVICE CLEANUP] Database clean. No orphaned or duplicate active device records found.`);
    }

    // Safely sync unique partial indexes now that duplicates are cleaned
    await StudentDevice.syncIndexes();
  } catch (error) {
    console.error('[DEVICE CLEANUP] Error during startup device cleanup & index sync:', error);
  }
};

if (require.main === module) {
  seedDatabase().then(() => mongoose.disconnect());
}
