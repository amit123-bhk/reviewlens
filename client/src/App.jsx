import { useState, useEffect } from "react";
import { uploadCsv, fetchResults, fetchInsights, generateReply } from "./api.js";
import { UploadBar } from "./components/UploadBar.jsx";
import { SummaryCards } from "./components/SummaryCards.jsx";
import { TopLists } from "./components/TopLists.jsx";
import { ReviewTable } from "./components/ReviewTable.jsx";
import { ReplyModal } from "./components/ReplyModal.jsx";
import "./App.css";

export default function App() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reply Modal state
  const [activeReview, setActiveReview] = useState(null);
  const [generatedReplies, setGeneratedReplies] = useState({});
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load latest run and insights on page load
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [results, ins] = await Promise.all([
          fetchResults(),
          fetchInsights(),
        ]);
        if (results) setData(results);
        if (ins) setInsights(ins);
      } catch (err) {
        // First run or empty DB, silently show empty state
      }
    }
    loadInitialData();
  }, []);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const uploadResult = await uploadCsv(file);
      setData(uploadResult);

      const ins = await fetchInsights();
      if (ins) setInsights(ins);
    } catch (err) {
      setError(err.message || "Failed to upload and analyze CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReplyModal = async (review) => {
    setActiveReview(review);
    setCopied(false);
    setReplyError(null);

    // If review already has suggestedReply from MongoDB, use it
    if (review.suggestedReply && !generatedReplies[review.review_id]) {
      setGeneratedReplies((prev) => ({
        ...prev,
        [review.review_id]: review.suggestedReply,
      }));
      return;
    }

    if (generatedReplies[review.review_id]) {
      return;
    }

    setReplyLoading(true);
    try {
      const res = await generateReply(review);
      setGeneratedReplies((prev) => ({
        ...prev,
        [review.review_id]: res.reply,
      }));
    } catch (err) {
      setReplyError(err.message || "Could not generate reply. Please try again.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleRegenerateReply = async () => {
    if (!activeReview) return;
    setReplyLoading(true);
    setCopied(false);
    setReplyError(null);
    try {
      const res = await generateReply(activeReview);
      setGeneratedReplies((prev) => ({
        ...prev,
        [activeReview.review_id]: res.reply,
      }));
    } catch (err) {
      setReplyError(err.message || "Could not regenerate reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCopyReply = () => {
    if (!activeReview || !generatedReplies[activeReview.review_id]) return;
    navigator.clipboard.writeText(generatedReplies[activeReview.review_id]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="brand-logo">RL</div>
          <div>
            <h1>ReviewLens</h1>
            <p className="subtitle">AI Review Analytics & Store Owner Action Dashboard</p>
          </div>
        </div>
      </header>

      {/* Upload Bar */}
      <UploadBar onUpload={handleUpload} loading={loading} error={error} />

      {/* Dashboard Body */}
      {data ? (
        <>
          {/* Summary Cards */}
          <SummaryCards
            insights={insights}
            cleaningSummary={data.cleaningSummary}
            runStats={data.runStats}
          />

          {/* Top 3 Complaints and Praises Side-by-Side */}
          <TopLists
            topComplaints={insights?.topComplaints}
            topPraises={insights?.topPraises}
          />

          {/* Filterable Review Table */}
          <ReviewTable
            reviews={data.reviews}
            onReplyClick={handleOpenReplyModal}
          />

          {/* Cost and Speed Footer */}
          {data.runStats && (
            <footer className="cost-speed-footer">
              <div className="footer-stat-item">
                <span className="footer-icon">⚡</span>
                <span className="footer-label">Total Processing Time:</span>
                <strong className="footer-val">{data.runStats.elapsedMs} ms</strong>
              </div>
              <div className="footer-stat-item">
                <span className="footer-icon">🤖</span>
                <span className="footer-label">AI Calls:</span>
                <strong className="footer-val">{data.runStats.aiCalls}</strong>
              </div>
              <div className="footer-stat-item">
                <span className="footer-icon">💾</span>
                <span className="footer-label">Cache Hits:</span>
                <strong className="footer-val">{data.runStats.cacheHits}</strong>
              </div>
              <div className="footer-stat-item">
                <span className="footer-icon">💰</span>
                <span className="footer-label">Cache Efficiency:</span>
                <strong className="footer-val">
                  {Math.round(
                    (data.runStats.cacheHits /
                      (data.runStats.aiCalls + data.runStats.cacheHits || 1)) *
                      100
                  )}
                  % saved
                </strong>
              </div>
            </footer>
          )}
        </>
      ) : (
        /* Empty State before any upload */
        <div className="card empty-state-card">
          <div className="empty-state-content">
            <span className="empty-state-icon">📊</span>
            <h3>No Reviews Analyzed Yet</h3>
            <p>
              Upload your store's <code>reviews.csv</code> file using the form
              above to clean data, extract sentiment, topics, summaries, and
              generate suggested replies.
            </p>
          </div>
        </div>
      )}

      {/* Suggested Reply Modal */}
      <ReplyModal
        review={activeReview}
        reply={activeReview ? generatedReplies[activeReview.review_id] : ""}
        loading={replyLoading}
        error={replyError}
        copied={copied}
        onClose={() => setActiveReview(null)}
        onRegenerate={handleRegenerateReply}
        onCopy={handleCopyReply}
      />
    </div>
  );
}
