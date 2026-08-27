"use client";

import Link from "next/link";
import { FileText, MessageSquare, CalendarCheck, Stamp, ChevronRight } from "lucide-react";
import { DashboardKpiCard } from "../../dashboard/components/DashboardKpiCard";

interface Props {
  counts: { notices: number; consults: number; visits: number };
  doneCount: number;
}

const SHORTCUTS = [
  { href: "/lawyer/notices", icon: FileText, label: "내용증명", desc: "검수·전자직인" },
  { href: "/lawyer/consults", icon: MessageSquare, label: "상담문의", desc: "상담 요청 확인" },
  { href: "/lawyer/visits", icon: CalendarCheck, label: "방문예약", desc: "예약 확정" },
];

/** 변호사 대시보드 요약 — KPI 카드 그리드 + 업무 바로가기 */
export function LawyerSummary({ counts, doneCount }: Props) {
  return (
    <div className="space-y-8">
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px]">
        <DashboardKpiCard
          label="검수 대기"
          value={`${counts.notices}건`}
          description="전자직인이 필요한 내용증명"
          icon={FileText}
          colorAccent="blue"
        />
        <DashboardKpiCard
          label="신규 상담"
          value={`${counts.consults}건`}
          description="답변 대기 중인 상담문의"
          icon={MessageSquare}
          colorAccent="green"
        />
        <DashboardKpiCard
          label="방문 예약"
          value={`${counts.visits}건`}
          description="확정 대기 중인 방문 요청"
          icon={CalendarCheck}
          colorAccent="orange"
        />
        <DashboardKpiCard
          label="직인 완료"
          value={`${doneCount}건`}
          description="검수·발송 처리한 누적 사건"
          icon={Stamp}
          colorAccent="red"
        />
      </div>

      {/* 업무 바로가기 */}
      <div>
        <h2 className="text-sm font-bold text-[#1d1d1f] mb-3">업무 바로가기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-3 rounded-[16px] border border-black/[0.08] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
            >
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[#f5f5f7]">
                <s.icon size={19} strokeWidth={1.7} className="text-[#1d1d1f]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-[#1d1d1f]">{s.label}</div>
                <div className="text-[12px] text-[#6e6e73]">{s.desc}</div>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
