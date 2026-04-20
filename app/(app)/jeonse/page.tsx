"use client";

import Link from "next/link";
import { Home, Shield, MapPin, Stamp, ShieldCheck, Gavel, FileText, ChevronRight, Users, ArrowRight } from "lucide-react";

const FEATURE_CHIPS = [
  { icon: "🛡️", label: "전세권 안전 분석" },
  { icon: "📋", label: "필요 서류 안내" },
  { icon: "🏠", label: "행정 절차 가이드" },
  { icon: "⚠️", label: "전세사기 탐지" },
];

const PROCEDURES = [
  {
    href: "/jeonse/transfer",
    icon: MapPin,
    title: "전입신고",
    description: "새 주소지로 주민등록을 이전하여 대항력을 확보합니다",
    badge: { text: "필수", color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
    steps: 4, difficulty: "쉬움", diffColor: "#1a9e45",
    requiresLandlord: false,
  },
  {
    href: "/jeonse/fixed-date",
    icon: Stamp,
    title: "확정일자",
    description: "계약서에 확정일자를 받아 보증금 우선변제권을 확보합니다",
    badge: { text: "필수", color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
    steps: 4, difficulty: "쉬움", diffColor: "#1a9e45",
    requiresLandlord: false,
  },
  {
    href: "/jeonse/jeonse-right",
    icon: ShieldCheck,
    title: "전세권설정등기",
    description: "등기부에 물권으로 기록하여 가장 강력한 보호를 받습니다",
    badge: { text: "최강 보호", color: "#1a9e45", bg: "rgba(48,209,88,0.10)" },
    steps: 6, difficulty: "어려움", diffColor: "#ff3b30",
    requiresLandlord: true,
  },
  {
    href: "/jeonse/lease-registration",
    icon: Gavel,
    title: "임차권등기명령",
    description: "보증금 미반환 시 법원 명령으로 이사 후에도 권리를 유지합니다",
    badge: { text: "보증금 미반환 시", color: "#b86f00", bg: "rgba(255,159,10,0.10)" },
    steps: 6, difficulty: "보통", diffColor: "#b86f00",
    requiresLandlord: false,
  },
  {
    href: "/jeonse/lease-report",
    icon: FileText,
    title: "주택임대차 신고",
    description: "임대차 계약을 신고하면 확정일자가 자동 부여됩니다",
    badge: { text: "6천만원 초과 시 의무", color: "#004ab3", bg: "rgba(0,113,227,0.10)" },
    steps: 4, difficulty: "쉬움", diffColor: "#1a9e45",
    requiresLandlord: false,
  },
];

const ORDER_STEPS = [
  { label: "전입신고",       color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
  { label: "확정일자",       color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
  { label: "주택임대차 신고", color: "#004ab3", bg: "rgba(0,113,227,0.10)" },
  { label: "전세권설정등기",  color: "#1a9e45", bg: "rgba(48,209,88,0.10)" },
];

export default function JeonseHubPage() {
  return (
    <div style={{ paddingBottom: "48px" }}>
      {/* ── 히어로 배너 ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "28px",
          background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)",
          marginTop: "10px",
          marginBottom: "28px",
        }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", top: "-80px", right: "-20px", height: "320px", width: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.18) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "36px 44px", gap: "24px" }}>
          <div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "4px 11px", borderRadius: "20px",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const,
                color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)",
                marginBottom: "14px",
              }}
            >
              🏠 전세보호
            </div>
            <h1 style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.03em", color: "#fff", margin: 0 }}>
              전세 보증금 보호 가이드
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.42)", marginTop: "8px", marginBottom: 0 }}>
              전세 안전 진단부터 전입신고·확정일자까지<br />보증금을 지키는 모든 절차를 안내합니다.
            </p>
          </div>
          <div className="hidden md:flex" style={{ flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {FEATURE_CHIPS.map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 16px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", minWidth: "166px",
                }}
              >
                <span style={{ fontSize: "15px" }}>{icon}</span>
                <span style={{ fontSize: "12.5px", fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI 분석 CTA */}
      <Link href="/jeonse/analysis" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,113,227,0.20)",
            borderRadius: "20px",
            boxShadow: "0 2px 16px rgba(0,113,227,0.08)",
            padding: "20px 24px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,113,227,0.16)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,113,227,0.35)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(0,113,227,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,113,227,0.20)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px", height: "48px", borderRadius: "14px",
                background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Shield size={22} style={{ color: "#0071e3" }} strokeWidth={1.5} />
            </div>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", marginBottom: "3px" }}>
                전세 안전 AI 분석
              </h3>
              <p style={{ fontSize: "12.5px", color: "#6e6e73" }}>
                계약 정보를 입력하면 전세권 설정 필요성과 위험도를 분석합니다
              </p>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: "#0071e3", flexShrink: 0 }} strokeWidth={2} />
        </div>
      </Link>

      {/* 행정 절차 가이드 */}
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", marginBottom: "16px" }}>
        행정 절차 가이드
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        {PROCEDURES.map(({ href, icon: Icon, title, description, badge, steps, difficulty, diffColor, requiresLandlord }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "18px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                padding: "20px",
                height: "100%",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "44px", height: "44px", borderRadius: "12px",
                    background: "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} style={{ color: "#1d1d1f" }} />
                </div>
                <span
                  style={{
                    fontSize: "10.5px", fontWeight: 700,
                    padding: "3px 9px", borderRadius: "20px",
                    color: badge.color, background: badge.bg,
                  }}
                >
                  {badge.text}
                </span>
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1d1d1f", marginBottom: "6px" }}>{title}</h3>
              <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#6e6e73", marginBottom: "14px" }}>{description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11.5px", color: "#aeaeb2" }}>
                <span>{steps}단계</span>
                <span style={{ color: diffColor, fontWeight: 500 }}>{difficulty}</span>
                {requiresLandlord && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#b86f00" }}>
                    <Users size={10} strokeWidth={1.5} />임대인 동의
                  </span>
                )}
                <ArrowRight size={13} strokeWidth={1.5} style={{ marginLeft: "auto" }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 권장 처리 순서 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          padding: "24px",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", marginBottom: "16px" }}>
          권장 처리 순서
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {ORDER_STEPS.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {i > 0 && <ChevronRight size={14} style={{ color: "#aeaeb2" }} strokeWidth={1.5} />}
              <span
                style={{
                  fontSize: "12px", fontWeight: 600,
                  padding: "5px 13px", borderRadius: "20px",
                  color: item.color, background: item.bg,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "12px", lineHeight: 1.65 }}>
          전입신고와 확정일자는 입주 즉시 처리하세요. 주택임대차 신고는 보증금 6천만원 초과 시 30일 내 의무입니다.
        </p>
      </div>
    </div>
  );
}
