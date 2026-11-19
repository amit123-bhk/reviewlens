import { useState, useEffect } from "react";
import { uploadCsv, fetchResults, fetchInsights, generateReply } from "./api.js";
import { UploadBar } from "./components/UploadBar.jsx";
import { SummaryCards } from "./components/SummaryCards.jsx";
import { TopLists } from "./components/TopLists.jsx";
import { ReviewTable } from "./components/ReviewTable.jsx";
import { ReplyDrawer } from "./components/ReplyDrawer.jsx";
import "./App.css";

export default function App() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reply Drawer state
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
      } catch {
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

  const handleCopyReply = (textToCopy) => {
    const text =
      textToCopy || (activeReview && generatedReplies[activeReview.review_id]);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasData = Boolean(data && data.reviews && data.reviews.length > 0 && insights);

  return (
    <div className="app-container">
      {/* 1. Header */}
      <header className="header">
        <div className="brand-logo">RL</div>
        <div className="header-text">
          <h1 className="header-title">ReviewLens</h1>
          <p className="header-subtitle">
            Customer review sentiment and reply drafting
          </p>
        </div>
      </header>

      {/* 2. Upload Bar */}
      <UploadBar onUpload={handleUpload} loading={loading} error={error} />

      {/* 8. Empty State or Dashboard Content */}
      {hasData ? (
        <>
          {/* 3 & 4. Stats and Run Summary Line */}
          <SummaryCards
            insights={insights}
            cleaningSummary={data.cleaningSummary}
            runStats={data.runStats}
          />

          {/* 5. Top 3 Complaints & Praises */}
          <TopLists
            topComplaints={insights.topComplaints}
            topPraises={insights.topPraises}
          />

          {/* 6. Reviews Table */}
          <ReviewTable
            reviews={data.reviews}
            onReplyClick={handleOpenReplyModal}
          />
        </>
      ) : (
        <div className="empty-state">Upload a CSV to see insights</div>
      )}

      {/* 7. Reply Drawer */}
      <ReplyDrawer
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
