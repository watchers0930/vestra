"use client";

import { useState, useEffect } from "react";
import { Card, Badge } from "@/components/common";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { ScholarPaper } from "@/lib/scholar";

interface ScholarPapersProps {
  keywords: string[];
}

export function ScholarPapers({ keywords }: ScholarPapersProps) {
  const [papers, setPapers] = useState<ScholarPaper[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!keywords.length) return;

    let cancelled = false;
    setLoading(true);

    fetch("/api/scholar/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPapers(data.papers || []);
        setSources(data.sources || []);
      })
      .catch(() => {
        if (!cancelled) setPapers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [keywords]);

  // 로딩 중이면 스켈레톤
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-gray-800">관련 학술논문</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // 결과 없으면 미표시
  if (!papers.length) return null;

  const sourceLabel = (s: ScholarPaper["source"]) => {
    switch (s) {
      case "semantic_scholar":
        return "Semantic Scholar";
      case "riss":
        return "RISS";
      case "kci":
        return "KCI";
    }
  };

  const sourceBadgeColor = (s: ScholarPaper["source"]) => {
    switch (s) {
      case "semantic_scholar":
        return "bg-blue-100 text-blue-700";
      case "riss":
        return "bg-indigo-100 text-indigo-700";
      case "kci":
        return "bg-rose-100 text-rose-700";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-gray-800">관련 학술논문</h3>
          <Badge variant="neutral">{papers.length}건</Badge>
        </div>
        {sources.length > 0 && (
          <p className="text-xs text-gray-400">
            출처: {sources.join(", ")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {papers.map((paper, idx) => (
          <div
            key={`${paper.source}-${idx}`}
            className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceBadgeColor(paper.source)}`}>
                    {sourceLabel(paper.source)}
                  </span>
                  {paper.year && (
                    <span className="text-xs text-gray-400">{paper.year}</span>
                  )}
                  {paper.citationCount != null && paper.citationCount > 0 && (
                    <span className="text-xs text-gray-400">
                      인용 {paper.citationCount.toLocaleString()}회
                    </span>
                  )}
                </div>

                {paper.url ? (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-800 hover:text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {paper.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm font-medium text-gray-800">{paper.title}</p>
                )}

                {paper.authors.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {paper.authors.slice(0, 3).join(", ")}
                    {paper.authors.length > 3 && ` 외 ${paper.authors.length - 3}명`}
                  </p>
                )}

                {paper.journal && (
                  <p className="text-xs text-gray-400 mt-0.5 italic">{paper.journal}</p>
                )}
              </div>
            </div>

            {/* 초록 접기/펼치기 */}
            {paper.abstract && (
              <div className="mt-2">
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {expandedIdx === idx ? (
                    <>초록 접기 <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>초록 보기 <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
                {expandedIdx === idx && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded">
                    {paper.abstract.length > 500
                      ? paper.abstract.slice(0, 500) + "..."
                      : paper.abstract}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
        위 논문은 자동 검색된 결과이며, 분석 내용과 직접적 관련이 없을 수 있습니다.
        학술 자료의 정확성은 원문을 직접 확인하시기 바랍니다.
      </p>
    </Card>
  );
}
