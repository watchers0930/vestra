"use client";

import { useState, useEffect } from "react";
import { FileBarChart, Loader2 } from "lucide-react";
import { PageHeader, EmptyState, Card } from "@/components/common";
import IntegratedReport from "@/components/results/IntegratedReport";
import { aggregateReport } from "@/lib/integrated-report";
import type { IntegratedReportData } from "@/lib/integrated-report";

interface StoredAnalysisItem {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  summary: string;
  data: string;
  createdAt: string;
}

export default function ReportPage() {
  const [report, setReport] = useState<IntegratedReportData | null>(null);
  const [analyses, setAnalyses] = useState<StoredAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string>("");

  // localStorage에서 분석 내역 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem("analysis-history");
      if (stored) {
        const parsed: StoredAnalysisItem[] = JSON.parse(stored);
        setAnalyses(parsed);

        // 주소별 그룹
        const addresses = [...new Set(parsed.map((a) => a.address).filter(Boolean))];
        if (addresses.length > 0) {
          setSelectedAddress(addresses[0]);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  // 선택 주소 변경 시 리포트 재생성
  useEffect(() => {
    if (!selectedAddress || analyses.length === 0) {
      setReport(null);
      return;
    }

    const filtered = analyses
      .filter((a) => a.address === selectedAddress)
      .map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
      }));

    if (filtered.length === 0) {
      setReport(null);
      return;
    }

    const result = aggregateReport(filtered, selectedAddress);
    setReport(result);
  }, [selectedAddress, analyses]);

  const uniqueAddresses = [...new Set(analyses.map((a) => a.address).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileBarChart}
        title="통합 리스크 리포트"
        description="여러 분석 결과를 하나의 종합 리포트로 확인합니다"
      />

      {/* 주소 선택 */}
      {uniqueAddresses.length > 0 && (
        <Card className="p-4">
          <label className="text-sm font-medium text-secondary">분석 대상 물건 선택</label>
          <select
            value={selectedAddress}
            onChange={(e) => setSelectedAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {uniqueAddresses.map((addr) => {
              const count = analyses.filter((a) => a.address === addr).length;
              return (
                <option key={addr} value={addr}>
                  {addr} ({count}건 분석)
                </option>
              );
            })}
          </select>
        </Card>
      )}

      {/* 리포트 또는 빈 상태 */}
      {report ? (
        <IntegratedReport data={report} />
      ) : (
        <EmptyState
          icon={FileBarChart}
          title="통합 리포트를 생성할 수 없습니다"
          description="권리분석, 계약분석, 시세분석 중 하나 이상을 먼저 수행해주세요. 같은 주소에 대한 여러 분석 결과가 통합됩니다."
        />
      )}
    </div>
  );
}
