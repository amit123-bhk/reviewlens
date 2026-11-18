import { AnalysisCache } from "./models/AnalysisCache.js";

export async function getMany(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return new Map();
  }

  const docs = await AnalysisCache.find({ key: { $in: keys } }).lean();
  const map = new Map();

  for (const doc of docs) {
    map.set(doc.key, {
      sentiment: doc.analysis.sentiment,
      topics: doc.analysis.topics,
      summary: doc.analysis.summary,
      needs_reply: doc.analysis.needs_reply,
    });
  }

  return map;
}

export async function saveMany(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return;
  }

  // Only cache valid "ok" results with complete 4-field analysis, never failures
  const validEntries = entries.filter((e) => {
    return (
      e &&
      typeof e.key === "string" &&
      e.analysis &&
      typeof e.analysis.sentiment === "string" &&
      Array.isArray(e.analysis.topics) &&
      typeof e.analysis.summary === "string" &&
      typeof e.analysis.needs_reply === "boolean"
    );
  });

  if (validEntries.length === 0) {
    return;
  }

  const operations = validEntries.map(({ key, analysis }) => ({
    updateOne: {
      filter: { key },
      update: {
        $setOnInsert: {
          key,
          analysis: {
            sentiment: analysis.sentiment,
            topics: analysis.topics,
            summary: analysis.summary,
            needs_reply: analysis.needs_reply,
          },
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  await AnalysisCache.bulkWrite(operations, { ordered: false });
}
