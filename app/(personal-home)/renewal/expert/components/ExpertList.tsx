"use client";

import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import { EXPERTS } from "@/app/(app)/expert-connect/constants";

function formatFee(fee: number) {
  if (fee >= 10000) return `상담료 ${(fee / 10000).toLocaleString()}만원`;
  return `상담료 ${fee.toLocaleString()}원`;
}

interface ExpertListProps {
  onConsult: (expert: Expert) => void;
}

/** 전문가 목록 카드 (실데이터: constants.EXPERTS). 시안 excard 스타일 유지. */
export default function ExpertList({ onConsult }: ExpertListProps) {
  return (
    <div className={s.block}>
      <p className={s.secEyebrow}>Expert List</p>
      <h2 className={s.secTitle}>전문가 목록</h2>
      <p className={s.secDesc}>
        분야별 검증된 전문가를 선택하고 상담을 요청하세요. 상담료와 평점을 비교해 나에게 맞는 전문가를 찾을 수 있습니다.
      </p>
      <div className={s.expertGrid}>
        {EXPERTS.map((expert) => (
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
              {expert.available ? "상담 요청" : "상담 마감"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
