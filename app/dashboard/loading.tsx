export default function DashboardLoading() {
  return (
    <div className="dashboard-shell">
      <div style={{ height: "60px", background: "white", borderBottom: "1px solid #f3f4f6" }} />
      <div className="dashboard-main">
        <div style={{ marginBottom: "20px" }}>
          <div className="skeleton" style={{ width: "140px", height: "24px", marginBottom: "6px" }} />
          <div className="skeleton" style={{ width: "100px", height: "13px" }} />
        </div>
        <div className="dashboard-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: "12px", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div className="skeleton" style={{ width: "55%", height: "15px" }} />
                <div className="skeleton" style={{ width: "50px", height: "11px" }} />
              </div>
              <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
                <div className="skeleton" style={{ width: "70px", height: "18px", borderRadius: "999px" }} />
                <div className="skeleton" style={{ width: "60px", height: "18px", borderRadius: "999px" }} />
              </div>
              <div className="skeleton" style={{ width: "100%", height: "12px", marginBottom: "4px" }} />
              <div className="skeleton" style={{ width: "70%", height: "12px", marginBottom: "10px" }} />
              <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ width: "80px", height: "18px", borderRadius: "999px" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ width: "50px", height: "18px", borderRadius: "999px" }} />
                <div className="skeleton" style={{ width: "80px", height: "13px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
