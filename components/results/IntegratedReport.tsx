"use client";

import { useRef } from "react";
import {
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge, RiskBadge, PdfDownloadButton } from "@/components/common";
import { ScoreGauge } from "@/components/results";
import DocumentChecklist from "@/components/jeonse/DocumentChecklist";
import VScoreRadar from "@/components/results/VScoreRadar";
import FraudRiskCard from "@/components/results/FraudRiskCard";
import CrossAnalysisCard from "@/components/results/CrossAnalysisCard";
import type { IntegratedReportData } from "@/lib/integrated-report";

// ─── 등급 컬러/라벨 ───

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; variant: "danger" | "warning" | "success" | "info" | "neutral" }
> = {
  A: { label: "안전", color: "text-emerald-600", variant: "success" },
  B: { label: "양호", color: "text-blue-600", variant: "info" },
  C: { label: "주의", color: "text-amber-600", variant: "warning" },
  D: { label: "위험", color: "text-red-600", variant: "danger" },
  F: { label: "매우위험", color: "text-red-700", variant: "danger" },
};

function formatPrice(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억원`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만원`;
  return `${value.toLocaleString()}원`;
}

// ─── 메인 컴포넌트 ───

interface IntegratedReportProps {
  data: IntegratedReportData;
}

export default function IntegratedReport({ data }: IntegratedReportProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const gradeInfo = GRADE_CONFIG[data.overallGrade] || GRADE_CONFIG.C;

  return (
    <div className="space-y-6">
      {/* PDF 다운로드 */}
      <div className="flex justify-end">
        <PdfDownloadButton
          targetRef={printRef}
          filename={`vestra-report-${data.reportId}.pdf`}
          title="VESTRA 통합 리스크 리포트"
        />
      </div>

      {/* 인쇄용 래퍼 */}
      <div ref={printRef} className="space-y-6 bg-white">
        {/* ─── 1. 요약 섹션 ─── */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* 종합 점수 게이지 */}
            <ScoreGauge
              score={data.overallScore}
              grade={`${data.overallGrade}등급`}
              size="lg"
              label="종합 안전 점수"
            />

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">종합 위험 평가</h2>
                <Badge variant={gradeInfo.variant} size="md">
                  {data.overallGrade}등급 ({gradeInfo.label})
                </Badge>
              </div>

              <p className="text-sm text-secondary leading-relaxed">
                {data.summary}
              </p>

              {/* 물건 정보 */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                <span>주소: {data.propertyInfo.address}</span>
                <span>유형: {data.propertyInfo.type}</span>
                {data.propertyInfo.estimatedPrice > 0 && (
                  <span>추정가: {formatPrice(data.propertyInfo.estimatedPrice)}</span>
                )}
                {data.propertyInfo.jeonseRatio != null && (
                  <span>전세가율: {data.propertyInfo.jeonseRatio}%</span>
                )}
              </div>

              <div className="text-[10px] text-muted">
                리포트 ID: {data.reportId} | 생성: {new Date(data.generatedAt).toLocaleString("ko-KR")} | v{data.version}
              </div>
            </div>
          </div>
        </Card>

        {/* ─── 1.5. V-Score 상세 ─── */}
        {data.vScore && (
          <Card>
            <CardHeader title="V-Score 통합 위험도 분석" />
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* 레이더 차트 */}
                <VScoreRadar sources={data.vScore.sources} size={260} />

                {/* 소스별 기여도 */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold">{data.vScore.score}</span>
                    <span className="text-sm text-muted">/ 100</span>
                    <Badge variant={GRADE_CONFIG[data.vScore.grade]?.variant || "neutral"} size="sm">
                      {data.vScore.grade}등급 ({data.vScore.gradeLabel})
                    </Badge>
                  </div>

                  {/* 소스별 바 */}
                  {data.vScore.sources.map((source) => (
                    <div key={source.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {source.name}
                          {!source.dataAvailable && (
                            <span className="ml-1 text-muted">(추정)</span>
                          )}
                        </span>
                        <span className="text-muted">
                          {source.score}점 (가중치 {(source.weight * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            source.score >= 70
                              ? "bg-emerald-500"
                              : source.score >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${source.score}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* 상호작용 보정 */}
                  {data.vScore.interactions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-muted">복합 위험 보정</p>
                      {data.vScore.interactions.map((interaction, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2 py-1 rounded ${
                            interaction.adjustment < 0
                              ? "bg-red-50 text-red-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {interaction.description} ({interaction.adjustment > 0 ? "+" : ""}
                          {interaction.adjustment}점)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 규칙 기반 설명 */}
              {data.vScore.explanation.ruleBasedSummary && (
                <div className="mt-4 rounded-lg bg-blue-50/50 p-3 text-sm text-secondary">
                  <Shield size={14} className="inline mr-1 text-blue-500" />
                  {data.vScore.explanation.ruleBasedSummary}
                </div>
              )}

              <div className="mt-2 text-[10px] text-muted">
                알고리즘: {data.vScore.metadata.algorithmId} | 신뢰도: {(data.vScore.metadata.confidenceLevel * 100).toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── 1.6. 전세사기 위험 평가 ─── */}
        {data.fraudRisk && (
          <FraudRiskCard result={data.fraudRisk} />
        )}

        {/* ─── 1.7. 크로스 기능 교차 분석 ─── */}
        {data.crossAnalysis && (
          <CrossAnalysisCard result={data.crossAnalysis} />
        )}

        {/* ─── 2. 권리분석 ─── */}
        {data.registryRisk && (
          <Card>
            <CardHeader title="권리분석 결과" />
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold">{data.registryRisk.score.totalScore}점</p>
                  <p className="text-xs text-muted mt-1">안전 점수</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold">{data.registryRisk.factorCount}건</p>
                  <p className="text-xs text-muted mt-1">위험 요소</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{data.registryRisk.criticalCount}건</p>
                  <p className="text-xs text-muted mt-1">심각 요소</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold">{data.registryRisk.score.mortgageRatio}%</p>
                  <p className="text-xs text-muted mt-1">근저당 비율</p>
                </div>
              </div>

              {/* 위험 요소 목록 */}
              {data.registryRisk.score.factors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">감지된 위험 요소</p>
                  {data.registryRisk.score.factors.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-sm"
                    >
                      {f.severity === "critical" ? (
                        <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">{f.description}</span>
                        <span className="text-muted ml-2">({f.detail})</span>
                        <span className="ml-2 text-xs text-muted">-{f.deduction}점</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── 3. 계약분석 ─── */}
        {data.contractRisk && (
          <Card>
            <CardHeader title="계약분석 결과">
              <RiskBadge level={data.contractRisk.overallRisk} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold">{data.contractRisk.riskClauses}건</p>
                  <p className="text-xs text-muted mt-1">위험 조항</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">{data.contractRisk.missingClauses}건</p>
                  <p className="text-xs text-muted mt-1">누락 조항</p>
                </div>
              </div>

              {data.contractRisk.highlights.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">주요 사항</p>
                  {data.contractRisk.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-secondary">
                      <ChevronRight size={14} className="text-muted shrink-0" />
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── 4. 시세분석 ─── */}
        {data.priceAnalysis && (
          <Card>
            <CardHeader title="시세분석 결과">
              <Badge variant="info" size="sm">
                신뢰도 {Math.round(data.priceAnalysis.confidence * 100)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-lg font-bold">{formatPrice(data.priceAnalysis.currentEstimate)}</p>
                  <p className="text-xs text-muted mt-1">현재 추정가</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50">
                  <p className="text-lg font-bold text-emerald-600">
                    {formatPrice(data.priceAnalysis.scenarioOptimistic)}
                  </p>
                  <p className="text-xs text-muted mt-1">낙관 시나리오</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <p className="text-lg font-bold text-blue-600">
                    {formatPrice(data.priceAnalysis.scenarioBase)}
                  </p>
                  <p className="text-xs text-muted mt-1">기본 시나리오</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50">
                  <p className="text-lg font-bold text-red-600">
                    {formatPrice(data.priceAnalysis.scenarioPessimistic)}
                  </p>
                  <p className="text-xs text-muted mt-1">비관 시나리오</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── 5. 체크리스트 ─── */}
        {data.checklist.length > 0 && (
          <DocumentChecklist
            documents={data.checklist}
            title="확인 서류 체크리스트"
            grouped
          />
        )}

        {/* ─── 6. 권고사항 ─── */}
        {data.recommendations.length > 0 && (
          <Card className="p-5">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-primary" />
              종합 권고사항
            </h4>
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/50 text-sm"
                >
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="text-secondary">{rec}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── 7. 면책조항 ─── */}
        <div className="text-[10px] text-muted text-center py-4 border-t">
          본 리포트는 AI 기반 자동 분석 결과이며, 법률적 효력이 없습니다.
          정확한 판단을 위해 전문가(법무사/변호사/공인중개사) 상담을 권고합니다.
          | VESTRA v{data.version}
        </div>
      </div>
    </div>
  );
}
