import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/akshra-ai";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isAvailable: boolean | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null, isAvailable: null };
}

export async function connectToDatabase(): Promise<{ isConnected: boolean; mongooseInstance?: typeof mongoose }> {
  if (cached && cached.conn && cached.isAvailable) {
    return { isConnected: true, mongooseInstance: cached.conn };
  }

  if (!cached) {
    cached = { conn: null, promise: null, isAvailable: null };
  }

  try {
    if (!cached.promise) {
      const opts: mongoose.ConnectOptions = {
        bufferCommands: false,
        serverSelectionTimeoutMS: 3000, // Fail fast (3s) instead of 30s hang if local mongo is down
      };

      cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    cached.conn = await cached.promise;
    cached.isAvailable = true;
    console.log("[MongoDB] Connected successfully to:", MONGODB_URI.split("@").pop()?.split("?")[0] || "database");
    return { isConnected: true, mongooseInstance: cached.conn };
  } catch (error: unknown) {
    cached.promise = null;
    cached.isAvailable = false;
    console.warn("[MongoDB] Could not connect to MongoDB:", error instanceof Error ? error.message : error);
    console.warn("[MongoDB] Using active Dev Memory Store. Add your MongoDB Atlas connection string in .env.local to persist.");
    return { isConnected: false };
  }
}
