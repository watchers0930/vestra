"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import type { StoredAsset } from "@/lib/store";
import type { Session } from "next-auth";

const INITIAL_LIMIT = 5;

interface Props {
  assets: StoredAsset[];
  session: Session | null;
  monitoringLoading: string | null;
  monitoredAddresses: Set<string>;
  handleMonitorToggle: (address: string) => void;
}

function getAssetName(address: string, type: string): string {
  const parts = address.split(/[\s,]+/).filter(Boolean);
  const dong = [...parts].reverse().find((p) =>
    p.endsWith("동") || p.endsWith("구") || p.endsWith("로") || p.endsWith("가")
  );
  if (dong && type) return `${dong} ${type}`;
  if (type) return type;
  return address.slice(0, 16);
}

function getTypeBadge(type: string): { cls: string; label: string } {
  const t = type.toLowerCase();
  if (t.includes("아파트") || t === "apartment") return { cls: "apt", label: type };
  if (t.includes("빌라") || t.includes("다세대") || t.includes("다가구") || t === "villa") return { cls: "villa", label: type };
  if (t.includes("오피스텔") || t === "officetel") return { cls: "ofc", label: type };
  return { cls: "other", label: type };
}

function getSafetyBarBg(score: number): string {
  if (score >= 70) return "#30d158";
  if (score >= 40) return "#ff9f0a";
  return "#ff3b30";
}

function getRiskColor(risk: number): string {
  if (risk <= 30) return "#30d158";
  if (risk <= 60) return "#ff9f0a";
  return "#ff3b30";
}

const BADGE_STYLE: Record<string, { color: string; bg: string }> = {
  apt:   { color: "#0071e3", bg: "rgba(0,113,227,0.09)" },
  villa: { color: "#1a9e45", bg: "rgba(48,209,88,0.09)" },
  ofc:   { color: "#b86f00", bg: "rgba(255,159,10,0.09)" },
  other: { color: "#6e6e73", bg: "rgba(0,0,0,0.06)" },
};

export function AssetList({
  assets,
  session,
  monitoringLoading,
  monitoredAddresses,
  handleMonitorToggle,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (assets.length === 0) return null;

  const visibleAssets = expanded ? assets : assets.slice(0, INITIAL_LIMIT);
  const hiddenCount = assets.length - INITIAL_LIMIT;

  return (
    <div
      className="rounded-[18px] bg-white"
      style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="overflow-x-auto">
      <div className="min-w-[680px]">
      {/* 테이블 헤더 */}
      <div
        className="grid items-center gap-[12px] px-[22px] py-[13px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]"
        style={{
          gridTemplateColumns: "2fr 90px 1fr 120px 90px 110px",
          background: "#f5f5f7",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <span>자산</span>
        <span>유형</span>
        <span>시세</span>
        <span>안전지수</span>
        <span>리스크</span>
        <span className="text-right">모니터링 / 액션</span>
      </div>

      {/* 자산 목록 */}
      {visibleAssets.map((asset, idx) => {
        const badge = getTypeBadge(asset.type || "");
        const bs = BADGE_STYLE[badge.cls];
        const isMonitored = monitoredAddresses.has(asset.address);
        const isLoading = monitoringLoading === asset.address;
        const isLastVisible = idx === visibleAssets.length - 1;
        const showBorder = !isLastVisible || hiddenCount > 0;

        return (
          <div
            key={asset.id}
            className="grid cursor-pointer items-center gap-[12px] px-[22px] py-[16px] transition-colors hover:bg-[#fafafa]"
            style={{
              gridTemplateColumns: "2fr 90px 1fr 120px 90px 110px",
              borderBottom: showBorder ? "1px solid rgba(0,0,0,0.06)" : "none",
            }}
          >
            {/* 자산명 + 주소 */}
            <div>
              <div
                className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-[#1d1d1f]"
                style={{ maxWidth: 260 }}
                title={asset.address}
              >
                {getAssetName(asset.address, asset.type)}
              </div>
              <div
                className="mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-[#6e6e73]"
                style={{ maxWidth: 260 }}
              >
                {asset.address}
              </div>
            </div>

            {/* 유형 배지 */}
            <div>
              <span
                className="inline-flex items-center rounded-full px-[9px] py-[3px] text-[10.5px] font-semibold"
                style={{ color: bs.color, background: bs.bg }}
              >
                {badge.label || "기타"}
              </span>
            </div>

            {/* 시세 */}
            <div>
              <div className="text-[13.5px] font-semibold text-[#1d1d1f]">{formatKRW(asset.estimatedPrice)}</div>
              <div className="mt-[1px] text-[11px] text-[#6e6e73]">추정 시세</div>
            </div>

            {/* 안전지수 바 */}
            <div>
              <div className="mb-[4px] text-[11.5px] text-[#6e6e73]">{asset.safetyScore}점</div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#f5f5f7]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${asset.safetyScore}%`, background: getSafetyBarBg(asset.safetyScore) }}
                />
              </div>
            </div>

            {/* 리스크 점수 */}
            <div className="text-[15px] font-bold" style={{ color: getRiskColor(asset.riskScore) }}>
              {asset.riskScore}점
            </div>

            {/* 액션 */}
            <div className="flex items-center justify-end gap-[8px]">
              {/* 모니터링 토글 스위치 */}
              {session?.user && (
                <button
                  onClick={() => handleMonitorToggle(asset.address)}
                  disabled={isLoading}
                  title={isMonitored ? "모니터링 해제" : "모니터링 등록"}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 32,
                    height: 18,
                    borderRadius: 9,
                    background: isMonitored ? "#0071e3" : "rgba(0,0,0,0.12)",
                    border: "none",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {isLoading ? (
                    <Loader2
                      size={10}
                      className="animate-spin"
                      style={{ position: "absolute", top: 4, left: 11, color: "#fff" }}
                    />
                  ) : (
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: isMonitored ? 16 : 2,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        background: "#fff",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        display: "block",
                      }}
                    />
                  )}
                </button>
              )}

              <Link
                href={`/rights?address=${encodeURIComponent(asset.address)}`}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                style={{ border: "1px solid rgba(0,0,0,0.08)", background: "#fff", color: "#6e6e73" }}
                title="권리분석"
              >
                <Shield size={12} strokeWidth={1.5} />
              </Link>

              <Link
                href={`/prediction?address=${encodeURIComponent(asset.address)}`}
                onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                style={{ border: "1px solid rgba(0,0,0,0.08)", background: "#fff", color: "#6e6e73" }}
                title="시세전망"
              >
                <TrendingUp size={12} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        );
      })}

      {/* 아코디언 토글 버튼 */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-[6px] py-[13px] text-[12.5px] font-medium text-[#0071e3] transition-colors hover:bg-[#f5f5f7]"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} strokeWidth={2} />
              접기
            </>
          ) : (
            <>
              <ChevronDown size={14} strokeWidth={2} />
              나머지 {hiddenCount}건 더 보기
            </>
          )}
        </button>
      )}
      </div>
      </div>
    </div>
  );
}
