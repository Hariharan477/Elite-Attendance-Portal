import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async () => {
  const connStr = process.env.MONGODB_URI;
  if (connStr) {
    try {
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 3000 });
      console.log(`[Database] Connected to MongoDB Atlas: ${mongoose.connection.host}`);
      return;
    } catch (error: any) {
      console.log(`[Database] MONGODB_URI connection failed (${error.message}). Falling back to MongoMemoryServer...`);
    }
  }

  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    await mongoose.connect(uri);
    console.log(`[Database] Connected to Embedded MongoDB Memory Server at: ${uri}`);
  } catch (memErr) {
    console.error('[Database] Failed to start MongoMemoryServer:', memErr);
  }
};



