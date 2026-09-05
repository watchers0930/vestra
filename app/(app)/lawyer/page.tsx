"use client";

import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useLawyerDashboard } from "./hooks/useLawyerDashboard";
import { LawyerSummary } from "./components/LawyerSummary";

/** 변호사 대시보드 요약 — 공용 셸(사이드바) 안에서 KPI + 바로가기 */
export default function LawyerDashboardPage() {
  const d = useLawyerDashboard();
  const doneCount = d.cases.filter((c) => c.status === "lawyer_approved").length;

  return (
    <div>
      <DashboardPageTopbar current="변호사 대시보드" primaryHref="/lawyer/notices" primaryLabel="내용증명 검수" />
      <div className="">
        <div className="mb-6 mt-4">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
            {d.name}님, 안녕하세요
          </h1>
          <p className="mt-1 text-sm text-[#6e6e73]">
            {d.loading
              ? "현황을 불러오는 중입니다…"
              : d.todoTotal > 0
                ? `오늘 처리할 사건이 ${d.todoTotal}건 있습니다.`
                : "대기 중인 사건이 없습니다. 좋은 하루 되세요."}
          </p>
        </div>

        <LawyerSummary counts={d.counts} doneCount={doneCount} />
      </div>
    </div>
  );
}
