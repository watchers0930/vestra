"use client";

/**
 * AnalysisCompareReport — 비교 리포트 DOM (설계 §4.3 ③ · PDF 캡처 대상)
 *
 * 현재/직전 저장 스냅샷의 핵심 수치를 표로 표시한다. 닫기·삭제 버튼·오버레이를
 * 포함하지 않는 전용 DOM이며 PdfDownloadButton이 이 ref를 캡처한다.
 * 숫자·단위 기준으로 차이를 계산하며 요약 문장을 파싱해 추정하지 않는다.
 * 비교 불가 항목은 "비교 불가"로 두고 0으로 채우지 않는다.
 */
import { forwardRef } from "react";
import { formatKRW } from "@/lib/utils";
import type { AnalysisDetailResponse, AnalysisRecordDetail, AnalysisMetrics } from "../hooks/useAnalysisDetail";

type RiskFactor = NonNullable<AnalysisMetrics["riskFactors"]>[number];

const SEVERITY_LABEL: Record<string, string> = {
  critical: "치명", high: "고위험", medium: "주의", low: "참고",
};

/** ID 목록을 설명·심각도로 치환. 설명 없으면 ID만, 소스 없으면 null 처리는 호출부에서 분기 */
function lookupFactors(ids: string[] | null | undefined, source: RiskFactor[] | null | undefined): Array<{ id: string; text: string; severity?: string }> {
  if (!ids) return [];
  return ids.map((id) => {
    const f = source?.find((x) => x.id === id);
    return f ? { id, text: f.description, severity: f.severity } : { id, text: `식별자 ${id} (설명 정보 없음)` };
  });
}

function fmtScore(v: number | null): string {
  return v === null ? "비교 불가" : `${v}점`;
}
function fmtPct(v: number | null): string {
  return v === null ? "미확인" : `${Math.round(v * 10) / 10}%`;
}
function fmtWon(v: number | null): string {
  return v === null || v <= 0 ? "미확인" : formatKRW(v);
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function depositLabel(m: AnalysisRecordDetail["metrics"]): string {
  if (m.userDeposit === null || m.userDeposit <= 0) return "미입력";
  const src = m.depositSource === "user" ? " (직접 입력)" : "";
  return `${formatKRW(m.userDeposit)}${src}`;
}

interface RowDef {
  label: string;
  value: (r: AnalysisRecordDetail) => string;
}

const ROWS: RowDef[] = [
  { label: "분석일", value: (r) => fmtDate(r.createdAt) },
  { label: "안전점수", value: (r) => fmtScore(r.metrics.safetyScore) },
  { label: "등급", value: (r) => r.metrics.grade ?? "비교 불가" },
  { label: "추정 시세", value: (r) => fmtWon(r.metrics.marketValue) },
  { label: "실제 보증금", value: (r) => depositLabel(r.metrics) },
  { label: "선순위/시세 비율", value: (r) => fmtPct(r.metrics.ratioToMarket) },
  { label: "전세가율", value: (r) => fmtPct(r.metrics.jeonseRatio) },
  { label: "V-Score", value: (r) => (r.metrics.vScore === null ? "제공되지 않음" : `${r.metrics.vScore}점 (${r.metrics.vScoreGrade ?? "-"})`) },
];

interface Props {
  detail: AnalysisDetailResponse;
  /**
   * PDF 캡처용 고정 폭(640px) 렌더. 기본(false)은 가용 폭에 맞춘 유동 렌더로,
   * 모달 폭·360px 화면에서 넘치지 않는다(설계 §4.3·F07). PDF는 조상 overflow 제한 밖의
   * 별도 클론에서 640px로 캡처한다.
   */
  pdf?: boolean;
}

export const AnalysisCompareReport = forwardRef<HTMLDivElement, Props>(function AnalysisCompareReport({ detail, pdf = false }, ref) {
  const { current, previous, diff } = detail;
  const addr = [current.address, current.unitNumber].filter(Boolean).join(" ");

  // F10: 추가/해소 위험요인을 건수가 아닌 내용(설명·심각도)으로 표시
  const added = lookupFactors(diff?.addedRiskFactors, current.metrics.riskFactors);
  const resolved = lookupFactors(diff?.resolvedRiskFactors, previous?.metrics.riskFactors);
  // 동일 위험요인의 심각도 변화(악화/완화) — ID 유무만 보면 누락되므로 별도 표시(F1)
  const SEV_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  const changed = diff?.changedRiskFactors ?? [];
  // 비교 기준 자체가 null(레거시 원문 없음)이면 변화 항목을 건수로 추정하지 않고 "비교 불가"로 명시
  const riskComparable = diff?.addedRiskFactors !== null && diff?.resolvedRiskFactors !== null;

  return (
    <div
      ref={ref}
      className={pdf ? "bg-white p-6 text-[#1d1d1f]" : "w-full max-w-[640px] bg-white p-4 sm:p-6 text-[#1d1d1f]"}
      style={pdf ? { width: 640 } : undefined}
    >
      <h2 className="text-lg font-bold">VESTRA 분석 비교 리포트</h2>
      <p className="mt-1 text-sm text-gray-600 break-words">{addr || "주소 정보 없음"}</p>
      <p className="mt-0.5 text-xs text-gray-400">{current.typeLabel}</p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left">
            <th className="py-2 pr-2 font-medium text-gray-400">항목</th>
            <th className="py-2 px-2 font-semibold">현재</th>
            <th className="py-2 pl-2 font-semibold text-gray-500">직전</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b border-gray-100">
              <td className="py-2 pr-2 text-gray-500">{row.label}</td>
              <td className="py-2 px-2 font-medium">{row.value(current)}</td>
              <td className="py-2 pl-2 text-gray-500">{previous ? row.value(previous) : "이전 결과 없음"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-400">
        ※ 안전점수와 V-Score는 산정 기준이 다른 별도 지표로, 같은 물건이라도 서로 다른 값을 가질 수 있습니다.
        각 점수의 범위·근거와 &lsquo;미확인&rsquo; 항목이 판단에 미치는 한계를 함께 참고하세요.
      </p>

      {/* 변화 요약 */}
      {diff && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
          <p className="mb-2 font-semibold">직전 대비 변화</p>
          <ul className="space-y-1 text-gray-700">
            {diff.safetyScore ? (
              <li>
                안전점수 {diff.safetyScore.delta > 0 ? "+" : ""}{diff.safetyScore.delta}점 ·{" "}
                {diff.safetyScore.direction === "improved" ? "개선" : diff.safetyScore.direction === "worse" ? "악화" : "변화 없음"}
              </li>
            ) : (
              <li className="text-gray-400">안전점수 비교 불가 (한쪽 값 미확인)</li>
            )}
            {diff.jeonseRatio ? (
              <li>전세가율 {diff.jeonseRatio.deltaPp > 0 ? "+" : ""}{Math.round(diff.jeonseRatio.deltaPp * 10) / 10}%p</li>
            ) : (
              <li className="text-gray-400">전세가율 비교 불가 (한쪽 값 미확인)</li>
            )}
            {diff.ruleVersionChanged && <li className="text-amber-700">※ 산정 기준(점수 규칙)이 변경되어 단순 비교에 주의가 필요합니다.</li>}
          </ul>

          {/* 위험요인 변화 — 건수가 아닌 항목 내용으로 표시(F10) */}
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="mb-1.5 font-semibold text-[13px]">위험요인 변화</p>
            {!riskComparable ? (
              <p className="text-gray-400">
                이전 또는 현재 분석에 위험요인 원문이 없어 비교할 수 없습니다.
              </p>
            ) : added.length === 0 && resolved.length === 0 && changed.length === 0 ? (
              <p className="text-gray-500">추가·해소·변동된 위험요인이 없습니다 (변화 없음).</p>
            ) : (
              <div className="space-y-2">
                {added.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium text-red-700">추가된 위험요인 {added.length}건</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {added.map((f) => (
                        <li key={`add-${f.id}`} className="text-[12px] text-gray-700 break-words">
                          · {f.text}{f.severity ? ` (${SEVERITY_LABEL[f.severity] ?? f.severity})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {resolved.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium text-emerald-700">해소된 위험요인 {resolved.length}건</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {resolved.map((f) => (
                        <li key={`res-${f.id}`} className="text-[12px] text-gray-700 break-words">
                          · {f.text}{f.severity ? ` (${SEVERITY_LABEL[f.severity] ?? f.severity})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {changed.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium text-amber-700">심각도 변동 {changed.length}건</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {changed.map((f) => {
                        const worse = (SEV_ORDER[f.to] ?? 0) > (SEV_ORDER[f.from] ?? 0);
                        return (
                          <li key={`chg-${f.id}`} className="text-[12px] text-gray-700 break-words">
                            · {f.description}: {SEVERITY_LABEL[f.from] ?? f.from} → {SEVERITY_LABEL[f.to] ?? f.to} ({worse ? "악화" : "완화"})
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {!previous && (
        <p className="mt-4 text-xs text-gray-400">동일 물건의 이전 분석 기록이 없어 비교할 수 없습니다.</p>
      )}

      <p className="mt-4 text-[10px] text-gray-400">
        본 리포트는 저장된 분석 스냅샷 기준이며 재분석 결과가 아닙니다. 참고용이며 법적 조언이 아닙니다.
      </p>
    </div>
  );
});
