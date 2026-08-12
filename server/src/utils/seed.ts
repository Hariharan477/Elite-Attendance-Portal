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

    // 2. Admin Users (IFET domain)
    const adminEmails = ['admin@ifet.ac.in', 'hariharan.cse25@ifet.ac.in'];
    for (const email of adminEmails) {
      await User.updateOne(
        { email },
        {
          $set: {
            role: 'admin',
            department: 'CSE'
          },
          $setOnInsert: {
            name: email.split('@')[0].toUpperCase(),
            email,
            registerNo: 'ADM-001'
          }
        },
        { upsert: true }
      );
    }


    // 3. Demo IFET Student
    await User.updateOne(
      { email: 'hariharan.cse25@ifet.ac.in' },
      {
        $setOnInsert: {
          name: 'Hariharan H',
          email: 'hariharan.cse25@ifet.ac.in',
          role: 'student',
          registerNo: '710022104001',
          rollNo: '22CS001',
          department: 'CSE',
          year: '3',
          section: 'A',
          phone: '9876543210'
        }
      },
      { upsert: true }
    );



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
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error);
  }
};


if (require.main === module) {
  seedDatabase().then(() => mongoose.disconnect());
}
