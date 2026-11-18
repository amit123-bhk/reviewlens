import { describe, it, expect } from "vitest";
import {
  ALLOWED_SENTIMENTS,
  ALLOWED_TOPICS,
  validateAnalysis,
} from "../src/schema.js";

describe("schema validation", () => {
  it("exports allowed sentiments and topics", () => {
    expect(ALLOWED_SENTIMENTS).toEqual(["positive", "neutral", "negative"]);
    expect(ALLOWED_TOPICS).toEqual([
      "quality",
      "delivery",
      "price",
      "packaging",
      "support",
      "size_fit",
      "other",
    ]);
  });

  it("passes for a valid object", () => {
    const input = {
      sentiment: "positive",
      topics: ["quality", "delivery"],
      summary: "Great shoes with fast shipping.",
      needs_reply: false,
    };

    const result = validateAnalysis(input);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({
      sentiment: "positive",
      topics: ["quality", "delivery"],
      summary: "Great shoes with fast shipping.",
      needs_reply: false,
    });
  });

  it("fails when sentiment is invalid", () => {
    const input = {
      sentiment: "super_happy",
      topics: ["quality"],
      summary: "Great product.",
      needs_reply: false,
    };

    const result = validateAnalysis(input);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.value).toBeNull();
  });

  it("fails when topics array is empty", () => {
    const input = {
      sentiment: "neutral",
      topics: [],
      summary: "Average product.",
      needs_reply: false,
    };

    const result = validateAnalysis(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("topics must be a non-empty array");
    expect(result.value).toBeNull();
  });

  it("fails when topic is unknown", () => {
    const input = {
      sentiment: "positive",
      topics: ["quality", "unknown_topic"],
      summary: "Good stuff.",
      needs_reply: false,
    };

    const result = validateAnalysis(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid topic(s)"))).toBe(true);
    expect(result.value).toBeNull();
  });

  it("fails when needs_reply is not a real boolean (e.g. 'yes' or 'true')", () => {
    const inputWithYes = {
      sentiment: "negative",
      topics: ["support"],
      summary: "Bad support.",
      needs_reply: "yes",
    };

    const resultYes = validateAnalysis(inputWithYes);
    expect(resultYes.ok).toBe(false);
    expect(resultYes.errors).toContain("needs_reply must be a boolean");

    const inputWithTrueString = {
      sentiment: "negative",
      topics: ["support"],
      summary: "Bad support.",
      needs_reply: "true",
    };

    const resultTrue = validateAnalysis(inputWithTrueString);
    expect(resultTrue.ok).toBe(false);
    expect(resultTrue.errors).toContain("needs_reply must be a boolean");
  });

  it("strips extra fields and dedupes topics in returned value", () => {
    const input = {
      sentiment: "positive",
      topics: ["quality", "quality", "price"],
      summary: "  Affordable and durable.  ",
      needs_reply: false,
      extra_field: "unexpected data",
      random_metadata: 12345,
    };

    const result = validateAnalysis(input);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({
      sentiment: "positive",
      topics: ["quality", "price"],
      summary: "Affordable and durable.",
      needs_reply: false,
    });
    expect(Object.keys(result.value)).toEqual([
      "sentiment",
      "topics",
      "summary",
      "needs_reply",
    ]);
  });

  it("fails on null or non-object input without throwing", () => {
    expect(() => validateAnalysis(null)).not.toThrow();
    expect(validateAnalysis(null)).toEqual({
      ok: false,
      errors: ["Input must be a plain object"],
      value: null,
    });

    expect(() => validateAnalysis(undefined)).not.toThrow();
    expect(validateAnalysis(undefined).ok).toBe(false);

    expect(() => validateAnalysis("string")).not.toThrow();
    expect(validateAnalysis("string").ok).toBe(false);

    expect(() => validateAnalysis([1, 2, 3])).not.toThrow();
    expect(validateAnalysis([1, 2, 3]).ok).toBe(false);
  });
});
