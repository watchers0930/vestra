import Link from "next/link";
import s from "./mobile-landing.module.css";

const SITUATIONS = [
  { href: "/jeonse/analysis", q: "전세 계약을 앞두셨나요?", desc: "보증금 안전 여부와 전세사기 위험도를 계약 전에 확인하세요.",
    icon: <><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><path d="M9 21v-6h6v6" /></> },
  { href: "/contract", q: "계약서가 있으신가요?", desc: "계약서의 독소 조항과 위험 문구를 AI가 즉시 검토합니다.",
    icon: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h7M9 17h7" /></> },
  { href: "/monitoring", q: "살고 있는 집이 걱정되나요?", desc: "등기부등본 변동을 24시간 감시하고 이상 발생 시 즉시 알립니다.",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

export function MobileSituation() {
  return (
    <section className={s.light}>
      <div className={s.head}>
        <span className={s.eyebrow}>어떤 상황이신가요</span>
        <h2 className={s.secT}>지금 상황에 맞는<br />분석을 바로 시작하세요</h2>
      </div>
      <div className={s.sitStack}>
        {SITUATIONS.map((it) => (
          <Link className={s.sitItem} href={it.href} key={it.href}>
            <span className={s.ic}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{it.icon}</svg>
            </span>
            <span className={s.sitBody}>
              <h4>{it.q}</h4>
              <p>{it.desc}</p>
            </span>
            <span className={s.sitGo}>
              <svg width="16" height="14" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6h9M8 3l3 3-3 3" /></svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
