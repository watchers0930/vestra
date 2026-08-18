import Link from "next/link";
import s from "./mobile-landing.module.css";

/** 실제 데스크탑 랜딩과 동일한 8개 서비스 · 링크 */
const FEATURES = [
  { href: "/jeonse", title: "전세 보호", desc: "전세사기 예방 안전 분석·전입신고·확정일자·전세권설정까지 원스톱 가이드.",
    icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></> },
  { href: "/monitoring", title: "AI 등기부 변동위험감지", desc: "하루 2회 등기부등본 변경사항을 자동 확인, 이상 징후 발견 시 즉시 알림.",
    icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></> },
  { href: "/rights", title: "권리 분석", desc: "등기부등본을 AI가 종합 분석하여 권리관계·위험요소·안전지수를 한눈에.",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
  { href: "/prediction", title: "시세 전망", desc: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공.",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> },
  { href: "/contract", title: "계약서 AI 검토", desc: "부동산 계약서를 업로드하면 불리한 조항·누락 사항·위험 요소를 자동 검출.",
    icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></> },
  { href: "/tax", title: "세무 시뮬레이션", desc: "취득세·양도소득세·종합부동산세를 실시간 계산하고 절세 전략을 제안.",
    icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></> },
  { href: "/feasibility", title: "사업성 분석", desc: "다중 문서 기반으로 사업성을 검증하고 SCR 수준의 분석 보고서를 자동 생성.",
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></> },
  { href: "/assistant", title: "AI 어시스턴트", desc: "부동산 관련 궁금한 점을 AI에게 자유롭게 — 법률·세무·시장 동향까지.",
    icon: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></> },
];

export function MobileFeatures() {
  return (
    <section className={s.feat}>
      <div className={s.railhead}>
        <span className={s.eyebrow}>핵심 기능</span>
        <span className={s.swipe}>8가지 · 스와이프<svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h9M8 3l3 3-3 3" /></svg></span>
      </div>
      <div className={s.rail}>
        {FEATURES.map((f) => (
          <Link className={s.fcard} href={f.href} key={f.href}>
            <span className={s.ic}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
            </span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
