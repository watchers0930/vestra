"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { PROFILE_SUBMENU, type LawyerTabKey } from "../constants";
import { ProfileFieldTab } from "../components/ProfileFieldTab";
import { ProfileListTab } from "../components/ProfileListTab";

/** 내정보 — 미니홈페이지 프로필(약력·경력·학교·기타) 관리 */
export default function LawyerProfilePage() {
  const [tab, setTab] = useState<LawyerTabKey>("bio");

  return (
    <div>
      <DashboardPageTopbar current="내정보" primaryHref="/lawyer" primaryLabel="대시보드" />
      <div className="pt-[52px] mt-4">
        <PageHeader icon={UserCog} title="내정보" description="미니홈페이지에 노출되는 프로필 정보를 관리합니다." />

        {/* 서브탭 pill */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PROFILE_SUBMENU.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setTab(m.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === m.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {(tab === "bio" || tab === "etc") && <ProfileFieldTab tabKey={tab} />}
        {(tab === "career" || tab === "school") && <ProfileListTab tabKey={tab} />}
      </div>
    </div>
  );
}
