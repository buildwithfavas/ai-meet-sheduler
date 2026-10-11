import mongoose from "mongoose";

let isConnected = false;

/**
 * Connect to MongoDB instance
 */
export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai_meet_scheduler";

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`🍃 [MongoDB] Connected to database: ${conn.connection.name} on ${conn.connection.host}:${conn.connection.port}`);
    return conn.connection;
  } catch (error) {
    console.error(`❌ [MongoDB] Connection error: ${error.message}`);
    throw error;
  }
}
