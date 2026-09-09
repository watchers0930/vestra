"use client";

import { useState, useEffect } from "react";
import { X, ShieldAlert, FileText } from "lucide-react";

interface AnalysisView {
  typeLabel: string;
  createdAt: string;
  address: string;
  summary: string;
  vScore: { score?: number; grade?: string } | null;
  fraudRisk: { level?: string; grade?: string } | null;
  propertyInfo: Record<string, unknown>;
  risks: Array<{ level?: string; title?: string; description?: string }>;
}

/** 상담에 첨부된 신청자 AI 분석 원문 열람 (전문가 전용, 삼자 검증된 API로만 조회) */
export function ConsultAnalysisModal({ consultId, onClose }: { consultId: string; onClose: () => void }) {
  const [data, setData] = useState<AnalysisView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/keepzip/consults/${consultId}/analysis`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "분석을 열람할 수 없습니다.");
        return j;
      })
      .then((j) => { if (alive) setData(j.analysis); })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [consultId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />VESTRA AI 분석 원문
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">불러오는 중…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : data ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 font-medium">{data.typeLabel}</span>
              <span>분석일 {new Date(data.createdAt).toLocaleDateString("ko-KR")}</span>
            </div>

            {data.address && (
              <p className="text-gray-700"><span className="text-gray-400">물건 </span>{data.address}</p>
            )}

            {data.summary && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 leading-relaxed text-gray-800">{data.summary}</div>
            )}

            {data.vScore && typeof data.vScore.score === "number" && (
              <p className="text-gray-700">
                <span className="text-gray-400">V-Score </span>
                {data.vScore.score}점{data.vScore.grade ? ` · ${data.vScore.grade}등급` : ""}
              </p>
            )}

            {data.fraudRisk && (data.fraudRisk.level || data.fraudRisk.grade) && (
              <p className="inline-flex items-center gap-1.5 text-amber-700">
                <ShieldAlert size={14} />전세사기 위험: {data.fraudRisk.level ?? data.fraudRisk.grade}
              </p>
            )}

            {data.risks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">위험 요소 ({data.risks.length})</p>
                <ul className="space-y-1.5">
                  {data.risks.map((r, i) => (
                    <li key={i} className="rounded-lg border border-gray-200 p-2.5">
                      <span className="text-[13px] font-semibold text-gray-800">{r.title || "항목"}</span>
                      {r.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
              신청자 동의 하에 공유된 분석입니다. 상담 목적 외 사용을 금합니다.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
