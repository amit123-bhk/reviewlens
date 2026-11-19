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

  const duplicates = counts?.duplicates ?? cleaningSummary?.duplicates ?? 0;
  const skipped = counts?.skippedEmpty ?? cleaningSummary?.skippedEmpty ?? 0;
  const failed = counts?.failed ?? cleaningSummary?.invalidRows ?? 0;
  const aiCalls = runStats?.aiCalls ?? 0;
  const fromCache = runStats?.cacheHits ?? 0;
  const elapsedMs = runStats?.elapsedMs ?? 0;

  return (
    <>
      {/* 3. Stats Card with 6 columns separated by vertical dividers */}
      <section className="card stats-card">
        <div className="stats-grid">
          <div className="stat-col">
            <span className="stat-label">Total analysed</span>
            <span className="stat-number">{sentimentCounts.total}</span>
          </div>

          <div className="stat-col">
            <span className="stat-label">
              <span className="dot dot-pos"></span> Positive %
            </span>
            <span className="stat-number">{sentimentPercentages.positive}%</span>
          </div>

          <div className="stat-col">
            <span className="stat-label">
              <span className="dot dot-neu"></span> Neutral %
            </span>
            <span className="stat-number">{sentimentPercentages.neutral}%</span>
          </div>

          <div className="stat-col">
            <span className="stat-label">
              <span className="dot dot-neg"></span> Negative %
            </span>
            <span className="stat-number">{sentimentPercentages.negative}%</span>
          </div>

          <div className="stat-col">
            <span className="stat-label">Needs reply</span>
            <span className="stat-number">{needsReplyCount}</span>
          </div>

          <div className="stat-col">
            <span className="stat-label">Rating agreement</span>
            <span className="stat-number">
              {ratingMismatch ? `${ratingMismatch.agreementPercent}%` : "N/A"}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Run Summary Line */}
      <div className="run-summary-line">
        {sentimentCounts.total} analysed · {duplicates} duplicate · {skipped} skipped · {failed} failed · {aiCalls} AI calls · {fromCache} from cache · {elapsedMs} ms
      </div>
    </>
  );
}
