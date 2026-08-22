"use client";

import s from "../../keepzip-renewal.module.css";
import RenewalGnb from "../../../_shared/RenewalGnb";
import { KeepzipDraftForm } from "../../components/KeepzipDraftForm";
import type { Expert } from "@/components/expert/ExpertCard";

/** 변호사 미니홈페이지 — 프로필 + 그 자리에서 내용증명 작성 (설계서 §4 액션 허브) */
export default function LawyerHomeContent({ expert }: { expert: Expert }) {
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

      <KeepzipDraftForm lawyerName={expert.name} />
    </>
  );
}
