import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { connectDB } from "./db.js";
import { processUpload } from "./pipeline.js";
import { generateReviewReply } from "./replyService.js";
import { getInsights } from "./insights.js";
import { Run } from "./models/Run.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Multer memoryStorage configuration: max 1 MB, .csv only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  fileFilter: (req, file, cb) => {
    const isCsvExt = file.originalname.toLowerCase().endsWith(".csv");
    const isCsvMime =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/csv";

    if (!isCsvExt && !isCsvMime) {
      const err = new Error("Invalid file type. Only .csv files are allowed.");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

// POST /api/upload: Upload, analyze, store latest Run and return it
app.post("/api/upload", (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds the 1 MB limit" });
      }
      return res.status(err.status || 400).json({ error: err.message || "Upload error" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "CSV file is required in 'file' field" });
    }

    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({ error: "Invalid file type. Only .csv files are allowed." });
    }

    try {
      const result = await processUpload(req.file.buffer);
      const runDoc = await Run.create({
        reviews: result.reviews,
        cleaningSummary: result.cleaningSummary,
        runStats: result.runStats,
        createdAt: new Date(),
      });
      res.status(201).json(runDoc);
    } catch (processErr) {
      next(processErr);
    }
  });
});

// GET /api/results: Retrieve the latest Run
app.get("/api/results", async (req, res, next) => {
  try {
    const latestRun = await Run.findOne().sort({ createdAt: -1 }).lean();
    if (!latestRun) {
      return res.status(404).json({ error: "No analysis runs found" });
    }
    res.json(latestRun);
  } catch (err) {
    next(err);
  }
});

// GET /api/insights: Compute code statistics and retrieve LLM top complaints/praises
app.get("/api/insights", async (req, res, next) => {
  try {
    const latestRun = await Run.findOne().sort({ createdAt: -1 }).lean();
    if (!latestRun) {
      return res.status(404).json({ error: "No analysis runs found" });
    }
    const insights = await getInsights(latestRun.reviews);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:reviewId/reply: Generate suggested reply for a review needing reply, cached in MongoDB
app.post("/api/reviews/:reviewId/reply", async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const latestRun = await Run.findOne().sort({ createdAt: -1 });

    if (!latestRun) {
      return res.status(404).json({ error: "No analysis runs found" });
    }

    const reviewIndex = latestRun.reviews.findIndex(
      (r) => String(r.review_id) === String(reviewId)
    );

    if (reviewIndex === -1) {
      return res.status(404).json({ error: `Review '${reviewId}' not found` });
    }

    const review = latestRun.reviews[reviewIndex];

    // Return 400 if needs_reply is false
    if (!review.analysis || review.analysis.needs_reply !== true) {
      return res.status(400).json({
        error: `Review '${reviewId}' does not require a reply (needs_reply is false)`,
      });
    }

    // If reply is already cached on the review in MongoDB, return it without calling LLM
    if (review.suggestedReply) {
      return res.json({ reply: review.suggestedReply, cached: true });
    }

    // Call LLM to generate reply
    const reply = await generateReviewReply(review);

    // Cache the reply directly on the review document in MongoDB
    latestRun.reviews[reviewIndex].suggestedReply = reply;
    latestRun.markModified("reviews");
    await latestRun.save();

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

// Central error-handling middleware: returns { error } JSON without leaking stack traces or env values
app.use((err, req, res, next) => {
  console.error("Central Error Handler:", err.message);
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    error: err.message || "An unexpected error occurred",
  });
});

async function start() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  start();
}

export default app;
