"use client";

import { useState } from "react";
import {
  UserSearch,
  Search,
  Building,
  AlertTriangle,
  ShieldAlert,
  Scale,
  Megaphone,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/common";
import { Button } from "@/components/common";
import ReportModal from "@/components/landlord/ReportModal";

// ---------------------------------------------------------------------------
// Types (LandlordTracker의 인터페이스와 동일)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

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

const GRADE_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; label: string; badgeVariant: "success" | "info" | "warning" | "danger" }
> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "안전", badgeVariant: "success" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "양호", badgeVariant: "info" },
  C: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "주의", badgeVariant: "warning" },
  D: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "위험", badgeVariant: "danger" },
  F: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "매우 위험", badgeVariant: "danger" },
};

const RISK_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  LOW: { label: "안전", variant: "success" },
  MEDIUM: { label: "주의", variant: "warning" },
  HIGH: { label: "위험", variant: "danger" },
};

// ---------------------------------------------------------------------------
// 근저당 비율 게이지
// ---------------------------------------------------------------------------

function MortgageGauge({ ratio }: { ratio: number }) {
  const clampedRatio = Math.min(ratio, 100);
  const color =
    ratio > 70 ? "bg-red-500" : ratio > 50 ? "bg-amber-500" : ratio > 30 ? "bg-blue-500" : "bg-emerald-500";
  const textColor =
    ratio > 70 ? "text-red-700" : ratio > 50 ? "text-amber-700" : ratio > 30 ? "text-blue-700" : "text-emerald-700";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-[#6e6e73]">근저당 비율</span>
        <span className={`text-sm font-bold ${textColor}`}>{ratio}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[#f5f5f7]">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${clampedRatio}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#86868b]">
        <span>0%</span>
        <span>30%</span>
        <span>60%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function LandlordProfilePage() {
  const [inputName, setInputName] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const handleSearch = async () => {
    if (!inputName.trim()) return;

    setLoading(true);
    setError("");
    setProfile(null);

    try {
      const res = await fetch("/api/landlord/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: inputName.trim(),
          baseAddress: inputAddress.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "조회에 실패했습니다.");
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const gradeStyle = profile ? GRADE_CONFIG[profile.safetyGrade] || GRADE_CONFIG.C : null;

  return (
    <>
      <PageHeader
        icon={UserSearch}
        title="임대인 프로파일"
        description="임대인(소유자)의 종합 프로파일을 조회하고 위험도를 분석합니다"
      />

      {/* 검색 섹션 */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-[#1d1d1f]">임대인 조회</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[#6e6e73]">
                임대인(소유자)명 <span className="text-red-500">*</span>
              </label>
              <input
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="소유자명 입력"
                className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[#6e6e73]">
                물건 주소 <span className="text-[#86868b]">(선택)</span>
              </label>
              <input
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="서울시 강남구 역삼동 123-45"
                className="w-full rounded-xl border border-[#e5e5e7] px-4 py-2.5 text-sm focus:border-[#1d1d1f] focus:outline-none focus:ring-1 focus:ring-[#1d1d1f]"
              />
            </div>
            <div className="flex items-end">
              <Button
                icon={Search}
                onClick={handleSearch}
                loading={loading}
                disabled={!inputName.trim()}
              >
                조회
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 에러 */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#86868b]" />
          <p className="text-sm text-[#6e6e73]">임대인 프로파일을 조회하고 있습니다...</p>
        </div>
      )}

      {/* 프로파일 결과 */}
      {profile && !loading && (
        <div className="space-y-6">
          {/* 안전등급 대형 배지 + 요약 */}
          <Card>
            <div className="p-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                {/* 대형 등급 배지 */}
                <div
                  className={`flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center rounded-2xl border-2 ${gradeStyle?.bg} ${gradeStyle?.border}`}
                >
                  <span className={`text-4xl font-black ${gradeStyle?.text}`}>
                    {profile.safetyGrade}
                  </span>
                  <span className={`text-xs font-semibold ${gradeStyle?.text}`}>
                    {gradeStyle?.label}
                  </span>
                </div>

                {/* 요약 정보 */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-[#1d1d1f]">{profile.nameDisplay}</h2>
                  <p className="mt-1 text-sm text-[#6e6e73]">
                    종합점수 <span className="font-semibold text-[#1d1d1f]">{profile.gradeScore}점</span> / 100점
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge variant={gradeStyle?.badgeVariant || "neutral"} size="md">
                      소유물건 {profile.propertyCount}건
                    </Badge>
                    {profile.courtCaseCount > 0 && (
                      <Badge variant="danger" icon={Scale} size="md">
                        소송 {profile.courtCaseCount}건
                      </Badge>
                    )}
                    {profile.fraudCaseCount > 0 && (
                      <Badge variant="danger" icon={ShieldAlert} size="md">
                        사기사례 {profile.fraudCaseCount}건
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 제보 버튼 */}
                <div className="flex-shrink-0">
                  <Button
                    variant="danger"
                    icon={Megaphone}
                    size="sm"
                    onClick={() => setReportOpen(true)}
                  >
                    이 임대인 제보하기
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* KPI 카드 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <div className="p-4 text-center">
                <p className="text-xs text-[#6e6e73]">근저당 총액</p>
                <p className="mt-1 text-lg font-bold text-[#1d1d1f]">
                  {formatKRW(profile.totalMortgage)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-xs text-[#6e6e73]">압류 총액</p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    profile.totalLiens > 0 ? "text-red-600" : "text-[#1d1d1f]"
                  }`}
                >
                  {profile.totalLiens > 0 ? formatKRW(profile.totalLiens) : "없음"}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-xs text-[#6e6e73]">추정 자산가치</p>
                <p className="mt-1 text-lg font-bold text-[#1d1d1f]">
                  {formatKRW(profile.totalEstimatedValue)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <p className="text-xs text-[#6e6e73]">소유 물건</p>
                <p className="mt-1 text-lg font-bold text-[#1d1d1f]">
                  {profile.propertyCount}건
                </p>
              </div>
            </Card>
          </div>

          {/* 근저당 비율 게이지 */}
          <Card>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#6e6e73]" />
                <h3 className="text-sm font-semibold text-[#1d1d1f]">근저당 비율 분석</h3>
              </div>
              <MortgageGauge ratio={profile.mortgageRatio} />
              <p className="mt-3 text-xs text-[#6e6e73]">
                {profile.mortgageRatio > 70
                  ? "근저당 비율이 70%를 초과하여 매우 위험합니다. 전세 보증금 회수가 어려울 수 있습니다."
                  : profile.mortgageRatio > 50
                    ? "근저당 비율이 50%를 초과하여 주의가 필요합니다."
                    : profile.mortgageRatio > 30
                      ? "근저당 비율이 양호한 수준이지만 지속적인 모니터링이 권장됩니다."
                      : "근저당 비율이 안전한 수준입니다."}
              </p>
            </div>
          </Card>

          {/* 위험 요인 상세 */}
          {profile.riskFactors.length > 0 && (
            <Card>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">위험 요인 상세</h3>
                </div>
                <div className="space-y-2">
                  {profile.riskFactors.map((factor, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
                    >
                      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      <p className="text-sm text-amber-800">{factor}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* 사기 사례 매칭 */}
          {profile.fraudCaseCount > 0 && (
            <Card>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">사기 사례 매칭 결과</h3>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-800">
                    해당 임대인과 관련된 사기 사례가{" "}
                    <span className="font-bold">{profile.fraudCaseCount}건</span> 발견되었습니다.
                    거래 시 각별한 주의가 필요합니다.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 소유 물건 목록 */}
          <Card>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Building className="h-4 w-4 text-[#6e6e73]" />
                <h3 className="text-sm font-semibold text-[#1d1d1f]">소유 물건 목록</h3>
              </div>
              <div className="space-y-3">
                {profile.properties.map((prop, i) => {
                  const riskConf = RISK_CONFIG[prop.riskLevel];
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-3 rounded-xl border border-[#e5e5e7] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1d1d1f]">
                          {prop.address}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6e6e73]">
                          <span>추정시세 {formatKRW(prop.estimatedPrice)}</span>
                          <span>근저당 {formatKRW(prop.mortgageTotal)}</span>
                          {prop.liensTotal > 0 && (
                            <span className="text-red-600">
                              압류 {formatKRW(prop.liensTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={riskConf.variant} size="md">
                        {riskConf.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 미검색 상태 안내 */}
      {!profile && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5f5f7]">
            <UserSearch className="h-8 w-8 text-[#86868b]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1d1d1f]">임대인(소유자)명을 입력하세요</p>
            <p className="mt-1 text-xs text-[#86868b]">
              등기부등본에 기재된 소유자명으로 조회할 수 있습니다
            </p>
          </div>
        </div>
      )}

      {/* 제보 모달 */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        defaultLandlordName={profile?.nameDisplay?.replace(/O/g, "*") || inputName}
        defaultAddress={inputAddress}
      />
    </>
  );
}
