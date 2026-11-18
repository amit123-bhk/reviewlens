import { parse } from "csv-parse/sync";

function stripHtml(text) {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function parseRating(rating) {
  if (rating === null || rating === undefined) return null;
  const str = String(rating).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export function cleanCsv(csvInput) {
  if (!csvInput) return [];
  const content = typeof csvInput === "string" ? csvInput : csvInput.toString("utf-8");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  const seenTexts = new Map();

  return records.map((record) => {
    const rawId = record.review_id ?? record.id;
    const reviewId = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
    const rawText = record.text ?? record.review_text ?? record.review ?? "";
    const cleanedText = stripHtml(String(rawText));
    const rating = parseRating(record.rating);

    if (!reviewId) {
      return {
        ...record,
        review_id: null,
        rating,
        text: cleanedText,
        status: "invalid_row",
        duplicateOf: null,
      };
    }

    if (!cleanedText) {
      return {
        ...record,
        review_id: reviewId,
        rating,
        text: "",
        status: "skipped_empty",
        duplicateOf: null,
      };
    }

    const normalizedText = cleanedText.toLowerCase();
    let duplicateOf = null;
    if (seenTexts.has(normalizedText)) {
      duplicateOf = seenTexts.get(normalizedText);
    } else {
      seenTexts.set(normalizedText, reviewId);
    }

    return {
      ...record,
      review_id: reviewId,
      rating,
      text: cleanedText,
      status: "valid",
      duplicateOf,
    };
  });
}
