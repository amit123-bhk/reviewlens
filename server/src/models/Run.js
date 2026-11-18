import mongoose from "mongoose";

const runSchema = new mongoose.Schema(
  {
    reviews: {
      type: Array,
      required: true,
      default: [],
    },
    cleaningSummary: {
      total: { type: Number, default: 0 },
      valid: { type: Number, default: 0 },
      skippedEmpty: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
    },
    runStats: {
      aiCalls: { type: Number, default: 0 },
      cacheHits: { type: Number, default: 0 },
      elapsedMs: { type: Number, default: 0 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

export const Run = mongoose.models.Run || mongoose.model("Run", runSchema);
