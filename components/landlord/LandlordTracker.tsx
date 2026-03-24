"use client";

import { useState } from "react";
import { User, Building, AlertTriangle, ChevronDown, ChevronUp, Search } from "lucide-react";

interface LandlordProperty {
  address: string;
  mortgageTotal: number;
  liensTotal: number;
  estimatedPrice: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

interface LandlordProfile {
  nameDisplay: string;
  properties: LandlordProperty[];
  propertyCount: number;
  totalMortgage: number;
  totalLiens: number;
  totalEstimatedValue: number;
  mortgageRatio: number;
  safetyGrade: string;
  gradeScore: number;
  courtCaseCount: number;
  fraudCaseCount: number;
  riskFactors: string[];
}

function formatKRW(value: number): string {
  if (value >= 100_000_000) {
    const eok = (value / 100_000_000).toFixed(1);
    return `${eok}억`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}만`;
  }
  return value.toLocaleString() + "원";
}

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: "bg-green-100", text: "text-green-700", label: "안전" },
  B: { bg: "bg-blue-100", text: "text-blue-700", label: "양호" },
  C: { bg: "bg-yellow-100", text: "text-yellow-700", label: "주의" },
  D: { bg: "bg-orange-100", text: "text-orange-700", label: "위험" },
  F: { bg: "bg-red-100", text: "text-red-700", label: "매우 위험" },
};

const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "bg-green-100", text: "text-green-700" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-700" },
  HIGH: { bg: "bg-red-100", text: "text-red-700" },
};

export default function LandlordTracker({ ownerName, baseAddress }: { ownerName?: string; baseAddress?: string }) {
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [inputName, setInputName] = useState(ownerName || "");

  const handleSearch = async (name?: string) => {
    const searchName = name || inputName;
    if (!searchName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/landlord/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName: searchName, baseAddress }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setExpanded(true);
      }
    } catch (err) {
      console.error("임대인 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const gradeStyle = profile ? GRADE_COLORS[profile.safetyGrade] || GRADE_COLORS.C : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* 헤더 + 검색 */}
      <div className="flex items-center gap-2 border-b border-gray-100 p-4">
        <User className="h-5 w-5 text-indigo-600" />
        <h3 className="flex-1 text-sm font-bold text-gray-900">임대인 종합 프로파일</h3>
        {profile && (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* 검색 입력 */}
      <div className="flex gap-2 p-4 pb-2">
        <input
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="소유자(임대인)명 입력"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading || !inputName.trim()}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          조회
        </button>
      </div>

      {/* 프로파일 결과 */}
      {profile && expanded && (
        <div className="space-y-3 p-4 pt-2">
          {/* 등급 + 요약 */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${gradeStyle?.bg}`}>
              <span className={`text-xl font-black ${gradeStyle?.text}`}>{profile.safetyGrade}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{profile.nameDisplay}</p>
              <p className={`text-xs font-semibold ${gradeStyle?.text}`}>
                {gradeStyle?.label} ({profile.gradeScore}점)
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">소유물건</p>
              <p className="text-lg font-bold text-gray-900">{profile.propertyCount}건</p>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-xs text-gray-500">근저당 총액</p>
              <p className="text-sm font-bold text-gray-900">{formatKRW(profile.totalMortgage)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-xs text-gray-500">압류 총액</p>
              <p className={`text-sm font-bold ${profile.totalLiens > 0 ? "text-red-600" : "text-gray-900"}`}>
                {profile.totalLiens > 0 ? formatKRW(profile.totalLiens) : "없음"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-xs text-gray-500">근저당 비율</p>
              <p className={`text-sm font-bold ${profile.mortgageRatio > 60 ? "text-red-600" : profile.mortgageRatio > 40 ? "text-yellow-600" : "text-green-600"}`}>
                {profile.mortgageRatio}%
              </p>
            </div>
          </div>

          {/* 위험 요인 */}
          {profile.riskFactors.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">위험 요인</span>
              </div>
              <ul className="space-y-1">
                {profile.riskFactors.map((f, i) => (
                  <li key={i} className="text-xs text-orange-700">• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 소유 물건 목록 */}
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-500">
              <Building className="h-3.5 w-3.5" /> 소유 물건 목록
            </p>
            <div className="space-y-2">
              {profile.properties.map((prop, i) => {
                const badge = RISK_BADGE[prop.riskLevel];
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900">{prop.address}</p>
                      <p className="text-xs text-gray-500">
                        근저당 {formatKRW(prop.mortgageTotal)}
                        {prop.liensTotal > 0 && <span className="text-red-500"> · 압류 {formatKRW(prop.liensTotal)}</span>}
                      </p>
                    </div>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                      {prop.riskLevel === "LOW" ? "안전" : prop.riskLevel === "MEDIUM" ? "주의" : "위험"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
