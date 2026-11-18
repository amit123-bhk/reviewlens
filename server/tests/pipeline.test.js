import { describe, it, expect, vi } from "vitest";
import { processUpload } from "../src/pipeline.js";

describe("pipeline module", () => {
  function createFakeCache() {
    const store = new Map();
    return {
      store,
      getMany: vi.fn(async (keys) => {
        const result = new Map();
        for (const k of keys) {
          if (store.has(k)) {
            result.set(k, store.get(k));
          }
        }
        return result;
      }),
      saveMany: vi.fn(async (entries) => {
        for (const { key, analysis } of entries) {
          store.set(key, analysis);
        }
      }),
    };
  }

  it("first run makes LLM calls and caches; second run achieves 0 aiCalls and full cacheHits", async () => {
    // 3 unique valid reviews, 1 duplicate (R004 dup of R001), 1 empty (R005)
    const csvContent = `review_id,rating,text
R001,5,"Awesome cotton sheets"
R002,2,"Delivery was super delayed"
R003,4,"Decent quality mug"
R004,5,"Awesome cotton sheets"
R005,5,"   "`;

    let totalLlmCalls = 0;
    const mockLlm = vi.fn(async ({ user }) => {
      totalLlmCalls += 1;
      const ids = [...user.matchAll(/<review id="([^"]+)">/g)].map((m) => m[1]);
      return JSON.stringify({
        results: ids.map((id) => ({
          id,
          sentiment: id === "R002" ? "negative" : "positive",
          topics: id === "R002" ? ["delivery"] : ["quality"],
          summary: `Summary for ${id}`,
          needs_reply: id === "R002",
        })),
      });
    });

    const fakeCache = createFakeCache();

    // === RUN 1 ===
    const run1 = await processUpload(csvContent, {
      llm: mockLlm,
      cache: fakeCache,
    });

    expect(run1.cleaningSummary.total).toBe(5);
    expect(run1.cleaningSummary.valid).toBe(3); // R001, R002, R003
    expect(run1.cleaningSummary.duplicates).toBe(1); // R004
    expect(run1.cleaningSummary.skippedEmpty).toBe(1); // R005

    expect(run1.runStats.aiCalls).toBe(1);
    expect(run1.runStats.cacheHits).toBe(0);

    // Verify duplicate R004 copied analysis from R001
    const r001 = run1.reviews.find((r) => r.review_id === "R001");
    const r004 = run1.reviews.find((r) => r.review_id === "R004");
    expect(r001.status).toBe("ok");
    expect(r004.status).toBe("ok");
    expect(r004.duplicateOf).toBe("R001");
    expect(r004.analysis).toEqual(r001.analysis);

    // Verify R005 was skipped
    const r005 = run1.reviews.find((r) => r.review_id === "R005");
    expect(r005.status).toBe("skipped_empty");
    expect(r005.analysis).toBeUndefined();

    // Verify cache store now has the 3 unique valid reviews
    expect(fakeCache.store.size).toBe(3);

    // === RUN 2 (identical CSV) ===
    const run2 = await processUpload(csvContent, {
      llm: mockLlm,
      cache: fakeCache,
    });

    // aiCalls must be 0, cacheHits must equal unique valid count (3)
    expect(run2.runStats.aiCalls).toBe(0);
    expect(run2.runStats.cacheHits).toBe(3);
    // mockLlm was NOT called again during run 2
    expect(mockLlm).toHaveBeenCalledTimes(1);

    // Duplicate R004 still receives analysis from R001
    const r004Run2 = run2.reviews.find((r) => r.review_id === "R004");
    expect(r004Run2.status).toBe("ok");
    expect(r004Run2.analysis.summary).toBe("Summary for R001");
  });
});
