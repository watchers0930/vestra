"use client";

import { useState } from "react";
import { LAWYER_TABS, type LawyerTabKey } from "./constants";
import { NoticesTab } from "./components/NoticesTab";
import { ConsultsTab } from "./components/ConsultsTab";
import { ProfileFieldTab } from "./components/ProfileFieldTab";
import { VisitsTab } from "./components/VisitsTab";

/** 변호사 전용 대시보드 — 내용증명·상담문의·프로필·방문예약 (설계서 §4) */
export default function LawyerDashboardPage() {
  const [tab, setTab] = useState<LawyerTabKey>("notices");

  return (
    <div className="pb-12 pt-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-xl font-bold mb-1">변호사 대시보드</h1>
        <p className="text-sm text-gray-500 mb-5">사건 검수·직인, 상담·방문 관리, 미니홈페이지 프로필을 관리합니다.</p>

        {/* 탭 네비 */}
        <div className="flex flex-wrap gap-1 border-b mb-6">
          {LAWYER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 활성 탭 */}
        {tab === "notices" && <NoticesTab />}
        {tab === "consults" && <ConsultsTab />}
        {tab === "visits" && <VisitsTab />}
        {(tab === "bio" || tab === "career" || tab === "school" || tab === "etc") && (
          <ProfileFieldTab tabKey={tab} />
        )}
      </div>
    </div>
  );
}
