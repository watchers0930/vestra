"use client";

import { Brain, UserCheck, FileCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";

export function ProcessInfographic() {
  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">AI + 전문가 하이브리드 검증 프로세스</h2>
        <p className="text-sm text-[#6e6e73] mb-8">AI가 빠르게 1차 분석하고, 전문가가 정밀 검증하는 2단계 프로세스</p>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0">
          <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Brain className="h-7 w-7 text-blue-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">1단계: AI 즉시 분석</h3>
            <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
              문서 업로드 즉시 AI가<br />권리관계·위험요소를 분석
            </p>
            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-medium text-blue-600">
              평균 3.2초 소요
            </div>
          </div>

          <div className="flex-shrink-0 p-2">
            <ArrowRight className="h-5 w-5 text-[#86868b] rotate-90 md:rotate-0" />
          </div>

          <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <UserCheck className="h-7 w-7 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">2단계: 전문가 정밀 검증</h3>
            <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
              공인중개사·법무사가<br />AI 분석 결과를 교차 검증
            </p>
            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-medium text-emerald-600">
              24시간 내 완료
            </div>
          </div>

          <div className="flex-shrink-0 p-2">
            <ArrowRight className="h-5 w-5 text-[#86868b] rotate-90 md:rotate-0" />
          </div>

          <div className="flex-1 text-center p-6 rounded-xl bg-[#f5f5f7]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <FileCheck className="h-7 w-7 text-purple-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-[#1d1d1f]">최종: 검증 완료 보고서</h3>
            <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
              AI 분석 + 전문가 의견이<br />통합된 최종 보고서 제공
            </p>
            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-[10px] font-medium text-purple-600">
              신뢰도 99%+
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
