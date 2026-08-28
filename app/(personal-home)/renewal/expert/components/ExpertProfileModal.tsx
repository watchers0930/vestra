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
  completedCases: { cause: string; count: number }[];
}

interface Props {
  expert: Expert;
  onSelect: (expert: Expert, intent: ExpertIntent) => void;
  onClose: () => void;
}

/** 이력 문자열에서 앞의 연도(예: "2018~ ", "2015~2018 ")를 제거 */
const stripYear = (t: string) => t.replace(/^\d{4}\s*~\s*\d{0,4}\s*/, "").trim();

const RATING_ITEMS: [string, keyof Omit<RatingBreakdown, "count">][] = [
  ["전문성", "expertise"],
  ["응답 속도", "response"],
  ["소통·친절", "communication"],
  ["결과 만족", "result"],
  ["비용 대비", "value"],
];

/** 전문가 상세 프로필 모달 — 2컬럼(왼: 사진·기본정보 / 오른: 소개·별점·경력) + 하단 액션 */
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

        <div className={s.pmGrid}>
          {/* 왼쪽 — 사진 · 기본 정보 · 주요 이력 */}
          <aside className={s.pmSide}>
            <div className={s.pmPhoto}>
              {d?.photoUrl
                ? <img src={d.photoUrl} alt={expert.name} />
                : <span className={s.pmPhotoInit}>{expert.name.charAt(0)}</span>}
            </div>
            <div className={s.pmSideName}>{expert.name}</div>
            <div className={s.pmSideCat}>{expert.category}</div>
            {d?.firmName && <div className={s.pmSideFirm}>{d.firmName}</div>}
            <div className={s.pmSideStats}>
              <div className={s.pmStat}><b>★ {expert.rating.toFixed(1)}</b><span>후기 {expert.reviewCount}</span></div>
              <div className={s.pmStatDiv} />
              <div className={s.pmStat}><b>{expert.experience}년</b><span>경력</span></div>
            </div>
            {expert.specialties.length > 0 && (
              <div className={s.pmSideSpecs}>
                {expert.specialties.map((sp) => <span key={sp} className={s.pmSpec}>{stripYear(sp)}</span>)}
              </div>
            )}
          </aside>

          {/* 오른쪽 — 인사말 · 별점 · 경력 · 학력 */}
          <div className={s.pmMain}>
            {loading ? (
              <div className={s.pmLoad}>불러오는 중…</div>
            ) : (
              <>
                {d?.headline && <p className={s.pmHeadline}>{d.headline}</p>}

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

                {d && d.completedCases.length > 0 && (
                  <section>
                    <h4 className={s.pmSecT}>처리 완료 사건</h4>
                    <div className={s.pmCases}>
                      {d.completedCases.map((c) => (
                        <div key={c.cause} className={s.pmCaseRow}>
                          <span className={s.pmCaseType}>{c.cause}</span>
                          <span className={s.pmCaseStat}>{c.count}건 처리</span>
                        </div>
                      ))}
                    </div>
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
                {noDetail && !d?.headline && <p className={s.pmEmpty}>등록된 상세 프로필이 아직 없습니다.</p>}
              </>
            )}
          </div>
        </div>

        <div className={s.pmActions}>
          {expert.available ? (
            <>
              {isLawyer && <button className={`${s.pmBtn} ${s.pmBtnPri}`} onClick={() => onSelect(expert, "keepzip")}>내용증명 작성</button>}
              <button className={s.pmBtn} onClick={() => onSelect(expert, "consult")}>상담 요청</button>
              <button className={s.pmBtn} onClick={() => onSelect(expert, "visit")}>방문 예약</button>
            </>
          ) : (
            <div className={s.pmClosedNote}>현재 상담이 마감된 전문가입니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
