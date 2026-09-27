import mongoose, { Schema, Model } from "mongoose";

import { FileAttachment } from "@/types/files";

export interface IChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  feedback?: "up" | "down";
  attachments?: FileAttachment[];
}

export interface IChat {
  userId: string;
  title: string;
  model: string;
  folder?: string;
  isPinned: boolean;
  isArchived: boolean;
  messages: IChatMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, required: true, enum: ["user", "assistant"] },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
    isError: { type: Boolean, default: false },
    feedback: { type: String, enum: ["up", "down"] },
    attachments: { type: Array, default: undefined },
  },
  { _id: false }
);

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: "New Conversation",
      trim: true,
    },
    model: {
      type: String,
      default: "auto",
    },
    folder: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ChatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat: Model<IChat> =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);
