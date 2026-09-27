import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMemory extends Document {
  userId: string;
  content: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

MemorySchema.index({ userId: 1, createdAt: -1 });

export const Memory: Model<IMemory> =
  mongoose.models.Memory || mongoose.model<IMemory>("Memory", MemorySchema);
