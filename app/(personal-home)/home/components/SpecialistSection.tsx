"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../personal-home.module.css";
import type { Expert } from "@/components/expert/ExpertCard";
import ExpertProfileModal from "@/app/(personal-home)/renewal/expert/components/ExpertProfileModal";

/**
 * 홈 SPECIALIST 섹션 — 실제 등록된 전문가(LawyerPartner, active·verified)를 노출한다.
 * /api/keepzip/experts(평점 desc)에서 분야(category)별 대표 1명씩만 뽑아 최대 5명 표시.
 * 문의하기를 누르면 해당 전문가의 프로필 모달을 띄운다.
 * 등록 전문가가 없으면 섹션 자체를 숨긴다(허위 신뢰 표시 방지).
 */
export default function SpecialistSection() {
  const router = useRouter();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selected, setSelected] = useState<Expert | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keepzip/experts")
      .then((r) => (r.ok ? r.json() : { experts: [] }))
      .then((d) => {
        if (cancelled) return;
        // 분야별 대표 1명씩(API가 평점 desc 정렬 → 첫 등장이 최고 평점), 최대 5명
        const seen = new Set<string>();
        const unique = ((d.experts || []) as Expert[]).filter((e) => {
          if (seen.has(e.category)) return false;
          seen.add(e.category);
          return true;
        }).slice(0, 5);
        setExperts(unique);
      })
      .catch(() => { /* 무시 — 섹션 숨김 */ });
    return () => { cancelled = true; };
  }, []);

  if (experts.length === 0) return null;

  return (
    <section className={s.specialist}>
      <div className={s.specialistInner}>
        <h2 className={s.specialistTitle}>베스트라와 함께 하는 부동산 SPECIALIST</h2>
        <div className={s.specialistGrid}>
          {experts.map((e) => (
            <div key={e.id} className={s.specCard}>
              <div
                className={s.specAvatar}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                {e.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photoUrl} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "24px", fontWeight: 700, color: "#0a3d91" }}>{e.name.charAt(0)}</span>
                )}
              </div>
              <span className={s.specRole}>{e.headline || e.category}</span>
              <span className={s.specName}>{e.category} {e.name}</span>
              <button type="button" onClick={() => setSelected(e)} className={s.specBtn}>문의하기</button>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <ExpertProfileModal
          expert={selected}
          onSelect={() => { setSelected(null); router.push("/renewal/expert"); }}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
