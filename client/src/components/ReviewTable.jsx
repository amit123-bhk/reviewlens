import { useState, useMemo } from "react";
import { filterReviews } from "../filterReviews.js";

export function ReviewTable({ reviews, onReplyClick }) {
  const [productFilter, setProductFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  // Derive filter options dynamically from data
  const { productOptions, sentimentOptions, topicOptions } = useMemo(() => {
    if (!Array.isArray(reviews)) {
      return { productOptions: [], sentimentOptions: [], topicOptions: [] };
    }

    const products = Array.from(
      new Set(reviews.map((r) => r.product?.trim()).filter(Boolean))
    ).sort();

    const sentiments = Array.from(
      new Set(reviews.map((r) => r.analysis?.sentiment).filter(Boolean))
    ).sort();

    const topics = Array.from(
      new Set(reviews.flatMap((r) => r.analysis?.topics || []))
    ).sort();

    return {
      productOptions: ["all", ...products],
      sentimentOptions: ["all", ...sentiments],
      topicOptions: ["all", ...topics],
    };
  }, [reviews]);

  // Pure client-side filtering function
  const filtered = useMemo(() => {
    return filterReviews(reviews, {
      product: productFilter,
      sentiment: sentimentFilter,
      topic: topicFilter,
    });
  }, [reviews, productFilter, sentimentFilter, topicFilter]);

  return (
    <section className="card table-card">
      <div className="table-toolbar">
        <h3 className="table-title">Reviews ({filtered.length})</h3>

        <div className="table-filters">
          {/* Product Dropdown */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by product"
          >
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All products" : p}
              </option>
            ))}
          </select>

          {/* Sentiment Dropdown */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by sentiment"
          >
            {sentimentOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? "All sentiments"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Topic Dropdown */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="filter-select"
            aria-label="Filter by topic"
          >
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All topics" : t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="reviews-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Sentiment</th>
              <th>Topics</th>
              <th>Summary</th>
              <th>Reply</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-table-cell">
                  No reviews match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((rev, idx) => {
                const hasAnalysis = Boolean(rev.analysis);
                const needsReply = rev.analysis?.needs_reply;
                const isSkipped = rev.status === "skipped_empty";
                const isDuplicate = Boolean(rev.duplicateOf);
                const isFailed =
                  rev.status === "invalid_row" || rev.status === "failed";
                const hasInjection = Boolean(rev.possible_injection);
                const isMismatch =
                  rev.rating !== null &&
                  rev.rating !== undefined &&
                  ((rev.rating >= 4 && rev.analysis?.sentiment === "negative") ||
                    (rev.rating <= 2 && rev.analysis?.sentiment === "positive"));

                // Sentiment representation
                let sentimentContent;
                if (isSkipped) {
                  sentimentContent = (
                    <span className="text-muted">Skipped</span>
                  );
                } else if (isDuplicate) {
                  sentimentContent = (
                    <span className="text-muted">
                      Duplicate of {rev.duplicateOf}
                    </span>
                  );
                } else if (isFailed) {
                  sentimentContent = (
                    <span className="text-muted">Failed</span>
                  );
                } else {
                  const s = rev.analysis?.sentiment;
                  const dotClass =
                    s === "positive"
                      ? "dot dot-pos"
                      : s === "negative"
                      ? "dot dot-neg"
                      : "dot dot-neu";
                  const label = s
                    ? s.charAt(0).toUpperCase() + s.slice(1)
                    : "Neutral";

                  sentimentContent = (
                    <span className="cell-sentiment">
                      <span className={dotClass}></span>
                      <span>{label}</span>
                    </span>
                  );
                }

                // Rating representation
                const ratingDisplay =
                  rev.rating !== null && rev.rating !== undefined
                    ? `${rev.rating}/5`
                    : "N/A";

                // Topics comma-separated
                const topicsDisplay =
                  hasAnalysis && rev.analysis.topics?.length > 0
                    ? rev.analysis.topics.map((t) => t.replace("_", " ")).join(", ")
                    : "N/A";

                return (
                  <tr key={rev.review_id || `row-${idx}`}>
                    <td className="cell-id">
                      <div>{rev.review_id || "N/A"}</div>
                      {hasInjection && (
                        <span
                          className="tag-flag tag-injection"
                          title="Possible prompt injection: phrase like 'ignore previous instructions' detected"
                        >
                          Injection attempt
                        </span>
                      )}
                    </td>
                    <td className="cell-product">{rev.product || "N/A"}</td>
                    <td className="cell-rating">
                      <div>{ratingDisplay}</div>
                      {isMismatch && (
                        <span
                          className="tag-flag tag-mismatch"
                          title="Rating vs Sentiment Mismatch"
                        >
                          Mismatch
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="cell-review" title={rev.text || ""}>
                        {rev.text || "N/A"}
                      </div>
                    </td>
                    <td>{sentimentContent}</td>
                    <td className="cell-topics">{topicsDisplay}</td>
                    <td className="cell-summary">
                      {hasAnalysis ? rev.analysis.summary : "N/A"}
                    </td>
                    <td className="cell-reply">
                      {needsReply ? (
                        <button
                          type="button"
                          className="btn-reply-action"
                          onClick={() => onReplyClick && onReplyClick(rev)}
                        >
                          Suggest reply
                        </button>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
