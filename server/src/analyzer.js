import { callLLM } from "./llmClient.js";
import { SYSTEM_PROMPT, buildBatchPrompt } from "./prompts.js";
import { validateAnalysis } from "./schema.js";

export const BATCH_SIZE = 5;

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function analyzeReviews(reviews, { llm = callLLM } = {}) {
  const results = new Map();
  let aiCalls = 0;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    results.stats = { aiCalls: 0 };
    results.results = results;
    return results;
  }

  const chunks = chunkArray(reviews, BATCH_SIZE);
  const toRetry = [];

  for (const chunk of chunks) {
    const userPrompt = buildBatchPrompt(chunk);
    let rawResponse;

    try {
      aiCalls += 1;
      rawResponse = await llm({ system: SYSTEM_PROMPT, user: userPrompt });
    } catch (err) {
      // If callLLM itself fails after its retries, mark all in chunk as failed
      for (const rev of chunk) {
        const id = rev.review_id ?? rev.id;
        results.set(id, { status: "analysis_failed" });
      }
      continue;
    }

    let parsedResults = null;
    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed && Array.isArray(parsed.results)) {
        parsedResults = parsed.results;
      }
    } catch (e) {
      parsedResults = null;
    }

    for (const rev of chunk) {
      const id = rev.review_id ?? rev.id;
      if (!parsedResults) {
        toRetry.push(rev);
        continue;
      }

      const match = parsedResults.find((item) => item && String(item.id) === String(id));
      if (!match) {
        toRetry.push(rev);
        continue;
      }

      const validation = validateAnalysis(match);
      if (validation.ok) {
        results.set(id, { status: "ok", analysis: validation.value });
      } else {
        toRetry.push(rev);
      }
    }
  }

  // Retry any failed/missing reviews once as new batch(es)
  if (toRetry.length > 0) {
    const retryChunks = chunkArray(toRetry, BATCH_SIZE);

    for (const retryChunk of retryChunks) {
      const userPrompt = buildBatchPrompt(retryChunk);
      let rawResponse;

      try {
        aiCalls += 1;
        rawResponse = await llm({ system: SYSTEM_PROMPT, user: userPrompt });
      } catch (err) {
        for (const rev of retryChunk) {
          const id = rev.review_id ?? rev.id;
          results.set(id, { status: "analysis_failed" });
        }
        continue;
      }

      let parsedResults = null;
      try {
        const parsed = JSON.parse(rawResponse);
        if (parsed && Array.isArray(parsed.results)) {
          parsedResults = parsed.results;
        }
      } catch (e) {
        parsedResults = null;
      }

      for (const rev of retryChunk) {
        const id = rev.review_id ?? rev.id;
        if (!parsedResults) {
          results.set(id, { status: "analysis_failed" });
          continue;
        }

        const match = parsedResults.find((item) => item && String(item.id) === String(id));
        if (!match) {
          results.set(id, { status: "analysis_failed" });
          continue;
        }

        const validation = validateAnalysis(match);
        if (validation.ok) {
          results.set(id, { status: "ok", analysis: validation.value });
        } else {
          results.set(id, { status: "analysis_failed" });
        }
      }
    }
  }

  results.stats = { aiCalls };
  results.results = results;
  return results;
}
