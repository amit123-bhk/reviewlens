import { cleanCsv } from "./csvCleaner.js";
import { computeCacheKey } from "./hash.js";
import { analyzeReviews } from "./analyzer.js";
import { callLLM } from "./llmClient.js";
import * as defaultCache from "./cache.js";

export async function processUpload(
  csvBuffer,
  { llm = callLLM, cache = defaultCache } = {}
) {
  const startTime = Date.now();

  // 1. Clean the CSV
  const allRows = cleanCsv(csvBuffer);

  const cleaningSummary = {
    total: allRows.length,
    valid: allRows.filter((r) => r.status === "valid" && !r.duplicateOf).length,
    skippedEmpty: allRows.filter((r) => r.status === "skipped_empty").length,
    invalidRows: allRows.filter((r) => r.status === "invalid_row").length,
    duplicates: allRows.filter((r) => Boolean(r.duplicateOf)).length,
  };

  // 2. Identify unique valid reviews (excluding duplicates, skipped, and invalid rows)
  const uniqueValidRows = allRows.filter(
    (r) => r.status === "valid" && !r.duplicateOf
  );

  for (const row of uniqueValidRows) {
    row.cacheKey = computeCacheKey(row.text);
  }

  const cacheKeys = uniqueValidRows.map((r) => r.cacheKey);
  const cachedMap = await cache.getMany(cacheKeys);

  let cacheHits = 0;
  const uncachedRows = [];

  for (const row of uniqueValidRows) {
    if (cachedMap.has(row.cacheKey)) {
      cacheHits += 1;
      row.status = "ok";
      row.analysis = cachedMap.get(row.cacheKey);
    } else {
      uncachedRows.push(row);
    }
  }

  // 3. Analyse uncached rows in batches of 5 with retry
  let aiCalls = 0;
  if (uncachedRows.length > 0) {
    const analysisResults = await analyzeReviews(uncachedRows, { llm });
    aiCalls = analysisResults.stats?.aiCalls || 0;

    const newCacheEntries = [];

    for (const row of uncachedRows) {
      const res = analysisResults.get(row.review_id);
      if (res && res.status === "ok" && res.analysis) {
        row.status = "ok";
        row.analysis = res.analysis;
        newCacheEntries.push({
          key: row.cacheKey,
          analysis: res.analysis,
        });
      } else {
        row.status = "analysis_failed";
        row.analysis = null;
      }
    }

    // 4. Save new successful analyses to cache
    if (newCacheEntries.length > 0) {
      await cache.saveMany(newCacheEntries);
    }
  }

  // 5. Duplicates copy the analysis and status from their original review
  const reviewsById = new Map(allRows.map((r) => [r.review_id, r]));

  for (const row of allRows) {
    if (row.duplicateOf) {
      const original = reviewsById.get(row.duplicateOf);
      if (original) {
        row.status = original.status;
        row.analysis = original.analysis ? { ...original.analysis } : null;
      } else {
        row.status = "analysis_failed";
        row.analysis = null;
      }
    }
  }

  // Clean temporary internal cacheKey property before returning
  for (const row of allRows) {
    delete row.cacheKey;
  }

  const elapsedMs = Date.now() - startTime;

  return {
    reviews: allRows,
    cleaningSummary,
    runStats: {
      aiCalls,
      cacheHits,
      elapsedMs,
    },
  };
}
