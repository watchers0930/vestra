"use client";

import { useMemo } from "react";
import { formatKRW } from "@/lib/utils";

interface RiskItem { name: string; value: number; fill: string }
interface AssetValueItem { name: string; value: number; risk: number }

interface Props {
  totalValue: number;
  totalAssets: number;
  avgRisk: number;
  avgSafety: number;
  riskDistribution: RiskItem[];
  assetValueData: AssetValueItem[];
}

const CIRCUMFERENCE = 2 * Math.PI * 46; // ≈ 289.03

function getBarBg(risk: number): string {
  if (risk <= 30) return "linear-gradient(90deg, #0071e3, #2997ff)";
  if (risk <= 60) return "linear-gradient(90deg, #ff9f0a, #ffd60a)";
  return "linear-gradient(90deg, #ff3b30, #ff7b73)";
}

function toEok(value: number): string {
  const e = value / 100_000_000;
  return `${e % 1 === 0 ? e : e.toFixed(1)}억`;
}

export function PortfolioOverview({
  totalAssets,
  riskDistribution,
  assetValueData,
}: Props) {
  const total = useMemo(
    () => riskDistribution.reduce((s, d) => s + d.value, 0),
    [riskDistribution],
  );

  const segments = useMemo(() => {
    let accumulated = 0;
    return riskDistribution.map((d) => {
      const arcLen = total > 0 ? (d.value / total) * CIRCUMFERENCE : 0;
      const offset = -accumulated;
      accumulated += arcLen;
      return { ...d, arcLen, offset };
    });
  }, [riskDistribution, total]);

  const maxValue = useMemo(
    () => Math.max(...assetValueData.map((d) => d.value), 1),
    [assetValueData],
  );

  return (
    <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
      {/* 도넛 차트 — 리스크 분포 */}
      <div
        className="rounded-[18px] bg-white p-[26px]"
        style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="mb-[2px] text-[14.5px] font-semibold text-[#1d1d1f]">리스크 분포</div>
        <div className="mb-[22px] text-[11.5px] text-[#6e6e73]">자산별 위험도 분류 현황</div>

        <div className="flex items-center gap-[28px]">
          {/* SVG 도넛 */}
          <svg width="116" height="116" viewBox="0 0 116 116" className="shrink-0">
            {/* 빈 트랙 */}
            <circle cx="58" cy="58" r="46" fill="none" stroke="#f5f5f7" strokeWidth="13" />
            {/* 세그먼트 */}
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="58" cy="58" r="46"
                fill="none"
                stroke={seg.fill}
                strokeWidth="13"
                strokeDasharray={`${seg.arcLen} ${CIRCUMFERENCE - seg.arcLen}`}
                strokeDashoffset={seg.offset}
                transform="rotate(-90 58 58)"
              />
            ))}
            {/* 중앙 텍스트 */}
            <text
              x="58" y="54"
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#1d1d1f"
              fontFamily="Paperlogy, -apple-system, sans-serif"
            >
              {totalAssets}건
            </text>
            <text
              x="58" y="69"
              textAnchor="middle"
              fontSize="10"
              fill="#6e6e73"
              fontFamily="Paperlogy, -apple-system, sans-serif"
            >
              총 자산
            </text>
          </svg>

          {/* 범례 */}
          <div className="flex-1 divide-y divide-black/[0.06]">
            {riskDistribution.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.name} className="flex items-center justify-between py-[8px]">
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="h-[9px] w-[9px] shrink-0 rounded-full"
                      style={{ background: d.fill }}
                    />
                    <span className="text-[12.5px] font-medium text-[#1d1d1f]">
                      {d.name.split(" ")[0]}
                    </span>
                    <span className="text-[11px] text-[#6e6e73]">({d.value}건)</span>
                  </div>
                  <span
                    className="text-[12.5px] font-bold"
                    style={{ color: d.fill }}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 수평 바 차트 — 자산 시세 */}
      <div
        className="rounded-[18px] bg-white p-[26px]"
        style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="mb-[2px] text-[14.5px] font-semibold text-[#1d1d1f]">자산 시세 현황</div>
        <div className="mb-[22px] text-[11.5px] text-[#6e6e73]">추정 시세 기준</div>

        <div className="space-y-[13px]">
          {assetValueData.slice(0, 6).map((d, i) => {
            const pct = (d.value / maxValue) * 100;
            return (
              <div key={i} className="flex items-center gap-[12px]">
                <div
                  className="w-[88px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-right text-[11.5px] text-[#6e6e73]"
                  title={d.name}
                >
                  {d.name}
                </div>
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#f5f5f7]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: getBarBg(d.risk) }}
                  />
                </div>
                <div className="w-[52px] text-[12px] font-semibold text-[#1d1d1f]">
                  {d.value > 0 ? toEok(d.value) : formatKRW(d.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
