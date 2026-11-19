import { useState, useMemo } from "react";
import { filterReviews } from "../filterReviews.js";

export function ReviewTable({ reviews, onReplyClick }) {
  const [search, setSearch] = useState("");
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
      search,
    });
  }, [reviews, productFilter, sentimentFilter, topicFilter, search]);

  return (
    <section className="card table-card">
      <div className="table-header">
        <h2>Reviews Breakdown ({filtered.length})</h2>

        <div className="filter-bar">
          <input
            type="text"
            className="input-search"
            placeholder="Search reviews, IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Product Dropdown */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="filter-select"
          >
            {productOptions.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All Products" : p}
              </option>
            ))}
          </select>

          {/* Sentiment Dropdown */}
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="filter-select"
          >
            {sentimentOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Sentiments" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Topic Dropdown */}
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="filter-select"
          >
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Topics" : t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="reviews-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Review Text</th>
              <th>Sentiment</th>
              <th>Topics</th>
              <th>Summary</th>
              <th>Needs Reply</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-table">
                  No reviews match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((rev, idx) => {
                const hasAnalysis = Boolean(rev.analysis);
                const sentiment = rev.analysis?.sentiment || rev.status;
                const needsReply = rev.analysis?.needs_reply;
                const hasCachedReply = Boolean(rev.suggestedReply);
                const hasInjection = Boolean(rev.possible_injection);
                const isMismatch =
                  rev.rating !== null &&
                  rev.rating !== undefined &&
                  ((rev.rating >= 4 && rev.analysis?.sentiment === "negative") ||
                    (rev.rating <= 2 && rev.analysis?.sentiment === "positive"));

                return (
                  <tr key={rev.review_id || `row-${idx}`}>
                    {/* Review ID */}
                    <td className="cell-id">
                      <div className="id-title-row">
                        <strong>{rev.review_id || "N/A"}</strong>
                        {hasInjection && (
                          <span
                            className="warning-icon injection-icon"
                            title="Possible prompt injection: phrase like 'ignore previous instructions' detected"
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                      {rev.duplicateOf && (
                        <span className="badge-tag tag-dup">dup of {rev.duplicateOf}</span>
                      )}
                      {rev.status === "skipped_empty" && (
                        <span className="badge-tag tag-skipped">empty</span>
                      )}
                      {hasInjection && (
                        <span className="badge-tag tag-injection">injection attempt</span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="cell-product">{rev.product || "—"}</td>

                    {/* Rating or "—" */}
                    <td className="cell-rating">
                      {rev.rating !== null && rev.rating !== undefined ? (
                        <span className="star-rating">★ {rev.rating}</span>
                      ) : (
                        <span className="no-rating">—</span>
                      )}
                      {isMismatch && (
                        <span
                          className="badge-tag tag-mismatch"
                          title="Rating vs Sentiment Mismatch"
                        >
                          ⚠️ Mismatch
                        </span>
                      )}
                    </td>

                    {/* Review text */}
                    <td className="cell-text">
                      <span title={rev.text}>
                        {rev.text || <em className="muted">Empty review text</em>}
                      </span>
                    </td>

                    {/* Sentiment Badge */}
                    <td className="cell-sentiment">
                      <span className={`badge-sentiment sentiment-${sentiment}`}>
                        {sentiment}
                      </span>
                    </td>

                    {/* Topic Chips */}
                    <td className="cell-topics">
                      {hasAnalysis && rev.analysis.topics?.length > 0 ? (
                        rev.analysis.topics.map((t) => (
                          <span key={t} className="topic-pill">
                            {t.replace("_", " ")}
                          </span>
                        ))
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    {/* Summary */}
                    <td className="cell-summary">
                      {hasAnalysis ? (
                        <span>{rev.analysis.summary}</span>
                      ) : (
                        <em className="muted">{rev.status}</em>
                      )}
                    </td>

                    {/* Needs-Reply Flag */}
                    <td className="cell-reply-flag">
                      {hasAnalysis ? (
                        needsReply ? (
                          <span className="badge-reply-yes">Yes</span>
                        ) : (
                          <span className="badge-reply-no">No</span>
                        )
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    {/* Action: Suggest reply button on rows with needs_reply */}
                    <td className="cell-action">
                      {needsReply ? (
                        <button
                          className="btn-reply btn-reply-urgent"
                          onClick={() => onReplyClick && onReplyClick(rev)}
                        >
                          {hasCachedReply ? "View reply" : "Suggest reply"}
                        </button>
                      ) : (
                        <span className="muted">—</span>
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
