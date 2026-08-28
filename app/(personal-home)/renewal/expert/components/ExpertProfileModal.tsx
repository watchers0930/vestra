"use client";

import { useState, useEffect } from "react";
import s from "../expert.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ExpertIntent } from "./ExpertList";

interface RatingBreakdown {
  count: number;
  expertise: number;
  response: number;
  communication: number;
  result: number;
  value: number;
}

interface Detail {
  photoUrl: string | null;
  headline: string;
  firmName: string;
  bio: string;
  careers: string[];
  schools: string[];
  etcInfo: string;
  ratingBreakdown: RatingBreakdown | null;
}

interface Props {
  expert: Expert;
  onSelect: (expert: Expert, intent: ExpertIntent) => void;
  onClose: () => void;
}

const RATING_ITEMS: [string, keyof Omit<RatingBreakdown, "count">][] = [
  ["전문성", "expertise"],
  ["응답 속도", "response"],
  ["소통·친절", "communication"],
  ["결과 만족", "result"],
  ["비용 대비", "value"],
];

/** 전문가 상세 프로필 모달 — 사진·소개·항목별 별점·경력·학력·약력 확인 후 상담/내용증명/방문 선택 */
export default function ExpertProfileModal({ expert, onSelect, onClose }: Props) {
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/keepzip/experts/${expert.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (alive) { setD(res?.expert ?? null); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [expert.id]);

  const isLawyer = expert.category === "변호사";
  const rb = d?.ratingBreakdown ?? null;
  const noDetail = d && !d.bio && d.careers.length === 0 && d.schools.length === 0 && !d.etcInfo;

  return (
    <div className={s.pmOverlay} onClick={onClose}>
      <div className={s.pmModal} onClick={(e) => e.stopPropagation()}>
        <button className={s.pmClose} onClick={onClose} aria-label="닫기">✕</button>

        <div className={s.pmHead}>
          <div className={s.pmAvatar} style={{ overflow: "hidden" }}>
            {d?.photoUrl
              ? <img src={d.photoUrl} alt={expert.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : expert.name.charAt(0)}
          </div>
          <div className={s.pmId}>
            <div className={s.pmNameRow}>
              <span className={s.pmName}>{expert.name}</span>
              <span className={s.pmCat}>{expert.category}</span>
            </div>
            {d?.firmName && <div className={s.pmFirm}>{d.firmName}</div>}
            <div className={s.pmMetaRow}>★ {expert.rating.toFixed(1)} <span>({expert.reviewCount})</span> · 경력 {expert.experience}년</div>
          </div>
        </div>

        {d?.headline && <p className={s.pmHeadline}>{d.headline}</p>}

        {loading ? (
          <div className={s.pmLoad}>불러오는 중…</div>
        ) : (
          <div className={s.pmBody}>
            {/* 항목별 평점 */}
            <section>
              <h4 className={s.pmSecT}>항목별 평점{rb ? ` · 후기 ${rb.count}건` : ""}</h4>
              {rb ? (
                <div className={s.pmRatings}>
                  {RATING_ITEMS.map(([label, key]) => (
                    <div key={key} className={s.pmRateRow}>
                      <span className={s.pmRateLabel}>{label}</span>
                      <div className={s.pmRateBar}><div className={s.pmRateFill} style={{ width: `${(rb[key] / 5) * 100}%` }} /></div>
                      <span className={s.pmRateScore}>{rb[key].toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={s.pmEmpty}>아직 등록된 후기가 없습니다.</p>
              )}
            </section>

            {expert.specialties.length > 0 && (
              <section>
                <h4 className={s.pmSecT}>전문분야</h4>
                <div className={s.pmSpecs}>{expert.specialties.map((sp) => <span key={sp} className={s.pmSpec}>{sp}</span>)}</div>
              </section>
            )}
            {d?.bio && <section><h4 className={s.pmSecT}>약력</h4><p className={s.pmText}>{d.bio}</p></section>}
            {d && d.careers.length > 0 && (
              <section><h4 className={s.pmSecT}>경력</h4><ul className={s.pmList}>{d.careers.map((c, i) => <li key={i}>{c}</li>)}</ul></section>
            )}
            {d && d.schools.length > 0 && (
              <section><h4 className={s.pmSecT}>학력</h4><ul className={s.pmList}>{d.schools.map((c, i) => <li key={i}>{c}</li>)}</ul></section>
            )}
            {d?.etcInfo && <section><h4 className={s.pmSecT}>추가 정보</h4><p className={s.pmText}>{d.etcInfo}</p></section>}
            {noDetail && <p className={s.pmEmpty}>등록된 상세 프로필이 아직 없습니다.</p>}
          </div>
        )}

        <div className={s.pmActions}>
          <button className={s.pmBtn} onClick={() => onSelect(expert, "consult")}>상담 요청</button>
          {isLawyer && <button className={`${s.pmBtn} ${s.pmBtnPri}`} onClick={() => onSelect(expert, "keepzip")}>내용증명 작성</button>}
          <button className={s.pmBtn} onClick={() => onSelect(expert, "visit")}>방문 예약</button>
        </div>
      </div>
    </div>
  );
}
