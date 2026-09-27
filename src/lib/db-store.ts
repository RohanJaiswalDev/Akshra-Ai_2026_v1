import { connectToDatabase } from "./mongodb";
import { User } from "@/models/User";
import { Otp } from "@/models/Otp";

interface MemoryUser {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  createdAt: Date;
}

interface MemoryOtp {
  email: string;
  otp: string;
  expiresAt: number;
}

// In-memory fallback stores for when local MongoDB is not running
declare global {
  var __memoryUsers: Map<string, MemoryUser> | undefined;
  var __memoryOtps: Map<string, MemoryOtp> | undefined;
}

if (!global.__memoryUsers) global.__memoryUsers = new Map();
if (!global.__memoryOtps) global.__memoryOtps = new Map();

const memoryUsers = global.__memoryUsers;
const memoryOtps = global.__memoryOtps;

export async function storeOtp(email: string, otp: string): Promise<void> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, createdAt: new Date() });
  } else {
    // Fallback store: 10 minutes expiry
    memoryOtps.set(email, {
      email,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }
}

export async function checkOtp(email: string, otp: string): Promise<boolean> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const validAfter = new Date(Date.now() - 10 * 60 * 1000);
    const record = await Otp.findOne({ email, otp, createdAt: { $gt: validAfter } });
    if (!record) return false;
    await Otp.deleteMany({ email });
    return true;
  } else {
    const record = memoryOtps.get(email);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      memoryOtps.delete(email);
      return false;
    }
    if (record.otp !== otp) return false;
    memoryOtps.delete(email);
    return true;
  }
}

export async function getOrCreateUser(email: string): Promise<{ id: string; email: string; name: string }> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name: email.split("@")[0],
        isVerified: true,
      });
    }
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  } else {
    let user = memoryUsers.get(email);
    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
        name: email.split("@")[0],
        isVerified: true,
        createdAt: new Date(),
      };
      memoryUsers.set(email, user);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

export async function findUserById(id: string): Promise<{ id: string; email: string; name: string } | null> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    try {
      const user = await User.findById(id);
      if (!user) return null;
      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      };
    } catch {
      return null;
    }
  } else {
    for (const u of memoryUsers.values()) {
      if (u.id === id) {
        return {
          id: u.id,
          email: u.email,
          name: u.name,
        };
      }
    }
    return null;
  }
}
