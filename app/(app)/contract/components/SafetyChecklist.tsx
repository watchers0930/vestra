"use client";

import { ShieldAlert, Landmark, AlertTriangle, ShieldCheck, Shield, FileText, Info } from "lucide-react";

const ITEMS = [
  {
    icon: Landmark,
    color: "#ff3b30",
    bg: "rgba(255,59,48,0.06)",
    border: "rgba(255,59,48,0.18)",
    title: "세금 체납 확인",
    titleColor: "#c0392b",
    body: (
      <>임대인의 <strong>국세·지방세 완납증명원</strong>을 요구하세요.
        체납 세금은 근저당보다 우선 변제되어 보증금 회수에 직접 영향을 줍니다.</>
    ),
    bodyColor: "#c0392b",
  },
  {
    icon: AlertTriangle,
    color: "#ff9f0a",
    bg: "rgba(255,159,10,0.06)",
    border: "rgba(255,159,10,0.18)",
    title: "등기부 말소 이력 확인",
    titleColor: "#b86f00",
    body: (
      <>등기부를 <strong>&#39;말소 사항 포함&#39;</strong>으로 발급받아 과거 이력을 확인하고,
        최근 말소된 근저당은 해당 은행에 직접 정상 상환 여부를 확인하세요.</>
    ),
    bodyColor: "#b86f00",
  },
  {
    icon: ShieldCheck,
    color: "#0071e3",
    bg: "rgba(0,113,227,0.05)",
    border: "rgba(0,113,227,0.16)",
    title: "전세보증보험 가입",
    titleColor: "#004ab3",
    body: (
      <><strong>HUG</strong> 또는 <strong>SGI</strong>의 전세보증금반환보증에 반드시 가입하세요.</>
    ),
    bodyColor: "#004ab3",
  },
  {
    icon: Shield,
    color: "#5856d6",
    bg: "rgba(88,86,214,0.05)",
    border: "rgba(88,86,214,0.16)",
    title: "권원보험 (Title Insurance)",
    titleColor: "#3634a3",
    body: (
      <>소유권 사기·서류 위조 피해를 보상하는 보험입니다.
        매매가 3억 기준 약 <strong>10~15만원</strong>으로 가입 가능합니다.</>
    ),
    bodyColor: "#3634a3",
  },
] as const;

export function SafetyChecklist() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
      }}
    >
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "16px",
          fontWeight: 700,
          color: "#1d1d1f",
          marginBottom: "18px",
          letterSpacing: "-0.02em",
        }}
      >
        <ShieldAlert size={17} style={{ color: "#ff9f0a" }} />
        계약 전 안전 체크리스트
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "10px",
        }}
      >
        {ITEMS.map(({ icon: Icon, color, bg, border, title, titleColor, body, bodyColor }) => (
          <div
            key={title}
            style={{
              borderRadius: "14px",
              border: `1px solid ${border}`,
              background: bg,
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Icon size={15} style={{ color, marginTop: "2px", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: titleColor, marginBottom: "4px" }}>{title}</p>
              <p style={{ fontSize: "11.5px", lineHeight: 1.65, color: bodyColor }}>{body}</p>
            </div>
          </div>
        ))}

        {/* 특약 항목 — 전폭 */}
        <div
          style={{
            gridColumn: "1 / -1",
            borderRadius: "14px",
            border: "1px solid rgba(48,209,88,0.20)",
            background: "rgba(48,209,88,0.04)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <FileText size={15} style={{ color: "#30d158", marginTop: "2px", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a9e45", marginBottom: "4px" }}>등기 상태 유지 특약</p>
            <p style={{ fontSize: "11.5px", lineHeight: 1.65, color: "#1a9e45" }}>
              <strong>&ldquo;잔금일까지 등기 상태 유지, 위반 시 계약 해제 및 배액 배상&rdquo;</strong> 특약을 반드시 기재하세요.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "12px",
          fontSize: "11px",
          color: "#b86f00",
        }}
      >
        <Info size={12} />
        <span>등기부등본에는 법적 &#39;공신력&#39;이 없습니다. 등기 내용이 실제와 달라도 국가가 보호하지 않으므로 위 항목을 반드시 확인하세요.</span>
      </div>
    </div>
  );
}
