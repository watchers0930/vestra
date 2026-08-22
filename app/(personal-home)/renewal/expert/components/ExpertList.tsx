"use client";

import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import { EXPERTS } from "@/app/(app)/expert-connect/constants";

function formatFee(fee: number) {
  if (fee >= 10000) return `상담료 ${(fee / 10000).toLocaleString()}만원`;
  return `상담료 ${fee.toLocaleString()}원`;
}

interface ExpertListProps {
  /** 선택된 영역의 category 필터 (없으면 전체) */
  categories?: string[];
  fieldLabel?: string;
  onConsult: (expert: Expert) => void;
}

/** STEP 2 — 선택한 영역의 전문가 목록. 변호사=내용증명 작성, 그 외=상담 요청. */
export default function ExpertList({ categories, fieldLabel, onConsult }: ExpertListProps) {
  const list = categories?.length
    ? EXPERTS.filter((e) => categories.includes(e.category))
    : EXPERTS;

  return (
    <div className={s.block}>
      <p className={s.secEyebrow}>Expert List</p>
      <h2 className={s.secTitle}>{fieldLabel ? `${fieldLabel} 전문가` : "전문가 목록"}</h2>
      <p className={s.secDesc}>
        검증된 전문가를 선택하세요. 상담료와 평점을 비교해 나에게 맞는 전문가를 찾을 수 있습니다.
      </p>
      <div className={s.expertGrid}>
        {list.map((expert) => (
          <div key={expert.id} className={s.excard}>
            <div className={s.exHead}>
              <div className={s.exAvatar}>{expert.name.charAt(0)}</div>
              <div className={s.exId}>
                <div className={s.exNameRow}>
                  <span className={s.exName}>{expert.name}</span>
                  <span className={s.exVerify}>✔</span>
                </div>
                <div className={s.exCat}>{expert.category}</div>
              </div>
              <div className={s.exRate}>
                <span className={s.exStar}>★</span>
                <span className={s.exRateN}>{expert.rating.toFixed(1)}</span>
                <span className={s.exRateC}>({expert.reviewCount})</span>
              </div>
            </div>
            <div className={s.exSpecs}>
              {expert.specialties.map((sp) => (
                <span key={sp} className={s.exSpec}>{sp}</span>
              ))}
            </div>
            <div className={s.exMeta}>
              <span>경력 {expert.experience}년</span>
              <span className={s.exFee}>{formatFee(expert.consultFee)}</span>
            </div>
            <button
              className={`${s.exBtn} ${expert.available ? "" : s.off}`}
              disabled={!expert.available}
              onClick={() => expert.available && onConsult(expert)}
            >
              {!expert.available
                ? "상담 마감"
                : expert.category === "변호사"
                ? "내용증명 작성하기"
                : "상담 요청"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
