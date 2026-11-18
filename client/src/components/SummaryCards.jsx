export function SummaryCards({ insights, cleaningSummary, runStats }) {
  if (!insights) {
    return null;
  }

  const {
    sentimentCounts,
    sentimentPercentages,
    needsReplyCount,
    counts,
    ratingMismatch,
  } = insights;

  return (
    <div className="summary-wrapper">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Analysed</span>
          <span className="stat-value">{sentimentCounts.total}</span>
          <span className="stat-sub">Unique valid reviews</span>
        </div>

        <div className="stat-card stat-positive">
          <span className="stat-label">Positive Sentiment</span>
          <span className="stat-value">{sentimentPercentages.positive}%</span>
          <span className="stat-sub">{sentimentCounts.positive} reviews</span>
        </div>

        <div className="stat-card stat-neutral">
          <span className="stat-label">Neutral Sentiment</span>
          <span className="stat-value">{sentimentPercentages.neutral}%</span>
          <span className="stat-sub">{sentimentCounts.neutral} reviews</span>
        </div>

        <div className="stat-card stat-negative">
          <span className="stat-label">Negative Sentiment</span>
          <span className="stat-value">{sentimentPercentages.negative}%</span>
          <span className="stat-sub">{sentimentCounts.negative} reviews</span>
        </div>

        <div className="stat-card stat-reply">
          <span className="stat-label">Needs Reply</span>
          <span className="stat-value">{needsReplyCount}</span>
          <span className="stat-sub">Action required</span>
        </div>

        {ratingMismatch && (
          <div className="stat-card stat-tech">
            <span className="stat-label">Rating Agreement</span>
            <span className="stat-value">{ratingMismatch.agreementPercent}%</span>
            <span className="stat-sub">{ratingMismatch.mismatchCount} mismatches flagged</span>
          </div>
        )}

        {runStats && (
          <div className="stat-card stat-tech">
            <span className="stat-label">AI Calls / Cache</span>
            <span className="stat-value">
              {runStats.aiCalls} / {runStats.cacheHits}
            </span>
            <span className="stat-sub">{runStats.elapsedMs}ms execution time</span>
          </div>
        )}
      </div>

      {/* Small counts bar for skipped, duplicates, failed */}
      <div className="cleaning-bar">
        <span>
          <strong>Pipeline Cleaning Summary:</strong>
        </span>
        <span className="badge badge-valid">
          Valid Analysed: {sentimentCounts.total}
        </span>
        <span className="badge badge-dup">
          Duplicates Flagged: {counts?.duplicates ?? cleaningSummary?.duplicates ?? 0}
        </span>
        <span className="badge badge-skipped">
          Skipped Empty: {counts?.skippedEmpty ?? cleaningSummary?.skippedEmpty ?? 0}
        </span>
        <span className="badge badge-invalid">
          Analysis Failed: {counts?.failed ?? cleaningSummary?.invalidRows ?? 0}
        </span>
      </div>
    </div>
  );
}
