export function TopLists({ topComplaints, topPraises }) {
  const complaints = Array.isArray(topComplaints) ? topComplaints : [];
  const praises = Array.isArray(topPraises) ? topPraises : [];

  return (
    <div className="top-lists-grid">
      {/* Top 3 Complaints */}
      <section className="card top-list-card">
        <h3 className="section-title">Top 3 Complaints</h3>
        {complaints.length === 0 ? (
          <p className="empty-list-notice">No complaints found.</p>
        ) : (
          <ol className="numbered-list">
            {complaints.map((item, idx) => (
              <li key={idx} className="numbered-item">
                <span className="item-title">{idx + 1}. {item.title}</span>
                <p className="item-desc">{item.explanation}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Top 3 Praises */}
      <section className="card top-list-card">
        <h3 className="section-title">Top 3 Praises</h3>
        {praises.length === 0 ? (
          <p className="empty-list-notice">No praises found.</p>
        ) : (
          <ol className="numbered-list">
            {praises.map((item, idx) => (
              <li key={idx} className="numbered-item">
                <span className="item-title">{idx + 1}. {item.title}</span>
                <p className="item-desc">{item.explanation}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
