"use client";

import { useState } from "react";
import { Code2, Key, Shield, Zap } from "lucide-react";

const endpoints = [
  {
    method: "POST" as const,
    path: "/api/analyze-rights",
    title: "권리분석 API",
    description: "등기부등본 기반 권리관계를 분석하고 위험 요소를 탐지합니다.",
    icon: Shield,
    request: `{
  "address": "서울시 강남구 테헤란로 123",
  "registryNumber": "1101-2024-012345",
  "analysisType": "full"
}`,
    response: `{
  "riskScore": 23,
  "riskLevel": "LOW",
  "issues": [],
  "ownerInfo": {
    "name": "홍**",
    "acquisitionDate": "2021-03-15"
  },
  "encumbrances": {
    "mortgage": 0,
    "seizure": 0,
    "provisionalDisposition": 0
  }
}`,
  },
  {
    method: "GET" as const,
    path: "/api/price-map",
    title: "시세지도 API",
    description: "지역별 부동산 시세 데이터를 지도 기반으로 조회합니다.",
    icon: Zap,
    params: [
      { name: "gu", type: "string", required: true, desc: "구 이름 (예: 강남구)" },
      { name: "type", type: "string", required: false, desc: "매물 유형 (아파트, 빌라, 오피스텔)" },
      { name: "minPrice", type: "number", required: false, desc: "최소 가격 (만원)" },
      { name: "maxPrice", type: "number", required: false, desc: "최대 가격 (만원)" },
    ],
    request: `GET /api/price-map?gu=강남구&type=아파트&minPrice=50000&maxPrice=150000`,
    response: `{
  "region": "강남구",
  "totalCount": 342,
  "avgPrice": 89500,
  "data": [
    {
      "name": "래미안 퍼스티지",
      "price": 125000,
      "area": 84.9,
      "lat": 37.4967,
      "lng": 127.0382
    }
  ]
}`,
  },
  {
    method: "POST" as const,
    path: "/api/chat",
    title: "AI 상담 API",
    description: "부동산 관련 질문에 AI가 실시간으로 답변합니다.",
    icon: Code2,
    request: `{
  "message": "전세 계약 시 확인해야 할 사항이 뭔가요?",
  "context": {
    "propertyType": "아파트",
    "region": "서울"
  }
}`,
    response: `{
  "reply": "전세 계약 시 확인사항을 안내드립니다...",
  "sources": [
    "주택임대차보호법 제3조",
    "대법원 판례 2023다12345"
  ],
  "relatedQuestions": [
    "전세보증보험 가입 조건은?",
    "확정일자와 전입신고 차이는?"
  ]
}`,
  },
  {
    method: "POST" as const,
    path: "/api/landlord/track",
    title: "임대인 조회 API",
    description: "임대인의 소유 이력 및 신뢰도를 분석합니다.",
    icon: Shield,
    request: `{
  "landlordName": "홍길동",
  "propertyAddress": "서울시 마포구 월드컵로 123"
}`,
    response: `{
  "trustScore": 87,
  "ownershipHistory": [
    {
      "property": "마포구 월드컵로 123",
      "since": "2019-06-01",
      "status": "보유중"
    }
  ],
  "totalProperties": 3,
  "litigationCount": 0,
  "taxDelinquency": false
}`,
  },
];

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  const color =
    method === "GET"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
      {method}
    </span>
  );
}

export default function ApiDocsPage() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleIssueKey = () => {
    alert("API 키 발급은 현재 준비 중입니다. 곧 서비스될 예정입니다.");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">API 문서</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          VESTRA 부동산 분석 API를 활용하여 서비스를 구축하세요
        </p>
      </div>

      {/* API 키 관리 */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Key className="mt-0.5 h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-bold text-gray-900">API 키 관리</p>
              <p className="mt-0.5 text-xs text-gray-500">
                API 키를 발급받아 서비스에 연동하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleIssueKey}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:w-auto"
          >
            API 키 발급
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white/80 p-3 text-center">
            <p className="text-xs text-gray-500">일일 요청</p>
            <p className="text-lg font-bold text-indigo-600">0 / 1,000</p>
          </div>
          <div className="rounded-lg bg-white/80 p-3 text-center">
            <p className="text-xs text-gray-500">이번 달 사용량</p>
            <p className="text-lg font-bold text-gray-900">0건</p>
          </div>
          <div className="rounded-lg bg-white/80 p-3 text-center">
            <p className="text-xs text-gray-500">API 키 상태</p>
            <p className="text-lg font-bold text-gray-400">미발급</p>
          </div>
        </div>
      </div>

      {/* 요금 안내 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-bold text-gray-900">요금 안내</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-indigo-600">무료</span> —
                1,000 요청/일
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">종량제</span> —
                1,000 요청 초과 시 건당 10원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API 엔드포인트 문서 */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-gray-900">API 엔드포인트</h2>
        <div className="space-y-3">
          {endpoints.map((ep, idx) => {
            const Icon = ep.icon;
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={ep.path}
                className="rounded-xl border border-gray-200 bg-white transition hover:border-indigo-300"
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <Icon className="h-5 w-5 shrink-0 text-indigo-500" />
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <MethodBadge method={ep.method} />
                    <code className="text-sm font-semibold text-gray-900">
                      {ep.path}
                    </code>
                  </div>
                  <span className="text-xs text-gray-400">
                    {isExpanded ? "접기" : "펼치기"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                    <p className="text-sm text-gray-600">{ep.description}</p>

                    {/* Query Params (GET) */}
                    {"params" in ep && ep.params && (
                      <div>
                        <p className="mb-2 text-xs font-bold text-gray-700">
                          Query Parameters
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-500">
                                <th className="pb-1.5 pr-4 font-medium">이름</th>
                                <th className="pb-1.5 pr-4 font-medium">타입</th>
                                <th className="pb-1.5 pr-4 font-medium">필수</th>
                                <th className="pb-1.5 font-medium">설명</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ep.params.map((p) => (
                                <tr key={p.name} className="border-b border-gray-50">
                                  <td className="py-1.5 pr-4 font-mono font-semibold text-indigo-600">
                                    {p.name}
                                  </td>
                                  <td className="py-1.5 pr-4 text-gray-500">
                                    {p.type}
                                  </td>
                                  <td className="py-1.5 pr-4">
                                    {p.required ? (
                                      <span className="text-red-500">Y</span>
                                    ) : (
                                      <span className="text-gray-400">N</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 text-gray-600">{p.desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request */}
                    <div>
                      <p className="mb-1.5 text-xs font-bold text-gray-700">
                        Request
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
                        <code>{ep.request}</code>
                      </pre>
                    </div>

                    {/* Response */}
                    <div>
                      <p className="mb-1.5 text-xs font-bold text-gray-700">
                        Response
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
                        <code>{ep.response}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 인증 안내 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-bold text-gray-900">인증 방법</p>
            <p className="mt-1 text-sm text-gray-600">
              모든 API 요청에 헤더로 API 키를 포함하세요.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
              <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
