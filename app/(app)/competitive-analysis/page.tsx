"use client";

import { useRef } from "react";
import { BarChart3, CheckCircle2, FileText, Target } from "lucide-react";
import { PdfDownloadButton } from "@/components/common/PdfDownloadButton";

const competitors = [
  {
    name: "VESTRA",
    position: "AI 부동산 안전진단/권리분석 플랫폼",
    strengths: "전세 리스크, 등기/권리, 계약서, 세금, 시세예측, 리포트 통합",
    limits: "브랜드 인지도와 실매물 유입 채널은 성장 단계",
    vestraEdge: "계약 전 위험 판단과 AI 분석 리포트에 집중",
    score: "8.2",
  },
  {
    name: "네이버페이 부동산",
    position: "대중형 매물/시세 포털",
    strengths: "매물, 시세, 분양, 뉴스, 커뮤니티 접근성이 강함",
    limits: "권리분석과 계약 리스크 리포트는 핵심 사용 흐름이 아님",
    vestraEdge: "매물 탐색 이후 계약 판단 보조 레이어로 차별화",
    score: "8.7",
  },
  {
    name: "직방",
    position: "매물 검색/중개 플랫폼",
    strengths: "원룸, 오피스텔, 빌라, 아파트 매물 접근성이 높음",
    limits: "위험분석보다 매물 탐색과 중개 연결 중심",
    vestraEdge: "이 매물을 계약해도 되는지 판단하는 분석 영역에 강점",
    score: "8.4",
  },
  {
    name: "호갱노노",
    position: "아파트 실거래/입지 데이터 서비스",
    strengths: "실거래가, 가격변동, 개발호재, 상권, 인구, 공급 시각화",
    limits: "아파트 중심이며 계약서/등기 위험분석은 제한적",
    vestraEdge: "시세 판단 이후 권리, 전세, 계약 리스크까지 확장",
    score: "8.6",
  },
  {
    name: "아실",
    position: "아파트 빅데이터/투자 분석",
    strengths: "입주물량, 미분양, 인구, 전세가율, 거래회전율 등 투자 지표",
    limits: "투자 데이터 중심으로 개인 계약 안전성 분석은 약함",
    vestraEdge: "임차인과 계약자 관점의 안전진단에 집중",
    score: "8.3",
  },
  {
    name: "부동산플래닛",
    position: "부동산 데이터/AI시세/자산관리",
    strengths: "전 유형 부동산 데이터, AI시세, 노후도, 자산관리 기능",
    limits: "B2B, 투자, 자산관리 색채가 강함",
    vestraEdge: "전세사기, 권리관계, 계약 리포트에 더 직접적",
    score: "8.5",
  },
  {
    name: "공공 전세사기 위험도 서비스",
    position: "공공 전세사기 예방 서비스",
    strengths: "주소 기반 위험도 분석과 공공 데이터 신뢰성",
    limits: "지역, 대상, 횟수, 운영 범위 제한 가능성",
    vestraEdge: "민간 SaaS로 전국/상시/부가 기능 확장 가능",
    score: "8.0",
  },
];

const metrics = [
  { label: "계약 전 위험진단", value: "매우 강함" },
  { label: "권리/등기 분석", value: "강함" },
  { label: "실매물 유입", value: "보완 필요" },
  { label: "사업계획서 설득력", value: "강함" },
];

export default function CompetitiveAnalysisPage() {
  const reportRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-950">경쟁사 대비 사업계획서용 비교표</h1>
            <p className="mt-1 text-sm text-gray-500">
              VESTRA의 포지셔닝, 경쟁 우위, 보완 과제를 제안서 형식으로 정리합니다.
            </p>
          </div>
        </div>
        <PdfDownloadButton
          targetRef={reportRef}
          filename="VESTRA-경쟁사-비교분석.pdf"
          title="VESTRA 경쟁사 비교분석"
        />
      </div>

      <div
        ref={reportRef}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 text-gray-950 sm:p-8"
      >
        <header className="border-b border-gray-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-600">VESTRA Business Plan Appendix</p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">경쟁사 비교 및 차별화 전략</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                VESTRA는 매물 탐색 플랫폼이 아니라, 사용자가 계약 전에 법적·재무적 위험을 판단하도록 돕는
                AI 부동산 안전진단 플랫폼으로 포지셔닝합니다.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-semibold text-gray-900">종합 평가</p>
              <p className="mt-1 text-2xl font-black text-blue-600">8.2 / 10</p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-500">{metric.label}</p>
              <p className="mt-2 text-base font-bold text-gray-950">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-gray-950">핵심 포지셔닝</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                부동산을 찾는 서비스가 아니라, 계약해도 되는지 판단해주는 AI 부동산 안전진단 플랫폼.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-gray-950">경쟁사 비교표</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-[1120px] w-full border-collapse text-left text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="w-[120px] border-b border-gray-200 px-4 py-3 font-bold">서비스</th>
                  <th className="w-[210px] border-b border-gray-200 px-4 py-3 font-bold">주 포지션</th>
                  <th className="w-[260px] border-b border-gray-200 px-4 py-3 font-bold">강점</th>
                  <th className="w-[230px] border-b border-gray-200 px-4 py-3 font-bold">VESTRA 대비 약점</th>
                  <th className="w-[230px] border-b border-gray-200 px-4 py-3 font-bold">VESTRA 차별화</th>
                  <th className="w-[80px] border-b border-gray-200 px-4 py-3 text-center font-bold">평점</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((item) => (
                  <tr key={item.name} className={item.name === "VESTRA" ? "bg-blue-50/70" : "bg-white"}>
                    <td className="border-b border-gray-100 px-4 py-3 align-top font-bold text-gray-950">{item.name}</td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700">{item.position}</td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700">{item.strengths}</td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700">{item.limits}</td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top text-gray-700">{item.vestraEdge}</td>
                    <td className="border-b border-gray-100 px-4 py-3 text-center align-top font-black text-blue-600">
                      {item.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-bold text-gray-950">사업계획서 강조점</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              <li>매물 검색 시장이 아닌 계약 위험진단 시장으로 진입합니다.</li>
              <li>등기, 계약서, 시세, 세금, 리포트를 하나의 의사결정 흐름으로 묶습니다.</li>
              <li>공공 서비스보다 상시성, 확장성, 리포트 UX에서 민간 SaaS 장점이 있습니다.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-950">보완 과제</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
              <li>브랜드 신뢰 확보를 위해 전문가 검증과 사례 기반 리포트가 필요합니다.</li>
              <li>실매물 플랫폼과 직접 경쟁하지 않고 후속 검증 레이어로 연동 전략을 잡아야 합니다.</li>
              <li>AI 판단의 근거, 데이터 출처, 책임 범위를 명확히 표시해야 합니다.</li>
            </ul>
          </div>
        </section>

        <footer className="border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500">
          <p>기준: 공개 서비스 포지셔닝 및 VESTRA 현재 제품 구조 기준 비교</p>
          <p>용도: 사업계획서, 제안서, IR 보조자료</p>
        </footer>
      </div>
    </div>
  );
}
