export const ALLOWED_SENTIMENTS = Object.freeze(["positive", "neutral", "negative"]);

export const ALLOWED_TOPICS = Object.freeze([
  "quality",
  "delivery",
  "price",
  "packaging",
  "support",
  "size_fit",
  "other",
]);

export function validateAnalysis(obj) {
  const errors = [];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {
      ok: false,
      errors: ["Input must be a plain object"],
      value: null,
    };
  }

  // Sentiment check
  if (typeof obj.sentiment !== "string" || !ALLOWED_SENTIMENTS.includes(obj.sentiment)) {
    errors.push(`sentiment must be one of: ${ALLOWED_SENTIMENTS.join(", ")}`);
  }

  // Topics check: non-empty array of allowed values, deduplicated
  let cleanTopics = [];
  if (!Array.isArray(obj.topics) || obj.topics.length === 0) {
    errors.push("topics must be a non-empty array");
  } else {
    cleanTopics = [...new Set(obj.topics)];
    const invalidTopics = cleanTopics.filter((t) => !ALLOWED_TOPICS.includes(t));
    if (invalidTopics.length > 0) {
      errors.push(`Invalid topic(s): ${invalidTopics.join(", ")}`);
    }
  }

  // Summary check: non-empty string, trimmed, max 200 chars, no newlines
  let cleanSummary = "";
  if (typeof obj.summary !== "string") {
    errors.push("summary must be a string");
  } else {
    cleanSummary = obj.summary.trim();
    if (cleanSummary.length === 0) {
      errors.push("summary cannot be empty");
    } else if (cleanSummary.length > 200) {
      errors.push("summary exceeds 200 characters");
    } else if (/[\r\n]/.test(cleanSummary)) {
      errors.push("summary must not contain newlines");
    }
  }

  // needs_reply check: strict boolean
  if (typeof obj.needs_reply !== "boolean") {
    errors.push("needs_reply must be a boolean");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      value: null,
    };
  }

  return {
    ok: true,
    errors: [],
    value: {
      sentiment: obj.sentiment,
      topics: cleanTopics,
      summary: cleanSummary,
      needs_reply: obj.needs_reply,
    },
  };
}
