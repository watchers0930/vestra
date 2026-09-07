"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../personal-home.module.css";

interface Expert {
  id: string;
  name: string;
  category: string;
  photoUrl: string | null;
  headline: string | null;
}

/**
 * 홈 SPECIALIST 섹션 — 실제 등록된 전문가(LawyerPartner, active)를 노출한다.
 * 더미 데이터(예: "변호사 홍길동")를 제거하고 /api/keepzip/experts 실데이터로 대체.
 * 등록 전문가가 없으면 섹션 자체를 숨긴다(허위 신뢰 표시 방지).
 */
export default function SpecialistSection() {
  const [experts, setExperts] = useState<Expert[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/keepzip/experts")
      .then((r) => (r.ok ? r.json() : { experts: [] }))
      .then((d) => { if (!cancelled) setExperts((d.experts || []).slice(0, 5)); })
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
              <Link href="/renewal/expert" className={s.specBtn}>문의하기</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
