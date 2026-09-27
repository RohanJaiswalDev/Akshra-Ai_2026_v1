import crypto from "crypto";
import { connectToDatabase } from "./mongodb";
import { User } from "@/models/User";
import { Otp } from "@/models/Otp";
import { Chat, type IChatMessage } from "@/models/Chat";
import { Memory } from "@/models/Memory";
import { DEFAULT_MODEL_ID } from "@/lib/models";

interface MemoryUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  isVerified: boolean;
  createdAt: Date;
}

interface MemoryOtp {
  email: string;
  hashedOtp: string;
  attempts: number;
  expiresAt: number;
}

export interface StoredChat {
  id: string;
  userId: string;
  title: string;
  model: string;
  folder?: string;
  isPinned: boolean;
  isArchived: boolean;
  messages: IChatMessage[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StoredMemory {
  id: string;
  userId: string;
  content: string;
  enabled: boolean;
  createdAt: Date | string;
}

// In-memory fallback stores
declare global {
  var __memoryUsers: Map<string, MemoryUser> | undefined;
  var __memoryOtps: Map<string, MemoryOtp> | undefined;
  var __memoryChats: Map<string, StoredChat[]> | undefined;
  var __memoryMemories: Map<string, StoredMemory[]> | undefined;
  var __otpRateLimits: Map<string, number[]> | undefined;
}

if (!global.__memoryUsers) global.__memoryUsers = new Map();
if (!global.__memoryOtps) global.__memoryOtps = new Map();
if (!global.__memoryChats) global.__memoryChats = new Map();
if (!global.__memoryMemories) global.__memoryMemories = new Map();
if (!global.__otpRateLimits) global.__otpRateLimits = new Map();

const memoryUsers = global.__memoryUsers;
const memoryOtps = global.__memoryOtps;
const memoryChats = global.__memoryChats;
const memoryMemories = global.__memoryMemories;
const otpRateLimits = global.__otpRateLimits;

// Cryptographic hash for OTPs (SHA-256)
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

// Server-side OTP Rate Limiting: Max 3 OTP requests / 15 minutes / email
export function checkOtpRateLimit(email: string): { allowed: boolean; waitSeconds?: number } {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  const timestamps = (otpRateLimits.get(normalizedEmail) || []).filter(
    (t) => now - t < fifteenMinutes
  );

  if (timestamps.length >= 3) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((fifteenMinutes - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  timestamps.push(now);
  otpRateLimits.set(normalizedEmail, timestamps);
  return { allowed: true };
}

// Store secure hashed OTP
export async function storeOtp(email: string, rawOtp: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedOtp = hashOtp(rawOtp);
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp: hashedOtp,
      attempts: 0,
      createdAt: new Date(),
    });
  } else {
    memoryOtps.set(normalizedEmail, {
      email: normalizedEmail,
      hashedOtp,
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }
}

// Verify OTP against cryptographic hash with max 5 failed attempts limit
export async function checkOtp(
  email: string,
  rawOtp: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedOtp = hashOtp(rawOtp);
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const validAfter = new Date(Date.now() - 10 * 60 * 1000);
    const record = await Otp.findOne({ email: normalizedEmail, createdAt: { $gt: validAfter } });
    if (!record) {
      return { success: false, error: "OTP has expired or was not requested. Please request a new code." };
    }

    if (record.attempts >= 5) {
      await Otp.deleteMany({ email: normalizedEmail });
      return { success: false, error: "Too many failed verification attempts. Please request a new OTP." };
    }

    if (record.otp !== hashedOtp) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      const remaining = 5 - record.attempts;
      return {
        success: false,
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before code expires.`,
      };
    }

    await Otp.deleteMany({ email: normalizedEmail });
    return { success: true };
  } else {
    const record = memoryOtps.get(normalizedEmail);
    if (!record) {
      return { success: false, error: "OTP has expired or was not requested. Please request a new code." };
    }

    if (Date.now() > record.expiresAt) {
      memoryOtps.delete(normalizedEmail);
      return { success: false, error: "OTP has expired. Please request a new code." };
    }

    if (record.attempts >= 5) {
      memoryOtps.delete(normalizedEmail);
      return { success: false, error: "Too many failed verification attempts. Please request a new OTP." };
    }

    if (record.hashedOtp !== hashedOtp) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return {
        success: false,
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before code expires.`,
      };
    }

    memoryOtps.delete(normalizedEmail);
    return { success: true };
  }
}

// User Operations
export async function findUserByEmail(email: string): Promise<MemoryUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const user = await User.findOne({ email: normalizedEmail }).lean();
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      mobileNumber: user.mobileNumber || "",
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  } else {
    return memoryUsers.get(normalizedEmail) || null;
  }
}

export async function findUserById(userId: string): Promise<MemoryUser | null> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const user = await User.findById(userId).lean();
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      mobileNumber: user.mobileNumber || "",
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  } else {
    for (const u of memoryUsers.values()) {
      if (u.id === userId) return u;
    }
    return null;
  }
}

export async function createUser(
  email: string,
  name: string,
  details?: { firstName?: string; lastName?: string; mobileNumber?: string }
): Promise<MemoryUser> {
  const normalizedEmail = email.toLowerCase().trim();
  const { isConnected } = await connectToDatabase();

  const firstName = details?.firstName?.trim() || "";
  const lastName = details?.lastName?.trim() || "";
  const mobileNumber = details?.mobileNumber?.trim() || "";

  if (isConnected) {
    const user = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      firstName,
      lastName,
      mobileNumber,
      isVerified: true,
    });
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      mobileNumber: user.mobileNumber || "",
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  } else {
    const newUser: MemoryUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normalizedEmail,
      name: name.trim(),
      firstName,
      lastName,
      mobileNumber,
      isVerified: true,
      createdAt: new Date(),
    };
    memoryUsers.set(normalizedEmail, newUser);
    return newUser;
  }
}

export async function getOrCreateUser(
  email: string,
  name?: string,
  details?: { firstName?: string; lastName?: string; mobileNumber?: string }
): Promise<MemoryUser> {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (details && (details.firstName || details.lastName || details.mobileNumber)) {
      const { isConnected } = await connectToDatabase();
      const firstName = details.firstName?.trim() || existing.firstName || "";
      const lastName = details.lastName?.trim() || existing.lastName || "";
      const mobileNumber = details.mobileNumber?.trim() || existing.mobileNumber || "";
      const updatedName = name?.trim() || existing.name;

      if (isConnected) {
        await User.findByIdAndUpdate(existing.id, {
          $set: {
            firstName,
            lastName,
            mobileNumber,
            name: updatedName,
          },
        });
      }
      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.mobileNumber = mobileNumber;
      existing.name = updatedName;
    }
    return existing;
  }
  const derivedName = name || (details?.firstName ? `${details.firstName} ${details.lastName || ""}`.trim() : email.split("@")[0]) || "User";
  return createUser(email, derivedName, details);
}

// -------------------------------------------------------------
// USER-SCOPED CHAT STORAGE (Phase 1 & Phase 2)
// -------------------------------------------------------------

export async function getUserChats(
  userId: string,
  options?: { folder?: string; search?: string; includeArchived?: boolean }
): Promise<StoredChat[]> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const query: Record<string, unknown> = { userId };
    if (!options?.includeArchived) {
      query.isArchived = { $ne: true };
    }
    if (options?.folder) {
      query.folder = options.folder;
    }
    if (options?.search) {
      const regex = new RegExp(options.search, "i");
      query.$or = [{ title: regex }, { "messages.content": regex }];
    }

    const chats = await Chat.find(query)
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return chats.map((c) => {
      const rawC = c as unknown as { model?: string; createdAt?: Date; updatedAt?: Date };
      return {
        id: c._id.toString(),
        userId: c.userId,
        title: c.title,
        model: rawC.model || DEFAULT_MODEL_ID,
        folder: c.folder || "General",
        isPinned: Boolean(c.isPinned),
        isArchived: Boolean(c.isArchived),
        messages: c.messages || [],
        createdAt: rawC.createdAt || new Date(),
        updatedAt: rawC.updatedAt || new Date(),
      };
    });
  } else {
    let userList = memoryChats.get(userId) || [];
    if (!options?.includeArchived) {
      userList = userList.filter((c) => !c.isArchived);
    }
    if (options?.folder) {
      userList = userList.filter((c) => c.folder === options.folder);
    }
    if (options?.search) {
      const s = options.search.toLowerCase();
      userList = userList.filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          c.messages.some((m) => m.content.toLowerCase().includes(s))
      );
    }

    return userList.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
}

export async function saveUserChat(
  userId: string,
  chatData: {
    id?: string;
    title: string;
    model?: string;
    folder?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    messages: IChatMessage[];
  }
): Promise<StoredChat> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    if (chatData.id && chatData.id.length === 24) {
      const existing = await Chat.findOne({ _id: chatData.id, userId });
      if (existing) {
        existing.title = chatData.title;
        if (chatData.model) existing.set("model", chatData.model);
        if (chatData.folder !== undefined) existing.folder = chatData.folder;
        if (chatData.isPinned !== undefined) existing.isPinned = chatData.isPinned;
        if (chatData.isArchived !== undefined) existing.isArchived = chatData.isArchived;
        existing.messages = chatData.messages;
        await existing.save();

        const modelVal = ((existing as unknown as { model?: string }).model) || DEFAULT_MODEL_ID;
        return {
          id: existing._id.toString(),
          userId: existing.userId,
          title: existing.title,
          model: modelVal,
          folder: existing.folder,
          isPinned: existing.isPinned,
          isArchived: existing.isArchived,
          messages: existing.messages,
          createdAt: existing.createdAt || new Date(),
          updatedAt: existing.updatedAt || new Date(),
        };
      }
    }

    const created = await Chat.create({
      userId,
      title: chatData.title,
      model: chatData.model || DEFAULT_MODEL_ID,
      folder: chatData.folder || "General",
      isPinned: chatData.isPinned || false,
      isArchived: chatData.isArchived || false,
      messages: chatData.messages,
    });

    const createdModel = ((created as unknown as { model?: string }).model) || DEFAULT_MODEL_ID;
    return {
      id: created._id.toString(),
      userId: created.userId,
      title: created.title,
      model: createdModel,
      folder: created.folder,
      isPinned: created.isPinned,
      isArchived: created.isArchived,
      messages: created.messages,
      createdAt: created.createdAt || new Date(),
      updatedAt: created.updatedAt || new Date(),
    };
  } else {
    const userList = memoryChats.get(userId) || [];
    const now = new Date().toISOString();

    if (chatData.id) {
      const existingIdx = userList.findIndex((c) => c.id === chatData.id);
      if (existingIdx >= 0) {
        const updated = {
          ...userList[existingIdx],
          title: chatData.title,
          model: chatData.model || userList[existingIdx].model,
          folder: chatData.folder !== undefined ? chatData.folder : userList[existingIdx].folder,
          isPinned: chatData.isPinned !== undefined ? chatData.isPinned : userList[existingIdx].isPinned,
          isArchived: chatData.isArchived !== undefined ? chatData.isArchived : userList[existingIdx].isArchived,
          messages: chatData.messages,
          updatedAt: now,
        };
        userList[existingIdx] = updated;
        memoryChats.set(userId, userList);
        return updated;
      }
    }

    const newChat: StoredChat = {
      id: chatData.id || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: chatData.title,
      model: chatData.model || DEFAULT_MODEL_ID,
      folder: chatData.folder || "General",
      isPinned: chatData.isPinned || false,
      isArchived: chatData.isArchived || false,
      messages: chatData.messages,
      createdAt: now,
      updatedAt: now,
    };

    userList.unshift(newChat);
    memoryChats.set(userId, userList);
    return newChat;
  }
}

export async function updateUserChat(
  userId: string,
  chatId: string,
  updates: {
    title?: string;
    folder?: string;
    isPinned?: boolean;
    isArchived?: boolean;
  }
): Promise<StoredChat | null> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) return null;

    const updatedModel = ((updated as unknown as { model?: string }).model) || DEFAULT_MODEL_ID;
    const rawUpdated = updated as unknown as { createdAt?: Date; updatedAt?: Date };
    return {
      id: updated._id.toString(),
      userId: updated.userId,
      title: updated.title,
      model: updatedModel,
      folder: updated.folder,
      isPinned: Boolean(updated.isPinned),
      isArchived: Boolean(updated.isArchived),
      messages: updated.messages || [],
      createdAt: rawUpdated.createdAt || new Date(),
      updatedAt: rawUpdated.updatedAt || new Date(),
    };
  } else {
    const userList = memoryChats.get(userId) || [];
    const index = userList.findIndex((c) => c.id === chatId);
    if (index === -1) return null;

    const updated = {
      ...userList[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    userList[index] = updated;
    memoryChats.set(userId, userList);
    return updated;
  }
}

export async function deleteUserChat(userId: string, chatId: string): Promise<boolean> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const res = await Chat.deleteOne({ _id: chatId, userId });
    return res.deletedCount > 0;
  } else {
    const userList = memoryChats.get(userId) || [];
    const filtered = userList.filter((c) => c.id !== chatId);
    memoryChats.set(userId, filtered);
    return filtered.length < userList.length;
  }
}

export async function clearAllUserChats(userId: string): Promise<boolean> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    await Chat.deleteMany({ userId });
    return true;
  } else {
    memoryChats.delete(userId);
    return true;
  }
}

// -------------------------------------------------------------
// AKSHRA MEMORY SYSTEM (Phase 4)
// -------------------------------------------------------------

export async function getUserMemories(userId: string): Promise<StoredMemory[]> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const list = await Memory.find({ userId }).sort({ createdAt: -1 }).lean();
    return list.map((m) => {
      const rawM = m as unknown as { createdAt?: Date };
      return {
        id: m._id.toString(),
        userId: m.userId,
        content: m.content,
        enabled: Boolean(m.enabled),
        createdAt: rawM.createdAt || new Date(),
      };
    });
  } else {
    return memoryMemories.get(userId) || [];
  }
}

export async function addUserMemory(userId: string, content: string): Promise<StoredMemory> {
  const cleanContent = content.trim();
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const created = await Memory.create({
      userId,
      content: cleanContent,
      enabled: true,
    });
    return {
      id: created._id.toString(),
      userId: created.userId,
      content: created.content,
      enabled: created.enabled,
      createdAt: created.createdAt,
    };
  } else {
    const list = memoryMemories.get(userId) || [];
    const newMemory: StoredMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      content: cleanContent,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newMemory);
    memoryMemories.set(userId, list);
    return newMemory;
  }
}

export async function deleteUserMemory(userId: string, memoryId: string): Promise<boolean> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    const res = await Memory.deleteOne({ _id: memoryId, userId });
    return res.deletedCount > 0;
  } else {
    const list = memoryMemories.get(userId) || [];
    const filtered = list.filter((m) => m.id !== memoryId);
    memoryMemories.set(userId, filtered);
    return filtered.length < list.length;
  }
}

export async function clearAllUserMemories(userId: string): Promise<boolean> {
  const { isConnected } = await connectToDatabase();

  if (isConnected) {
    await Memory.deleteMany({ userId });
    return true;
  } else {
    memoryMemories.delete(userId);
    return true;
  }
}
