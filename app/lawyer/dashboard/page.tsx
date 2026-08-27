"use client";

import { useState } from "react";
import { type LawyerTabKey } from "./constants";
import { useLawyerDashboard } from "./hooks/useLawyerDashboard";
import { DashboardHero } from "./components/DashboardHero";
import { TabNav } from "./components/TabNav";
import { NoticesTab } from "./components/NoticesTab";
import { ConsultsTab } from "./components/ConsultsTab";
import { VisitsTab } from "./components/VisitsTab";
import { ProfileFieldTab } from "./components/ProfileFieldTab";
import { ProfileListTab } from "./components/ProfileListTab";

/** 변호사 전용 대시보드 — 에디토리얼 히어로 + 가로 탭 */
export default function LawyerDashboardPage() {
  const [tab, setTab] = useState<LawyerTabKey>("notices");
  const d = useLawyerDashboard();

  // keepzip 데이터에 의존하는 업무 탭만 로딩 게이팅 (내정보 탭은 자체 관리)
  const isBizTab = tab === "notices" || tab === "consults" || tab === "visits";

  return (
    <div className="pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 sm:px-10 py-8">
          <DashboardHero name={d.name} todoTotal={d.todoTotal} counts={d.counts} />
          <TabNav active={tab} onSelect={setTab} counts={d.counts} />

          {isBizTab && d.loading ? (
            <div className="py-20 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : (
            <>
              {tab === "notices" && <NoticesTab cases={d.cases} busy={d.busy} onApprove={d.approveCase} />}
              {tab === "consults" && <ConsultsTab consults={d.consults} />}
              {tab === "visits" && <VisitsTab visits={d.visits} busy={d.busy} onConfirm={d.confirmVisit} />}
              {(tab === "bio" || tab === "etc") && <ProfileFieldTab tabKey={tab} />}
              {(tab === "career" || tab === "school") && <ProfileListTab tabKey={tab} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
