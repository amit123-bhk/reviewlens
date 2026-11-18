/**
 * Pure function to filter reviews client-side based on product, sentiment, topic, and search term.
 */
export function filterReviews(
  reviews,
  { product = "all", sentiment = "all", topic = "all", search = "" } = {}
) {
  if (!Array.isArray(reviews)) return [];

  const q = search.toLowerCase().trim();

  return reviews.filter((r) => {
    // Search term matching across id, product, text, and summary
    if (q) {
      const idMatch = (r.review_id || "").toLowerCase().includes(q);
      const productMatch = (r.product || "").toLowerCase().includes(q);
      const textMatch = (r.text || "").toLowerCase().includes(q);
      const summaryMatch = (r.analysis?.summary || "").toLowerCase().includes(q);
      if (!idMatch && !productMatch && !textMatch && !summaryMatch) return false;
    }

    // Product filter
    if (product !== "all") {
      if ((r.product || "").trim() !== product) return false;
    }

    // Sentiment filter
    if (sentiment !== "all") {
      if (!r.analysis || r.analysis.sentiment !== sentiment) return false;
    }

    // Topic filter
    if (topic !== "all") {
      if (!r.analysis || !(r.analysis.topics || []).includes(topic)) {
        return false;
      }
    }

    return true;
  });
}
