"use client";

import { useState } from "react";
import { type LawyerTabKey } from "./constants";
import { SidebarNav } from "./components/SidebarNav";
import { NoticesTab } from "./components/NoticesTab";
import { ConsultsTab } from "./components/ConsultsTab";
import { ProfileFieldTab } from "./components/ProfileFieldTab";
import { ProfileListTab } from "./components/ProfileListTab";
import { VisitsTab } from "./components/VisitsTab";

/** 변호사 전용 대시보드 — 2컬럼(사이드바 + 콘텐츠) */
export default function LawyerDashboardPage() {
  const [tab, setTab] = useState<LawyerTabKey>("notices");

  return (
    <div className="pb-12 pt-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-xl font-bold mb-1">변호사 대시보드</h1>
        <p className="text-sm text-gray-500 mb-6">사건 검수·직인, 상담·방문 관리, 미니홈페이지 정보를 관리합니다.</p>

        <div className="flex gap-6 items-start">
          {/* 좌: 사이드바 */}
          <aside className="w-44 shrink-0">
            <SidebarNav active={tab} onSelect={setTab} />
          </aside>

          {/* 우: 콘텐츠 */}
          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-5">
            {tab === "notices" && <NoticesTab />}
            {tab === "consults" && <ConsultsTab />}
            {tab === "visits" && <VisitsTab />}
            {(tab === "bio" || tab === "etc") && <ProfileFieldTab tabKey={tab} />}
            {(tab === "career" || tab === "school") && <ProfileListTab tabKey={tab} />}
          </div>
        </div>
      </div>
    </div>
  );
}
