"use client";

import Link from "next/link";
import { RefreshCw, Loader2, Scale, ClipboardList, TrendingUp, Home, FileText, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnalysisRecord } from "@/lib/store";

const TYPE_ICON: Record<string, LucideIcon> = {
  rights:      Scale,
  contract:    ClipboardList,
  prediction:  TrendingUp,
  jeonse:      Home,
  registry:    FileText,
  feasibility: Building2,
};

const TYPE_BG: Record<string, string> = {
  rights:      "rgba(0,113,227,0.09)",
  contract:    "rgba(48,209,88,0.09)",
  prediction:  "rgba(255,159,10,0.09)",
  jeonse:      "rgba(255,59,48,0.07)",
  registry:    "rgba(130,80,255,0.07)",
  feasibility: "rgba(100,200,255,0.09)",
};

const TYPE_COLOR: Record<string, string> = {
  rights:      "#0071e3",
  contract:    "#1a9e45",
  prediction:  "#b86f00",
  jeonse:      "#ff3b30",
  registry:    "#7c3aed",
  feasibility: "#0ea5e9",
};

function getChip(summary: string): { label: string; color: string; bg: string } {
  const s = summary.toLowerCase();
  if (s.includes("안전") || s.includes("정상") || s.includes("이상없") || s.includes("문제없"))
    return { label: `✓ ${summary.slice(0, 18)}`, color: "#1a9e45", bg: "rgba(48,209,88,0.09)" };
  if (s.includes("위험") || s.includes("고위험") || s.includes("불법") || s.includes("하락"))
    return { label: `↓ ${summary.slice(0, 18)}`, color: "#ff3b30", bg: "rgba(255,59,48,0.07)" };
  if (s.includes("주의") || s.includes("확인") || s.includes("권고") || s.includes("보증"))
    return { label: `! ${summary.slice(0, 18)}`, color: "#b86f00", bg: "rgba(255,159,10,0.09)" };
  return {
    label: summary.slice(0, 20) || "분석 완료",
    color: "#6e6e73",
    bg: "rgba(0,0,0,0.05)",
  };
}

function formatAddress(address: string): string {
  if (address.length > 60 && /^[A-Za-z0-9+/=]+$/.test(address.replace(/\s/g, "")))
    return "주소 정보 없음";
  return address;
}

interface Props {
  analyses: AnalysisRecord[];
  addressCountMap: Record<string, number>;
  cascadeLoading: string | null;
  handleCascadeUpdate: (address: string) => void;
  handleDeleteAnalysis: (id: string) => void;
}

export function AnalysisHistory({
  analyses,
  addressCountMap,
  cascadeLoading,
  handleCascadeUpdate,
}: Props) {
  if (analyses.length === 0) return null;

  const items = analyses.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const IconComp = TYPE_ICON[item.type] ?? FileText;
        const iconBg   = TYPE_BG[item.type]   ?? "rgba(0,0,0,0.06)";
        const iconColor = TYPE_COLOR[item.type] ?? "#6e6e73";
        const chip     = getChip(item.summary);
        const addr     = formatAddress(item.address);
        const isCascading = cascadeLoading === item.address;
        const canCascade  = addressCountMap[item.address] >= 2;

        return (
          <div
            key={item.id}
            className="group rounded-[18px] bg-white p-[20px] transition-all duration-200 hover:-translate-y-[2px]"
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
            }}
          >
            {/* 상단 — 아이콘 + 날짜 + 액션 */}
            <div className="mb-[13px] flex items-start justify-between">
              <div
                className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
                style={{ background: iconBg }}
              >
                <IconComp size={17} strokeWidth={1.5} style={{ color: iconColor }} />
              </div>
              <div className="flex items-center gap-[6px]">
                <span className="text-[11px] text-[#6e6e73]">
                  {new Date(item.date).toLocaleDateString("ko-KR")}
                </span>
                {canCascade && (
                  <button
                    onClick={() => handleCascadeUpdate(item.address)}
                    disabled={isCascading}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all hover:bg-[#f5f5f7]"
                    style={{ color: "#6e6e73" }}
                    title="연관 분석 업데이트"
                  >
                    <RefreshCw size={11} className={isCascading ? "animate-spin" : ""} />
                  </button>
                )}
                {isCascading && (
                  <span className="flex items-center gap-[3px] text-[10px] font-medium text-[#0071e3]">
                    <Loader2 size={10} className="animate-spin" />
                  </span>
                )}
              </div>
            </div>

            {/* 분류 + 주소 */}
            <div className="mb-[3px] text-[13.5px] font-semibold text-[#1d1d1f]">
              {item.typeLabel}
            </div>
            <div
              className="mb-[15px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-[#6e6e73]"
              title={addr}
            >
              {addr}
            </div>

            {/* 하단 — 칩 + 화살표 */}
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold"
                style={{ color: chip.color, background: chip.bg }}
              >
                {chip.label}
              </span>
              <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] text-[#6e6e73]">
                ›
              </div>
            </div>
          </div>
        );
      })}

      {/* + 새 분석 카드 */}
      <Link
        href="/rights"
        className="flex min-h-[130px] flex-col items-center justify-center gap-[7px] rounded-[18px] transition-colors hover:bg-[#eeeef0]"
        style={{
          background: "#f5f5f7",
          border: "2px dashed rgba(0,0,0,0.08)",
        }}
      >
        <span className="text-[26px] text-[#c7c7cc]">＋</span>
        <span className="text-[12px] font-semibold text-[#6e6e73]">새 분석 시작</span>
      </Link>
    </div>
  );
}
