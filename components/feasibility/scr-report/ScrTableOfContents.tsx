"use client";

import { FileText } from "lucide-react";

interface ScrTableOfContentsProps {
  projectName: string;
  reportNumber: string;
  date: string;
}

const TOC_ENTRIES = [
  {
    chapter: "I",
    title: "사업 개요",
    sub: [
      "표1~5. 사업개요 요약",
      "표6. 사업구조도",
      "표7~8. 일정 계획",
      "표9~14. 분양계획(확장 전/후)",
      "표15~17. 납부일정",
      "표18~20. 자금조달 계획",
      "표21~22. 토지현황",
    ],
  },
  {
    chapter: "II",
    title: "시행사 분석",
    sub: [
      "표23. 시행사 개요",
      "표24. 손익계산서 추이 / 그림5. 매출·영업이익",
      "표25. 수익성 지표",
      "표26. 재무안정성 지표",
      "표27. 현금흐름 요약 / 그림6. 현금흐름 차트",
    ],
  },
  {
    chapter: "III",
    title: "시장 분석",
    sub: [
      "표28. 인구·세대 추이 / 그림7~8. 인구·세대 차트",
      "표29. 연령별 인구 / 그림9. 연령 분포",
      "그림10. 주택보급률 추이",
      "그림11. 미분양 추이",
      "그림12. 거래량 추이",
      "그림13. 주택 유형·노후도 분포",
    ],
  },
  {
    chapter: "IV",
    title: "분양가 적정성",
    sub: [
      "표30. 입지여건 / 그림14. 위치도",
      "표31. 인근 개발 계획",
      "표32. 지역 평균 시세·분양가 추이",
      "표33~36. 매매·분양 사례",
      "표37. 프리미엄 분석",
      "표38~39. 분양가 적정성 의견 / 그림16. 분양가 비교",
    ],
  },
  {
    chapter: "V",
    title: "상환 분석",
    sub: [
      "표40. 기간별 분양률",
      "표41. 사업수지 / 그림17. 수입·지출 비교",
      "그림18. 사업비 구성",
      "표42~43. 자금흐름 요약·자금조달",
      "표44~46. 월별 자금흐름 / 그림19. 누적 현금흐름",
      "표47~49. 시나리오·민감도 분석",
      "표50~52. BEP 분석 / 그림20. BEP 분양률",
    ],
  },
  {
    chapter: "부록",
    title: "부록",
    sub: [
      "부록1. 정책 변동 이력",
      "부록2. 주요 대출 규제",
      "부록3. 투기과열지구·조정대상지역",
      "부록4. HUG 고분양가 관리지역",
      "부록5. 인근 개발 정보",
      "부록6. 금리 추이 차트",
      "부록7. 가격지수 추이 차트",
    ],
  },
];

export function ScrTableOfContents({ projectName, reportNumber, date }: ScrTableOfContentsProps) {
  return (
    <div className="py-8 px-6">
      {/* 제목 */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <FileText size={20} className="text-[#1d1d1f]" strokeWidth={1.5} />
          <span className="text-xs text-[#86868b] uppercase tracking-widest font-medium">
            목 차
          </span>
        </div>
        <h2 className="text-lg font-bold text-[#1d1d1f] mb-1">{projectName}</h2>
        <p className="text-xs text-[#86868b]">{reportNumber} | {date}</p>
      </div>

      {/* 장별 목차 */}
      <div className="space-y-5 max-w-xl mx-auto">
        {TOC_ENTRIES.map((entry) => (
          <div key={entry.chapter}>
            <div className="flex items-baseline gap-3 pb-1.5 border-b border-gray-200">
              <span className="text-sm font-bold text-[#1d1d1f] shrink-0 w-8">
                {entry.chapter}
              </span>
              <span className="text-sm font-bold text-[#1d1d1f]">
                {entry.title}
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5 pl-11">
              {entry.sub.map((item) => (
                <li key={item} className="text-[11px] text-[#6e6e73] leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 하단 구분선 */}
      <div className="mt-10 pt-4 border-t border-gray-200 text-center">
        <p className="text-[10px] text-[#86868b]">
          STRICTLY CONFIDENTIAL — 본 보고서는 기밀 문서입니다
        </p>
      </div>
    </div>
  );
}
