export function TopLists({ topComplaints, topPraises }) {
  const complaints = Array.isArray(topComplaints) ? topComplaints : [];
  const praises = Array.isArray(topPraises) ? topPraises : [];

  return (
    <div className="insights-grid">
      {/* Top 3 Complaints */}
      <div className="card insight-card complaint-card">
        <div className="insight-title">
          <span className="icon">⚠️</span>
          <h3>Top 3 Complaints</h3>
        </div>
        {complaints.length === 0 ? (
          <p className="empty-notice">No complaints found.</p>
        ) : (
          <ul className="insight-list">
            {complaints.map((item, idx) => (
              <li key={idx} className="insight-item">
                <div className="item-header">
                  <span className="topic-badge topic-neg">{item.title}</span>
                </div>
                <p className="item-sample">{item.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top 3 Praises */}
      <div className="card insight-card praise-card">
        <div className="insight-title">
          <span className="icon">🌟</span>
          <h3>Top 3 Praises</h3>
        </div>
        {praises.length === 0 ? (
          <p className="empty-notice">No praises found.</p>
        ) : (
          <ul className="insight-list">
            {praises.map((item, idx) => (
              <li key={idx} className="insight-item">
                <div className="item-header">
                  <span className="topic-badge topic-pos">{item.title}</span>
                </div>
                <p className="item-sample">{item.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
