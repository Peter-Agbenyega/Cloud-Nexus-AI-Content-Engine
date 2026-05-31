export default function ResultsLoading() {
  return (
    <div className="results-shell">
      <div style={{ height: "60px", background: "white", borderBottom: "1px solid #f3f4f6" }} />
      <div className="results-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[140, 200, 120].map((h, i) => (
            <div key={i} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px 18px", height: `${h}px` }}>
              <div className="skeleton" style={{ width: "100%", height: "100%", borderRadius: "6px" }} />
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[100, 120, 110, 90, 110].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: `${w}px`, height: "30px", borderRadius: "999px" }} />
            ))}
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{ padding: "10px 16px", background: "#fafbfc", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ width: "80px", height: "11px" }} />
                <div className="skeleton" style={{ width: "44px", height: "22px", borderRadius: "4px" }} />
              </div>
              <div style={{ padding: "16px" }}>
                <div className="skeleton" style={{ width: "100%", height: "13px", marginBottom: "6px" }} />
                <div className="skeleton" style={{ width: "88%", height: "13px", marginBottom: "6px" }} />
                <div className="skeleton" style={{ width: "72%", height: "13px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
