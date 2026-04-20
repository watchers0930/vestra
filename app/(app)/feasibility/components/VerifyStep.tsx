"use client";

export function VerifyStep() {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "64px 24px", textAlign: "center" }}>
      <div style={{ position: "relative", width: "52px", height: "52px", margin: "0 auto 20px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.25)" }} />
        <div style={{ position: "absolute", inset: "4px", borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#2997ff", animation: "spin 0.9s linear infinite" }} />
        <div style={{ position: "absolute", inset: "10px", borderRadius: "50%", border: "2px solid rgba(41,151,255,0.15)" }} />
      </div>
      <p style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>사업성 검증 분석 중...</p>
      <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.6 }}>공공데이터 교차 검증 및 AI 의견 생성 중입니다</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0071e3", opacity: 0.5, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 180}ms`, display: "inline-block" }} />
        ))}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-6px);opacity:1} }
      `}</style>
    </div>
  );
}
