// 등기부등본 발급 안내 바 — 전세보호·권리분석·등기감시 공통.
// 현재는 대법원 인터넷등기소로 안내(이용자 직접 발급). 추후 앱 내 발급(틸코) 전환 예정.
export default function RegistryIssueBar() {
  return (
    <div style={{ borderBottom: "1px solid #eef1f8", background: "#f8fafc" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 14, color: "#3d3d3f", lineHeight: 1.5 }}>
          등기부등본이 필요하신가요? 대법원 인터넷등기소에서 바로 발급받으실 수 있습니다.
        </span>
        <a
          href="https://www.iros.go.kr"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "#2e4bd8", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          등기부등본 발급하기 →
        </a>
      </div>
    </div>
  );
}
