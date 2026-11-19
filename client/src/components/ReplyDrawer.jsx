import { useState } from "react";

export function ReplyDrawer({
  review,
  reply,
  loading,
  error,
  copied,
  onClose,
  onRegenerate,
  onCopy,
}) {
  const [userText, setUserText] = useState(null);

  if (!review) {
    return null;
  }

  const currentReplyText = userText !== null ? userText : (reply || "");

  const handleCopyClick = () => {
    if (onCopy) {
      onCopy(currentReplyText);
    }
  };

  const handleClose = () => {
    setUserText(null);
    onClose();
  };

  return (
    <>
      {/* Transparent overlay that closes on click */}
      <div
        className="drawer-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 7. Reply Drawer (slides in from right, 420px wide) */}
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-heading"
      >
        <div className="drawer-header">
          <h3 id="drawer-heading" className="drawer-title">
            Suggested reply
          </h3>
          <button
            type="button"
            className="btn-text text-muted"
            onClick={handleClose}
            aria-label="Close drawer"
          >
            Close
          </button>
        </div>

        {/* Original Review Text in --bg box */}
        <div className="drawer-review-box">
          <strong>Review ({review.product || "Product"}):</strong>
          <p>{review.text || "No review text available."}</p>
        </div>

        {/* Loading state: plain text */}
        {loading && (
          <div className="drawer-loading">Generating reply…</div>
        )}

        {/* Error state: red text line with Try again button */}
        {error && !loading && (
          <div className="drawer-error">
            <span className="drawer-error-text">{error}</span>
            <button
              type="button"
              className="btn-text"
              onClick={onRegenerate}
            >
              Try again
            </button>
          </div>
        )}

        {/* Generated Reply in editable textarea */}
        {!loading && !error && (
          <textarea
            className="drawer-textarea"
            value={currentReplyText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Draft a response..."
            aria-label="Generated reply text"
          />
        )}

        {/* Actions */}
        <div className="drawer-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyClick}
            disabled={loading || !currentReplyText}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            className="btn-text text-muted"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
