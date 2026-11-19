import { useState, useRef } from "react";

export function UploadBar({ onUpload, loading, error }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleChooseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUploadClick = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  return (
    <section className="card upload-card">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
        style={{ display: "none" }}
      />
      <div className="upload-bar-inner">
        <span className="upload-file-name">
          {selectedFile ? selectedFile.name : "No file selected"}
        </span>

        <div className="upload-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleChooseClick}
            disabled={loading}
          >
            Choose file
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUploadClick}
            disabled={loading || !selectedFile}
          >
            {loading ? "Analyzing…" : "Analyze reviews"}
          </button>
        </div>
      </div>

      {error && <div className="upload-error">{error}</div>}
    </section>
  );
}
