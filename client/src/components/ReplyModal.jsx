export function ReplyModal({
  review,
  reply,
  loading,
  error,
  copied,
  onClose,
  onRegenerate,
  onCopy,
}) {
  if (!review) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Suggested Customer Reply</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-review-summary">
            <p>
              <strong>Review ID:</strong> {review.review_id} |{" "}
              <strong>Product:</strong> {review.product || "Product"}
            </p>
            <p className="modal-quote">"{review.text}"</p>
            <p className="modal-analysis">
              <strong>Detected Sentiment:</strong> {review.analysis?.sentiment} |{" "}
              <strong>Topics:</strong> {(review.analysis?.topics || []).join(", ")}
            </p>
          </div>

          <div className="modal-reply-box">
            <label>AI-Generated Reply Draft:</label>
            {loading ? (
              <div className="reply-generating">
                <div className="spinner-sm"></div>
                <span>Drafting courteous reply...</span>
              </div>
            ) : error ? (
              <div className="reply-error" style={{ color: "#dc2626", padding: "8px 0" }}>
                <span>⚠️ {error}</span>
              </div>
            ) : (
              <textarea
                readOnly
                className="reply-textarea"
                rows="4"
                value={reply || "No reply generated."}
              />
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onRegenerate}
            disabled={loading}
          >
            Regenerate
          </button>
          <button
            className="btn btn-primary"
            onClick={onCopy}
            disabled={loading || Boolean(error) || !reply}
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
