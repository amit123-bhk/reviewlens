import mongoose from "mongoose";

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }
  await mongoose.connect(mongoUri);
}
