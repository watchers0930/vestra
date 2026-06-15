"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw, Loader2, Scale, ClipboardList, TrendingUp,
  Home, FileText, Building2, X, Trash2, MapPin, Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/common/Button";
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
  return { label: summary.slice(0, 20) || "분석 완료", color: "#6e6e73", bg: "rgba(0,0,0,0.05)" };
}

function formatAddress(address: string): string {
  if (address.length > 60 && /^[A-Za-z0-9+/=]+$/.test(address.replace(/\s/g, "")))
    return "주소 정보 없음";
  return address;
}

function extractKeyMetrics(type: string, data: Record<string, unknown>): { label: string; value: string }[] {
  const metrics: { label: string; value: string }[] = [];
  try {
    if (type === "rights" || type === "jeonse") {
      const vScore = data.vScore as Record<string, unknown> | undefined;
      if (vScore?.finalScore !== undefined) metrics.push({ label: "V-Score", value: `${vScore.finalScore}점` });
      if (vScore?.grade) metrics.push({ label: "등급", value: String(vScore.grade) });
      const fr = data.fraudRisk as Record<string, unknown> | undefined;
      if (fr?.riskLevel) metrics.push({ label: "전세사기 위험", value: String(fr.riskLevel) });
    }
    if (type === "contract") {
      const risk = data.riskLevel ?? data.overallRisk;
      if (risk) metrics.push({ label: "위험 수준", value: String(risk) });
      const cnt = data.issueCount ?? data.totalIssues;
      if (cnt !== undefined) metrics.push({ label: "발견 이슈", value: `${cnt}건` });
    }
    if (type === "prediction") {
      const score = data.predictionScore ?? data.score;
      if (score !== undefined) metrics.push({ label: "전망 점수", value: `${score}점` });
      const trend = data.trend ?? data.direction;
      if (trend) metrics.push({ label: "시세 방향", value: String(trend) });
    }
    if (type === "feasibility") {
      const vs = data.vScore ?? (data.vScoreDetail as Record<string, unknown>)?.total;
      if (vs !== undefined) metrics.push({ label: "사업성 점수", value: `${vs}점` });
      const grade = data.vScoreGrade;
      if (grade) metrics.push({ label: "등급", value: String(grade) });
    }
  } catch { /* 무시 */ }
  return metrics;
}

interface Props {
  analyses: AnalysisRecord[];
  addressCountMap: Record<string, number>;
  cascadeLoading: string | null;
  handleCascadeUpdate: (address: string) => void;
  handleDeleteAnalysis: (id: string) => void;
  alertAddressMap?: Record<string, { monitoredPropertyId: string; summary: string; riskLevel: string }>;
}

export function AnalysisHistory({
  analyses,
  addressCountMap,
  cascadeLoading,
  handleCascadeUpdate,
  handleDeleteAnalysis,
  alertAddressMap = {},
}: Props) {
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (analyses.length === 0) return null;

  const items = analyses.slice(0, 5);

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    await handleDeleteAnalysis(selected.id);
    setDeleting(false);
    setSelected(null);
  };

  return (
    <>
      {/* 카드 목록 */}
      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const IconComp = TYPE_ICON[item.type] ?? FileText;
          const iconBg    = TYPE_BG[item.type]    ?? "rgba(0,0,0,0.06)";
          const iconColor = TYPE_COLOR[item.type]  ?? "#6e6e73";
          const chip      = getChip(item.summary);
          const addr      = formatAddress(item.address);
          const isCascading = cascadeLoading === item.address;
          const canCascade  = addressCountMap[item.address] >= 2;
          const alert = alertAddressMap[item.address];
          const alertBorder = alert
            ? (alert.riskLevel === "high" || alert.riskLevel === "critical") ? "border-red-400" : "border-amber-300"
            : "";

          const cardContent = (
            <div
              className={`group relative rounded-[18px] bg-white p-[20px] transition-all duration-200 hover:-translate-y-[2px] cursor-pointer ${alert ? `border-2 ${alertBorder}` : ""}`}
              style={{
                ...(!alert ? { border: "1px solid rgba(0,0,0,0.08)" } : {}),
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
            >
              {alert && (
                <span className="absolute top-[10px] left-[10px] rounded-full bg-amber-100 px-[7px] py-[1px] text-[10px] font-semibold text-amber-700">
                  ⚠ 변동감지
                </span>
              )}
              <div className={`mb-[13px] flex items-start justify-between ${alert ? "mt-[14px]" : ""}`}>
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]" style={{ background: iconBg }}>
                  <IconComp size={17} strokeWidth={1.5} style={{ color: iconColor }} />
                </div>
                <div className="flex items-center gap-[6px]">
                  <span className="text-[11px] text-[#6e6e73]">
                    {new Date(item.date).toLocaleDateString("ko-KR")}
                  </span>
                  {canCascade && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCascadeUpdate(item.address); }}
                      disabled={isCascading}
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all hover:bg-[#f5f5f7]"
                      style={{ color: "#6e6e73" }}
                      title="연관 분석 업데이트"
                    >
                      <RefreshCw size={11} className={isCascading ? "animate-spin" : ""} />
                    </button>
                  )}
                  {isCascading && <Loader2 size={10} className="animate-spin text-[#0071e3]" />}
                </div>
              </div>
              <div className="mb-[3px] text-[13.5px] font-semibold text-[#1d1d1f]">{item.typeLabel}</div>
              <div className="mb-[15px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-[#6e6e73]" title={addr}>
                {addr}
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ color: chip.color, background: chip.bg }}>
                  {chip.label}
                </span>
                <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] text-[#6e6e73]">›</div>
              </div>
            </div>
          );

          return alert ? (
            <Link key={item.id} href={`/monitoring/${alert.monitoredPropertyId}`}>{cardContent}</Link>
          ) : (
            <div key={item.id} onClick={() => setSelected(item)}>{cardContent}</div>
          );
        })}

        {/* + 새 분석 카드 */}
        <Link
          href="/rights"
          className="flex min-h-[130px] flex-col items-center justify-center gap-[7px] rounded-[18px] transition-colors hover:bg-[#eeeef0]"
          style={{ background: "#f5f5f7", border: "2px dashed rgba(0,0,0,0.08)" }}
        >
          <span className="text-[26px] text-[#c7c7cc]">＋</span>
          <span className="text-[12px] font-semibold text-[#6e6e73]">새 분석 시작</span>
        </Link>
      </div>

      {/* 상세 모달 */}
      {selected && (() => {
        const IconComp = TYPE_ICON[selected.type] ?? FileText;
        const iconBg    = TYPE_BG[selected.type]    ?? "rgba(0,0,0,0.06)";
        const iconColor = TYPE_COLOR[selected.type]  ?? "#6e6e73";
        const addr    = formatAddress(selected.address);
        const metrics = extractKeyMetrics(selected.type, selected.data);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
                    <IconComp size={16} strokeWidth={1.5} style={{ color: iconColor }} />
                  </div>
                  <span className="text-[15px] font-semibold text-[#1d1d1f]">{selected.typeLabel}</span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                >
                  <X size={16} className="text-[#86868b]" />
                </button>
              </div>

              {/* 본문 */}
              <div className="px-6 py-5 space-y-4">

                {/* 주소 */}
                <div className="flex items-start gap-2.5 rounded-xl bg-[#f5f5f7] px-4 py-3">
                  <MapPin size={14} className="text-[#86868b] mt-0.5 shrink-0" />
                  <span className="text-[13px] text-[#1d1d1f]">{addr}</span>
                </div>

                {/* 날짜 */}
                <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                  <Calendar size={13} />
                  {new Date(selected.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 분석
                </div>

                {/* 핵심 수치 */}
                {metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {metrics.map((m) => (
                      <div key={m.label} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                        <div className="text-[10.5px] text-[#86868b] mb-0.5">{m.label}</div>
                        <div className="text-[14px] font-semibold text-[#1d1d1f]">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 요약 */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b] mb-2">분석 요약</p>
                  <p className="text-[13.5px] leading-relaxed text-[#1d1d1f]">{selected.summary}</p>
                </div>
              </div>

              {/* 하단 */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  닫기
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={deleting}
                  onClick={handleDelete}
                >
                  이력 삭제
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
