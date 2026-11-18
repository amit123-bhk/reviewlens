import mongoose from "mongoose";

const insightsCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    topComplaints: {
      type: Array,
      required: true,
      default: [],
    },
    topPraises: {
      type: Array,
      required: true,
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

export const InsightsCache =
  mongoose.models.InsightsCache ||
  mongoose.model("InsightsCache", insightsCacheSchema);
