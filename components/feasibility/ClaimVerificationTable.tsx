"use client";

import { ShieldCheck } from "lucide-react";
import type { VerificationResult } from "@/lib/feasibility/feasibility-types";

interface ClaimVerificationTableProps {
  claims: VerificationResult[];
}

function getGradeBadge(deviationPercent: number) {
  const abs = Math.abs(deviationPercent);
  if (abs <= 10) return { label: "적정", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (abs <= 25) {
    return deviationPercent > 0
      ? { label: "낙관적", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" }
      : { label: "보수적", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
  }
  return { label: "비현실적", color: "bg-red-100 text-red-700", dot: "bg-red-500" };
}

export function ClaimVerificationTable({ claims }: ClaimVerificationTableProps) {
  if (!claims.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
          <ShieldCheck size={16} className="text-[#1d1d1f]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1d1d1f]">
            주장-검증 결과
          </h3>
          <p className="text-xs text-[#6e6e73]">{claims.length}개 항목 교차 검증</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left py-3 px-5 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">항목</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">업체 주장</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">벤치마크</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">괴리율</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">판정</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">출처</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim, i) => {
              const badge = getGradeBadge(claim.deviationPercent);
              return (
                <tr
                  key={claim.claimKey}
                  className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                      <span className="font-medium text-[#1d1d1f]">{claim.claimLabel}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-[#1d1d1f] tabular-nums">
                    {claim.claimValue.toLocaleString()}{claim.claimUnit}
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#6e6e73] tabular-nums">
                    {claim.benchmark.value.toLocaleString()}{claim.claimUnit}
                    {claim.benchmark.range && (
                      <span className="block text-[10px] text-[#6e6e73]/70 mt-0.5">
                        ({claim.benchmark.range.min.toLocaleString()}~{claim.benchmark.range.max.toLocaleString()})
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`font-mono text-sm font-medium ${claim.deviationPercent > 0 ? "text-red-500" : "text-blue-500"}`}>
                      {claim.deviationPercent > 0 ? "+" : ""}
                      {claim.deviationPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-xs text-[#6e6e73] max-w-[160px] truncate">
                    {claim.benchmark.source}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
