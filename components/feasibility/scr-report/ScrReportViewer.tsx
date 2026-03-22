"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  FileText, Printer, Download, Building2, Users, BarChart3,
  Scale, TrendingUp, BookOpen, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { ScrReportData } from "@/lib/feasibility/scr-types";
import { ScrChapterI } from "./ScrChapterI";
import { ScrChapterII } from "./ScrChapterII";
import { ScrChapterIII } from "./ScrChapterIII";
import { ScrChapterIV } from "./ScrChapterIV";
import { ScrChapterV } from "./ScrChapterV";
import { ScrAppendices } from "./ScrAppendices";

interface ScrReportViewerProps {
  data: ScrReportData;
}

const TABS = [
  { id: "overview", label: "I. 사업개요", shortLabel: "I장", icon: Building2 },
  { id: "developer", label: "II. 시행사 분석", shortLabel: "II장", icon: Users },
  { id: "market", label: "III. 시장 분석", shortLabel: "III장", icon: BarChart3 },
  { id: "price", label: "IV. 분양가 적정성", shortLabel: "IV장", icon: Scale },
  { id: "repayment", label: "V. 상환 분석", shortLabel: "V장", icon: TrendingUp },
  { id: "appendices", label: "부록", shortLabel: "부록", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ScrReportViewer({ data }: ScrReportViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tabsRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handlePdf = useCallback(() => {
    // PDF 다운로드: print 대화상자에서 "PDF로 저장" 선택하도록 안내
    window.print();
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const amount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div className="space-y-5 print:space-y-3">
      {/* ─── 프론트매터 ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:shadow-none print:border-gray-200">
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 md:p-8">
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <FileText size={18} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">SCR 사업성 분석 보고서</p>
                <p className="text-xs text-gray-500 font-mono">{data.frontMatter.reportNumber}</p>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white mb-4">
              {data.frontMatter.projectName}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "시행사", value: data.frontMatter.developer },
                { label: "분석 담당", value: data.frontMatter.analyst },
                { label: "발행일", value: data.frontMatter.date },
                ...(data.metadata.vScore != null
                  ? [{ label: "V-Score", value: `${data.metadata.vScore}점` }]
                  : []),
              ].map((item) => (
                <div key={item.label} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-white truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {data.frontMatter.disclaimer && (
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed max-w-2xl">
                {data.frontMatter.disclaimer}
              </p>
            )}
          </div>
        </div>

        {/* ─── 액션 바 ─── */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f5f5f7] hover:bg-gray-200 text-[#1d1d1f] text-xs font-medium transition-colors"
          >
            <Printer size={14} strokeWidth={1.5} />
            인쇄
          </button>
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f5f5f7] hover:bg-gray-200 text-[#1d1d1f] text-xs font-medium transition-colors"
          >
            <Download size={14} strokeWidth={1.5} />
            PDF 저장
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-[#86868b]">
            v{data.metadata.version} | {data.metadata.generatedAt}
          </span>
        </div>
      </div>

      {/* ─── 탭 네비게이션 ─── */}
      <div className="print:hidden">
        <div className="relative">
          {/* 좌우 스크롤 버튼 (모바일) */}
          <button
            onClick={() => scrollTabs("left")}
            className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white to-transparent flex items-center justify-center md:hidden"
            aria-label="탭 왼쪽 스크롤"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => scrollTabs("right")}
            className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white to-transparent flex items-center justify-center md:hidden"
            aria-label="탭 오른쪽 스크롤"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>

          <div
            ref={tabsRef}
            className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1 py-1 rounded-2xl bg-[#f5f5f7]"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    isActive
                      ? "bg-white text-[#1d1d1f] shadow-sm"
                      : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white/50"
                  )}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 탭 콘텐츠 ─── */}
      <div>
        {/* 인쇄 시 챕터 제목 표시 */}
        <h2 className="hidden print:block text-lg font-bold text-[#1d1d1f] mb-4 print:break-before-page">
          {TABS.find((t) => t.id === activeTab)?.label}
        </h2>

        {activeTab === "overview" && <ScrChapterI data={data.projectOverview} />}
        {activeTab === "developer" && <ScrChapterII data={data.developerAnalysis} />}
        {activeTab === "market" && <ScrChapterIII data={data.marketAnalysis} />}
        {activeTab === "price" && <ScrChapterIV data={data.priceAdequacy} />}
        {activeTab === "repayment" && <ScrChapterV data={data.repaymentAnalysis} />}
        {activeTab === "appendices" && <ScrAppendices data={data.appendices} />}
      </div>

      {/* ─── 탭 전환 네비게이션 (하단) ─── */}
      <div className="flex items-center justify-between pt-2 print:hidden">
        <button
          onClick={() => {
            if (activeIndex > 0) setActiveTab(TABS[activeIndex - 1].id);
          }}
          disabled={activeIndex === 0}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors",
            activeIndex === 0
              ? "text-gray-300 cursor-not-allowed"
              : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
          )}
        >
          <ChevronLeft size={14} />
          {activeIndex > 0 ? TABS[activeIndex - 1].label : "이전"}
        </button>
        <span className="text-[10px] text-[#86868b]">
          {activeIndex + 1} / {TABS.length}
        </span>
        <button
          onClick={() => {
            if (activeIndex < TABS.length - 1) setActiveTab(TABS[activeIndex + 1].id);
          }}
          disabled={activeIndex === TABS.length - 1}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors",
            activeIndex === TABS.length - 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
          )}
        >
          {activeIndex < TABS.length - 1 ? TABS[activeIndex + 1].label : "다음"}
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ─── 인쇄 전용 스타일 ─── */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-200 { border-color: #e5e7eb !important; }
          .print\\:break-before-page { break-before: page; }
          .print\\:space-y-3 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0.75rem * var(--tw-space-y-reverse));
          }
          /* 표 페이지 넘김 방지 */
          table { break-inside: avoid; }
          .rounded-2xl { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
