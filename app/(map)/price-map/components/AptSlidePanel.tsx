"use client";

import { X, TrendingUp, TrendingDown } from "lucide-react";
import { KakaoRoadview } from "@/components/common/KakaoRoadview";
import { formatMapPrice } from "../lib/formatMapPrice";
import { analyzeRisk } from "../lib/analyzeRisk";
import type { AptData, PriceMapTradeType } from "../types";

interface Props {
  apt: AptData;
  tradeType: PriceMapTradeType;
  officialPriceLabel: string;
  onClose: () => void;
  onRiskPopup: (v: { apt: AptData; risk: ReturnType<typeof analyzeRisk> }) => void;
}

export function AptSlidePanel({ apt, tradeType, officialPriceLabel, onClose, onRiskPopup }: Props) {
  const isUp = (apt.change ?? 0) >= 0;

  const infoItems = [
    { label: tradeType === "월세" ? "월세" : tradeType === "전세" ? "전세가" : "시세", value: formatMapPrice(apt, tradeType) },
    { label: "면적",   value: apt.area ? `${apt.area}평` : "미제공" },
    { label: "건축",   value: apt.year ? `${apt.year}년` : "-" },
    { label: "공시가격", value: officialPriceLabel || "조회중..." },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">

      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#EEF1F8] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[#1d1d1f]">{apt.name}</p>
          <p className="text-[11px] text-[#6e6e73]">{apt.dong}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {apt.change !== null && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{
                background: isUp ? "rgba(255,59,48,0.08)" : "rgba(0,113,227,0.08)",
                color: isUp ? "#ff3b30" : "#0071e3",
              }}
            >
              {isUp ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
              {isUp ? "+" : ""}{apt.change}%
            </span>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#aeaeb2] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 도로뷰 */}
      <KakaoRoadview lat={apt.lat} lng={apt.lng} className="h-[200px] shrink-0" />

      {/* 정보 카드 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {infoItems.map(({ label, value }) => (
            <div
              key={label}
              style={{ borderRadius: "10px", background: "#f5f5f7", padding: "10px 12px" }}
            >
              <p style={{ fontSize: "10px", color: "#aeaeb2", margin: 0 }}>{label}</p>
              <p
                style={{
                  fontSize: "12px", fontWeight: 700, color: "#1d1d1f",
                  margin: 0, marginTop: "3px", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => onRiskPopup({ apt, risk: analyzeRisk(apt) })}
          style={{
            display: "block", width: "100%", borderRadius: "10px",
            background: "#0071e3", padding: "10px",
            textAlign: "center", fontSize: "12px", fontWeight: 600,
            color: "#fff", border: "none", cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,113,227,0.30)",
          }}
        >
          위험도 분석 →
        </button>
      </div>
    </div>
  );
}
