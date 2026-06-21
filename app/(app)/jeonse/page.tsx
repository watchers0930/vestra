"use client";

import Link from "next/link";
import { Shield, MapPin, Stamp, ShieldCheck, Gavel, FileText, ChevronRight, ChevronDown, Users, ArrowRight } from "lucide-react";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";

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
  { label: "전입신고",       description: "새 주소지로 주민등록을 이전하여 대항력을 확보합니다", color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
  { label: "확정일자",       description: "계약서에 확정일자를 받아 보증금 우선변제권을 확보합니다", color: "#ff3b30", bg: "rgba(255,59,48,0.10)" },
  { label: "주택임대차 신고", description: "보증금 6천만원 초과 시 30일 내 의무이며, 신고 시 확정일자가 자동 부여됩니다", color: "#004ab3", bg: "rgba(0,113,227,0.10)" },
  { label: "전세권설정등기",  description: "등기부에 물권으로 기록하여 가장 강력한 보호를 받습니다", color: "#1a9e45", bg: "rgba(48,209,88,0.10)" },
];

export default function JeonseHubPage() {
  return (
    <div style={{ paddingBottom: "48px", paddingTop: "52px" }}>
      <DashboardPageTopbar current="전세보호" primaryHref="/jeonse/analysis" primaryLabel="전세분석" />
      <CategoryHero
        badge="🏠 전세보호"
        title="전세 보증금 보호 가이드"
        description={<>전세 안전 진단부터 전입신고·확정일자까지<br />보증금을 지키는 모든 절차를 안내합니다.</>}
      />

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
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", marginBottom: "3px" }}>
                전세 안전 AI 분석
              </h3>
              <p style={{ fontSize: "13.5px", color: "#6e6e73" }}>
                계약 정보를 입력하면 전세권 설정 필요성과 위험도를 분석합니다
              </p>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: "#0071e3", flexShrink: 0 }} strokeWidth={2} />
        </div>
      </Link>

      {/* 행정 절차 가이드 */}
      <h2 style={{ fontSize: "19px", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", marginBottom: "16px" }}>
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
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", marginBottom: "6px" }}>{title}</h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#6e6e73", marginBottom: "14px" }}>{description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12.5px", color: "#aeaeb2" }}>
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
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em", marginBottom: "16px" }}>
          권장 처리 순서
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {ORDER_STEPS.map((item, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 0" }}>
                <div
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: item.bg, border: `1.5px solid ${item.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: "1px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: item.color }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: "15px", fontWeight: 700,
                      color: item.color,
                      display: "block", marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </span>
                  <p style={{ fontSize: "13.5px", color: "#6e6e73", lineHeight: 1.65, margin: 0 }}>
                    {item.description}
                  </p>
                </div>
              </div>
              {i < ORDER_STEPS.length - 1 && (
                <div style={{ paddingLeft: "14px" }}>
                  <ChevronDown size={14} style={{ color: "#aeaeb2" }} strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
