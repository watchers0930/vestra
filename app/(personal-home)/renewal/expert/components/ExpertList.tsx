"use client";

import { useState, useEffect } from "react";
import s from "../expert.module.css";
import ExpertProfileModal from "./ExpertProfileModal";
import type { Expert } from "@/components/expert/ExpertCard";

function formatFee(fee: number) {
  if (fee >= 10000) return `상담료 ${(fee / 10000).toLocaleString()}만원`;
  return `상담료 ${fee.toLocaleString()}원`;
}

export type ExpertIntent = "consult" | "keepzip" | "visit";

interface ExpertListProps {
  /** 선택된 영역의 category 필터 (없으면 전체) */
  categories?: string[];
  fieldLabel?: string;
  onSelect: (expert: Expert, intent: ExpertIntent) => void;
}

/** STEP 2 — 선택한 영역의 전문가 목록(DB LawyerPartner). 변호사=상담요청+내용증명 2버튼. */
export default function ExpertList({ categories, fieldLabel, onSelect }: ExpertListProps) {
  const [all, setAll] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOf, setProfileOf] = useState<Expert | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/keepzip/experts")
      .then((r) => r.json())
      .then((d) => { if (alive) setAll(Array.isArray(d.experts) ? d.experts : []); })
      .catch(() => { if (alive) setAll([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const list = categories?.length ? all.filter((e) => categories.includes(e.category)) : all;

  return (
    <div className={s.block}>
      <p className={s.secEyebrow}>Expert List</p>
      <h2 className={s.secTitle}>{fieldLabel ? `${fieldLabel} 전문가` : "전문가 목록"}</h2>
      <p className={s.secDesc}>
        검증된 전문가를 선택하세요. 상담료와 평점을 비교해 나에게 맞는 전문가를 찾을 수 있습니다.
      </p>
      {!loading && list.length === 0 && (
        <div className="text-sm text-gray-400 py-10 text-center">해당 분야의 등록 전문가가 아직 없습니다.</div>
      )}
      <div className={s.expertGrid}>
        {list.map((expert) => (
          <div key={expert.id} className={s.excard}>
            <div className={s.exHead}>
              <div className={s.exAvatar} style={{ overflow: "hidden" }}>
                {expert.photoUrl
                  ? <img src={expert.photoUrl} alt={expert.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : expert.name.charAt(0)}
              </div>
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
            {expert.headline && <p className={s.exHeadline}>{expert.headline}</p>}
            <div className={s.exSpecs}>
              {expert.specialties.map((sp) => (
                <span key={sp} className={s.exSpec}>{sp}</span>
              ))}
            </div>
            <div className={s.exMeta}>
              <span>경력 {expert.experience}년</span>
              <span className={s.exFee}>{formatFee(expert.consultFee)}</span>
            </div>
            <button className={s.exProfileMain} onClick={() => setProfileOf(expert)}>프로필 보기</button>
            {!expert.available && <p className={s.exClosed}>현재 상담 마감</p>}
          </div>
        ))}
      </div>

      {profileOf && (
        <ExpertProfileModal
          expert={profileOf}
          onSelect={(e, intent) => { setProfileOf(null); onSelect(e, intent); }}
          onClose={() => setProfileOf(null)}
        />
      )}
    </div>
  );
}
