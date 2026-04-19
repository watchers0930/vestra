"use client";

import Link from "next/link";
import { Shield, TrendingUp, Eye, CheckCircle, Loader2 } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import type { StoredAsset } from "@/lib/store";
import type { Session } from "next-auth";

interface Props {
  assets: StoredAsset[];
  session: Session | null;
  monitoringLoading: string | null;
  monitoredAddresses: Set<string>;
  handleMonitorRegister: (address: string) => void;
}

function getAssetName(address: string, type: string): string {
  const parts = address.split(/[\s,]+/).filter(Boolean);
  const dong = [...parts].reverse().find((p) => p.endsWith("동") || p.endsWith("구") || p.endsWith("로") || p.endsWith("가"));
  if (dong && type) return `${dong} ${type}`;
  if (type) return type;
  return address.slice(0, 16);
}

function getTypeBadge(type: string): { cls: string; label: string } {
  const t = type.toLowerCase();
  if (t.includes("아파트") || t === "apartment")
    return { cls: "apt", label: type };
  if (t.includes("빌라") || t.includes("다세대") || t.includes("다가구") || t === "villa")
    return { cls: "villa", label: type };
  if (t.includes("오피스텔") || t === "officetel")
    return { cls: "ofc", label: type };
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
  handleMonitorRegister,
}: Props) {
  if (assets.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-[18px] bg-white"
      style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* 테이블 헤더 */}
      <div
        className="grid items-center gap-[12px] px-[22px] py-[13px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]"
        style={{
          gridTemplateColumns: "2fr 90px 1fr 120px 90px 100px",
          background: "#f5f5f7",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <span>자산</span>
        <span>유형</span>
        <span>시세</span>
        <span>안전지수</span>
        <span>리스크</span>
        <span className="text-right">액션</span>
      </div>

      {/* 자산 목록 */}
      {assets.map((asset) => {
        const badge = getTypeBadge(asset.type || "");
        const bs = BADGE_STYLE[badge.cls];
        const isMonitored = monitoredAddresses.has(asset.address);
        const isLoading = monitoringLoading === asset.address;

        return (
          <div
            key={asset.id}
            className="grid cursor-pointer items-center gap-[12px] px-[22px] py-[16px] transition-colors hover:bg-[#fafafa]"
            style={{
              gridTemplateColumns: "2fr 90px 1fr 120px 90px 100px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
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
              <div className="text-[13.5px] font-semibold text-[#1d1d1f]">
                {formatKRW(asset.estimatedPrice)}
              </div>
              <div className="mt-[1px] text-[11px] text-[#6e6e73]">추정 시세</div>
            </div>

            {/* 안전지수 바 */}
            <div>
              <div className="mb-[4px] text-[11.5px] text-[#6e6e73]">{asset.safetyScore}점</div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#f5f5f7]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${asset.safetyScore}%`,
                    background: getSafetyBarBg(asset.safetyScore),
                  }}
                />
              </div>
            </div>

            {/* 리스크 점수 */}
            <div
              className="text-[15px] font-bold"
              style={{ color: getRiskColor(asset.riskScore) }}
            >
              {asset.riskScore}점
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center justify-end gap-[5px]">
              {session?.user && (
                <button
                  onClick={() => handleMonitorRegister(asset.address)}
                  disabled={isLoading || isMonitored}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all"
                  style={{
                    border: isMonitored
                      ? "1px solid rgba(0,113,227,0.20)"
                      : "1px solid rgba(0,0,0,0.08)",
                    background: isMonitored ? "rgba(0,113,227,0.09)" : "#fff",
                    color: isMonitored ? "#0071e3" : "#6e6e73",
                  }}
                  title={isMonitored ? "모니터링 중" : "모니터링 등록"}
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isMonitored ? (
                    <CheckCircle size={12} strokeWidth={2} />
                  ) : (
                    <Eye size={12} strokeWidth={1.5} />
                  )}
                </button>
              )}

              <Link
                href="/rights"
                onClick={() => localStorage.setItem("vestra_last_address", asset.address)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] transition-all hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                style={{ border: "1px solid rgba(0,0,0,0.08)", background: "#fff", color: "#6e6e73" }}
                title="권리분석"
              >
                <Shield size={12} strokeWidth={1.5} />
              </Link>

              <Link
                href="/prediction"
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
    </div>
  );
}
