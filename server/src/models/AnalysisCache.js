import mongoose from "mongoose";

const analysisSubSchema = new mongoose.Schema(
  {
    sentiment: {
      type: String,
      required: true,
      enum: ["positive", "neutral", "negative"],
    },
    topics: {
      type: [String],
      required: true,
      default: [],
    },
    summary: {
      type: String,
      required: true,
    },
    needs_reply: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const analysisCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    analysis: {
      type: analysisSubSchema,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

export const AnalysisCache =
  mongoose.models.AnalysisCache ||
  mongoose.model("AnalysisCache", analysisCacheSchema);
