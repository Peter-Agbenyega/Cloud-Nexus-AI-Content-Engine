export default function GenerateLoading() {
  return (
    <div className="generate-shell">
      <div style={{ height: "60px", background: "white", borderBottom: "1px solid #f3f4f6" }} />
      <div className="generate-main">
        <div style={{ display: "flex", justifyContent: "center", gap: "0", marginBottom: "36px" }}>
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div className="skeleton" style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                <div className="skeleton" style={{ width: "36px", height: "10px", marginTop: "5px" }} />
              </div>
              {i < 3 && <div style={{ flex: 1, height: "2px", marginTop: "13px", background: "#e5e7eb" }} />}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: "28px" }}>
          <div className="skeleton" style={{ width: "70px", height: "11px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "220px", height: "24px", marginBottom: "6px" }} />
          <div className="skeleton" style={{ width: "300px", height: "13px" }} />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ marginBottom: "20px" }}>
            <div className="skeleton" style={{ width: "90px", height: "12px", marginBottom: "6px" }} />
            <div className="skeleton" style={{ width: "100%", height: "40px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
