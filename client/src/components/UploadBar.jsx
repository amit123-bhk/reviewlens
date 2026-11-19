import { useState } from "react";

export function UploadBar({ onUpload, loading, error }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  return (
    <section className="card upload-card">
      <div className="upload-header">
        <h2>Upload Reviews CSV</h2>
        <p>Select a CSV file containing customer reviews to process.</p>
      </div>

      <div className="upload-controls">
        <label className="file-input-label">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />
          <span>{selectedFile ? selectedFile.name : "Select reviews.csv..."}</span>
        </label>

        <button
          className="btn btn-primary"
          onClick={handleUploadClick}
          disabled={loading || !selectedFile}
        >
          {loading ? "Analyzing..." : "Analyze Reviews"}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading && (
        <div className="loading-banner">
          <div className="spinner"></div>
          <div>
            <strong>Processing reviews</strong>
            <p>Cleaning records, checking cache, and running analysis...</p>
          </div>
        </div>
      )}
    </section>
  );
}
