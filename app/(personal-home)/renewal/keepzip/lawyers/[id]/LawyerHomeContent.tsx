"use client";

import { useState } from "react";
import s from "../../keepzip-renewal.module.css";
import RenewalGnb from "../../../_shared/RenewalGnb";
import { KeepzipDraftForm } from "../../components/KeepzipDraftForm";
import { ExpertInquiryForm } from "@/components/keepzip/ExpertInquiryForm";
import type { Expert } from "@/components/expert/ExpertCard";

type Tab = "notice" | "consult" | "visit";
const TABS: { key: Tab; label: string }[] = [
  { key: "notice", label: "내용증명 작성" },
  { key: "consult", label: "상담 문의" },
  { key: "visit", label: "방문 예약" },
];

/** 변호사 미니홈페이지 — 프로필 + 내용증명·상담·방문 (설계서 §4 액션 허브) */
export default function LawyerHomeContent({ expert }: { expert: Expert }) {
  const [tab, setTab] = useState<Tab>("notice");

  return (
    <>
      <RenewalGnb active="keepzip" />

      <section className={s.lawyerHero}>
        <div className={s.lawyerHeroIn}>
          <div className={s.lawyerAvatar}>{expert.name.charAt(0)}</div>
          <div>
            <div className={s.lawyerNameRow}>
              <span className={s.lawyerName}>{expert.name}</span>
              <span className={s.lawyerCat}>{expert.category}</span>
            </div>
            <div className={s.lawyerMeta}>
              <span>★ {expert.rating.toFixed(1)} ({expert.reviewCount})</span>
              <span>경력 {expert.experience}년</span>
            </div>
            <div className={s.lawyerSpecs}>
              {expert.specialties.map((sp) => (
                <span key={sp} className={s.lawyerSpec}>{sp}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 액션 탭 */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "notice" && <KeepzipDraftForm lawyerName={expert.name} lawyerId={expert.id} />}
      {tab === "consult" && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <ExpertInquiryForm lawyerId={expert.id} lawyerName={expert.name} mode="consult" />
        </div>
      )}
      {tab === "visit" && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <ExpertInquiryForm lawyerId={expert.id} lawyerName={expert.name} mode="visit" />
        </div>
      )}
    </>
  );
}
