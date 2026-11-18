import { describe, it, expect, vi } from "vitest";
import {
  computeStats,
  computeFallbackInsights,
  getLlmInsights,
} from "../src/insights.js";

describe("insights pure stats computation", () => {
  const sampleReviews = [
    {
      review_id: "R001",
      product: "Coffee Mug",
      rating: 5,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "positive",
        topics: ["quality"],
        summary: "Great mug",
        needs_reply: false,
      },
    },
    {
      review_id: "R002",
      product: "Coffee Mug",
      rating: 1,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "negative",
        topics: ["delivery", "support"],
        summary: "Late and broken",
        needs_reply: true,
      },
    },
    {
      review_id: "R003",
      product: "Coffee Mug",
      rating: 3,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "neutral",
        topics: ["price"],
        summary: "Average price",
        needs_reply: false,
      },
    },
    // Duplicate of R001: must be counted only once in sentiment counts
    {
      review_id: "R004",
      product: "Coffee Mug",
      rating: 5,
      status: "ok",
      duplicateOf: "R001",
      analysis: {
        sentiment: "positive",
        topics: ["quality"],
        summary: "Great mug",
        needs_reply: false,
      },
    },
    // Skipped empty
    {
      review_id: "R005",
      product: "Bedsheet",
      rating: 5,
      status: "skipped_empty",
      duplicateOf: null,
    },
    // Analysis failed
    {
      review_id: "R006",
      product: "Bedsheet",
      rating: 2,
      status: "analysis_failed",
      duplicateOf: null,
    },
    // Mismatch: rating 5 (>= 4) but sentiment negative
    {
      review_id: "R007",
      product: "Bedsheet",
      rating: 5,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "negative",
        topics: ["quality"],
        summary: "Terrible quality but gave 5 stars",
        needs_reply: true,
      },
    },
    // Mismatch: rating 1 (<= 2) but sentiment positive
    {
      review_id: "R008",
      product: "Bedsheet",
      rating: 1,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "positive",
        topics: ["quality"],
        summary: "Actually loved it despite 1 star",
        needs_reply: false,
      },
    },
    // Null rating: should be ignored in mismatch calculation
    {
      review_id: "R009",
      product: "Bedsheet",
      rating: null,
      status: "ok",
      duplicateOf: null,
      analysis: {
        sentiment: "positive",
        topics: ["delivery"],
        summary: "Fast shipping",
        needs_reply: false,
      },
    },
  ];

  it("computes counts and percentages over unique analysed reviews only", () => {
    const stats = computeStats(sampleReviews);

    // Unique analysed: R001 (pos), R002 (neg), R003 (neu), R007 (neg), R008 (pos), R009 (pos) = 6 total
    // Positives: R001, R008, R009 = 3 (50%)
    // Negatives: R002, R007 = 2 (33%)
    // Neutrals: R003 = 1 (17%)
    expect(stats.sentimentCounts).toEqual({
      positive: 3,
      neutral: 1,
      negative: 2,
      total: 6,
    });

    expect(stats.sentimentPercentages.positive).toBe(50);
    expect(stats.sentimentPercentages.negative).toBe(33);
    expect(stats.sentimentPercentages.neutral).toBe(17);
  });

  it("computes needsReplyCount and pipeline counts", () => {
    const stats = computeStats(sampleReviews);

    // R002 (true), R007 (true) -> 2
    expect(stats.needsReplyCount).toBe(2);
    expect(stats.counts).toEqual({
      skippedEmpty: 1, // R005
      duplicates: 1,   // R004
      failed: 1,       // R006
    });
  });

  it("builds topic x sentiment matrix", () => {
    const stats = computeStats(sampleReviews);

    expect(stats.topicBySentiment.quality).toEqual({
      positive: 2, // R001, R008
      neutral: 0,
      negative: 1, // R007
    });

    expect(stats.topicBySentiment.delivery).toEqual({
      positive: 1, // R009
      neutral: 0,
      negative: 1, // R002
    });
  });

  it("builds per-product sentiment split", () => {
    const stats = computeStats(sampleReviews);

    // Coffee Mug unique: R001 (pos), R002 (neg), R003 (neu) = 3 total
    expect(stats.productSentiment["Coffee Mug"]).toEqual({
      positive: 1,
      neutral: 1,
      negative: 1,
      total: 3,
    });

    // Bedsheet unique: R007 (neg), R008 (pos), R009 (pos) = 3 total
    expect(stats.productSentiment["Bedsheet"]).toEqual({
      positive: 2,
      neutral: 0,
      negative: 1,
      total: 3,
    });
  });

  it("detects rating-vs-sentiment mismatches and calculates agreementPercent", () => {
    const stats = computeStats(sampleReviews);

    // Rated unique: R001 (5, pos), R002 (1, neg), R003 (3, neu), R007 (5, neg - MISMATCH), R008 (1, pos - MISMATCH)
    // R009 has rating: null -> ignored
    // Total rated = 5
    // Mismatches = 2 (R007, R008)
    // Agreement = (5 - 2) / 5 = 60%
    const { mismatches, mismatchCount, ratedCount, agreementPercent } =
      stats.ratingMismatch;

    expect(ratedCount).toBe(5);
    expect(mismatchCount).toBe(2);
    expect(agreementPercent).toBe(60);

    const mismatchIds = mismatches.map((m) => m.review_id);
    expect(mismatchIds).toContain("R007");
    expect(mismatchIds).toContain("R008");
  });
});

describe("insights LLM and fallback generation", () => {
  const reviews = [
    {
      review_id: "R001",
      status: "ok",
      analysis: {
        sentiment: "negative",
        topics: ["delivery"],
        summary: "Package took 3 weeks to arrive.",
      },
    },
    {
      review_id: "R002",
      status: "ok",
      analysis: {
        sentiment: "positive",
        topics: ["quality"],
        summary: "Super soft bedsheets.",
      },
    },
  ];

  it("falls back to top topics by count when LLM fails or is invalid", async () => {
    const failingLlm = vi.fn(async () => {
      throw new Error("LLM failure");
    });

    const insights = await getLlmInsights(reviews, {
      llm: failingLlm,
      cacheModel: null,
    });

    expect(insights.topComplaints.length).toBeGreaterThan(0);
    expect(insights.topComplaints[0].title).toBe("delivery");
    expect(insights.topPraises.length).toBeGreaterThan(0);
    expect(insights.topPraises[0].title).toBe("quality");
  });

  it("parses valid LLM output and caches it", async () => {
    const mockCache = {
      store: new Map(),
      findOne: vi.fn(async ({ key }) => mockCache.store.get(key)),
      create: vi.fn(async ({ key, topComplaints, topPraises }) => {
        mockCache.store.set(key, { topComplaints, topPraises });
      }),
    };

    const mockLlm = vi.fn(async () => {
      return JSON.stringify({
        topComplaints: [{ title: "Slow Shipping", explanation: "Delays reported" }],
        topPraises: [{ title: "Soft Fabric", explanation: "Great texture" }],
      });
    });

    // Run 1: calls LLM and writes to cache
    const run1 = await getLlmInsights(reviews, {
      llm: mockLlm,
      cacheModel: mockCache,
    });

    expect(mockLlm).toHaveBeenCalledTimes(1);
    expect(run1.topComplaints[0].title).toBe("Slow Shipping");
    expect(run1.topPraises[0].title).toBe("Soft Fabric");
    expect(mockCache.store.size).toBe(1);

    // Run 2: served from cache without calling LLM
    const run2 = await getLlmInsights(reviews, {
      llm: mockLlm,
      cacheModel: mockCache,
    });

    expect(mockLlm).toHaveBeenCalledTimes(1); // not called again
    expect(run2.topComplaints[0].title).toBe("Slow Shipping");
  });
});
