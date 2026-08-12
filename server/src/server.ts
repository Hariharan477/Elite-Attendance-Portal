import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import wifiRoutes from './routes/wifiRoutes';
import { seedDatabase } from './utils/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/wifi', wifiRoutes);


// Root Status
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Elite Attendance Management API Server Running' });
});

// Connect to DB and seed initial data
connectDB().then(async () => {
  await seedDatabase();
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Elite Class Portal API Server running on port ${PORT}`);
  console.log(`====================================================`);
});
