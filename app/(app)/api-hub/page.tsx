"use client";

import { Database, CheckCircle, Clock, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Alert } from "@/components/common";

const APIs = [
  {
    name: "국토교통부 실거래가 API",
    source: "국토교통부",
    endpoint: "apis.data.go.kr",
    status: "active",
    refreshRate: "일 1회",
    modules: ["대시보드", "권리분석", "가치예측"],
    dataType: "실거래 데이터",
    color: "bg-blue-500",
    description: "아파트, 단독주택, 오피스텔 실거래가 정보",
  },
  {
    name: "인터넷등기소 API",
    source: "대법원",
    endpoint: "iros.go.kr",
    status: "active",
    refreshRate: "실시간",
    modules: ["권리분석", "전세보호"],
    dataType: "등기부등본",
    color: "bg-purple-500",
    description: "소유권, 근저당, 전세권, 가압류 등 권리관계",
  },
  {
    name: "법령정보 API",
    source: "법제처",
    endpoint: "law.go.kr",
    status: "active",
    refreshRate: "실시간",
    modules: ["계약검토", "전세보호"],
    dataType: "규제·법령",
    color: "bg-indigo-500",
    description: "부동산 관련 법률, 시행령, 시행규칙",
  },
  {
    name: "판례정보 API",
    source: "대법원",
    endpoint: "law.go.kr",
    status: "active",
    refreshRate: "주 1회",
    modules: ["계약검토", "AI 어시스턴트"],
    dataType: "계약·법률",
    color: "bg-violet-500",
    description: "부동산 관련 대법원 판례, 하급심 판결",
  },
  {
    name: "KOSIS API",
    source: "통계청",
    endpoint: "kosis.kr",
    status: "active",
    refreshRate: "월/분기",
    modules: ["가치예측"],
    dataType: "인구·상권",
    color: "bg-teal-500",
    description: "인구, 세대수, 상권분석, 경제지표",
  },
  {
    name: "홈택스 API",
    source: "국세청",
    endpoint: "hometax.go.kr",
    status: "active",
    refreshRate: "월 1회",
    modules: ["세무 시뮬레이션"],
    dataType: "금융·자산",
    color: "bg-emerald-500",
    description: "세율 정보, 공시가격, 세금 기준 데이터",
  },
  {
    name: "DART API",
    source: "금융감독원",
    endpoint: "dart.fss.or.kr",
    status: "active",
    refreshRate: "월 1회",
    modules: ["금융환경 분석"],
    dataType: "금융·자산",
    color: "bg-cyan-500",
    description: "건설사 재무정보, 시행사 공시",
  },
  {
    name: "ECOS API",
    source: "한국은행",
    endpoint: "ecos.bok.or.kr",
    status: "active",
    refreshRate: "월 1회",
    modules: ["가치예측"],
    dataType: "금융·자산",
    color: "bg-sky-500",
    description: "기준금리, 통화량, 경제성장률",
  },
  {
    name: "국토정보 API",
    source: "국토정보플랫폼",
    endpoint: "nsdi.go.kr",
    status: "active",
    refreshRate: "월 1회",
    modules: ["권리분석"],
    dataType: "공간·입지",
    color: "bg-orange-500",
    description: "용도지역, 건축물대장, GIS 공간정보",
  },
  {
    name: "공공데이터포털",
    source: "data.go.kr",
    endpoint: "data.go.kr",
    status: "active",
    refreshRate: "수시",
    modules: ["범용 보완"],
    dataType: "범용",
    color: "bg-gray-500",
    description: "정부 및 공공기관 개방 데이터 통합",
  },
];

const dataTypes = [
  { type: "실거래 데이터", color: "bg-blue-100 text-blue-700", count: 1 },
  { type: "등기부등본", color: "bg-purple-100 text-purple-700", count: 1 },
  { type: "규제·법령", color: "bg-indigo-100 text-indigo-700", count: 1 },
  { type: "계약·법률", color: "bg-violet-100 text-violet-700", count: 1 },
  { type: "인구·상권", color: "bg-teal-100 text-teal-700", count: 1 },
  { type: "금융·자산", color: "bg-emerald-100 text-emerald-700", count: 3 },
];

export default function ApiHubPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader icon={Database} title="API 데이터 허브" description="10개 공공기관 API 연동 현황" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">10</div>
          <div className="text-sm text-secondary">연동 API 수</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">10</div>
          <div className="text-sm text-secondary">정상 작동</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">6종</div>
          <div className="text-sm text-secondary">데이터 유형</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">8개</div>
          <div className="text-sm text-secondary">연동 모듈</div>
        </Card>
      </div>

      {/* Data Types */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4">6종 데이터 유형</h3>
        <div className="flex flex-wrap gap-3">
          {dataTypes.map((dt) => (
            <div key={dt.type} className={cn("px-4 py-2 rounded-lg text-sm font-medium", dt.color)}>
              {dt.type} ({dt.count}개 API)
            </div>
          ))}
        </div>
      </Card>

      {/* API Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {APIs.map((api) => (
          <Card key={api.name} hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", api.color)}>
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{api.name}</h4>
                  <p className="text-xs text-muted">{api.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">정상</span>
              </div>
            </div>

            <p className="text-xs text-secondary mb-3">{api.description}</p>

            <div className="flex items-center gap-4 text-xs text-muted mb-3">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {api.refreshRate}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={12} />
                {api.endpoint}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {api.modules.map((mod) => (
                <span key={mod} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                  {mod}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Note */}
      <div className="mt-6">
        <Alert variant="info">
          <div className="flex items-start gap-2">
            <RefreshCw size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">데이터 갱신 안내</p>
              <p className="text-xs">
                각 API의 데이터는 명시된 갱신 주기에 따라 자동으로 업데이트됩니다.
                실시간 API는 요청 시마다 최신 데이터를 조회하며, 정기 갱신 API는 캐시를 통해 빠른 응답을 제공합니다.
              </p>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
}
