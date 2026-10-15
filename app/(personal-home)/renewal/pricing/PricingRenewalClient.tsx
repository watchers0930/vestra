"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import RenewalGnb from "../_shared/RenewalGnb";
import s from "../monitoring/monitoring-renewal.module.css";
import { PRICING_PLANS, PRICING_COMPARISON } from "@/lib/pricing-plans";

// 개인회원(renewal) 공개 구독 안내 페이지. 요금 데이터는 공유 상수(lib/pricing-plans) 단일 소스.
const TIERS = PRICING_PLANS.map((p) => ({
  key: p.key,
  name: p.name,
  price: p.monthlyLabel,
  period: p.period,
  desc: p.description,
  features: p.features,
  highlight: p.highlight,
}));

const COMPARISON = PRICING_COMPARISON;

export default function PricingRenewalClient() {
  const { data: session } = useSession();
  const ctaHref = session?.user ? "/profile?tab=tier" : "/home?auth=login";

  return (
    <>
      <RenewalGnb />

      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Pricing</span>
          <h1>요금제</h1>
          <p className={s.subHeroSub}>필요에 맞는 플랜을 선택하세요. 등기감시는 프로·비즈니스 구독으로 이용할 수 있습니다.</p>
        </div>
      </section>

      <div className={s.pageWrap}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {TIERS.map((t) => (
            <div
              key={t.key}
              style={{
                position: "relative",
                background: "#fff",
                border: t.highlight ? "2px solid #2e4bd8" : "1px solid #e8eaf2",
                borderRadius: 16,
                padding: "28px 22px",
                boxShadow: t.highlight ? "0 8px 28px rgba(46,75,216,0.14)" : "0 2px 12px rgba(0,0,0,.04)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {t.highlight && (
                <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#2e4bd8", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>인기</span>
              )}
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1d2e", marginBottom: 6 }}>{t.name}</div>
              <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 16, minHeight: 36, lineHeight: 1.5 }}>{t.desc}</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#1a1d2e" }}>{t.price}</span>
                {t.period && <span style={{ fontSize: 13, color: "#8e8e93" }}>{t.period}</span>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ fontSize: 13.5, color: "#3d3d3f", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.5 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2e4bd8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              {t.key === "free" ? (
                <Link href="/home" style={{ textAlign: "center", padding: "11px 0", borderRadius: 10, border: "1px solid #dde0ec", background: "#fff", color: "#3d3d3f", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>시작하기</Link>
              ) : (
                <Link href={ctaHref} style={{ textAlign: "center", padding: "11px 0", borderRadius: 10, background: t.highlight ? "#2e4bd8" : "#1a1d2e", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>구독하기</Link>
              )}
            </div>
          ))}
        </div>

        {/* 기능 비교 */}
        <div style={{ maxWidth: 980, margin: "40px auto 0", background: "#fff", border: "1px solid #e8eaf2", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #eef1f8" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1d2e" }}>기능 비교</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "12px 20px", color: "#8e8e93", fontWeight: 600 }}>기능</th>
                  <th style={{ textAlign: "center", padding: "12px", color: "#8e8e93", fontWeight: 600, minWidth: 72 }}>무료</th>
                  <th style={{ textAlign: "center", padding: "12px", color: "#2e4bd8", fontWeight: 700, minWidth: 72 }}>프로</th>
                  <th style={{ textAlign: "center", padding: "12px", color: "#8e8e93", fontWeight: 600, minWidth: 72 }}>비즈니스</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} style={{ borderTop: "1px solid #f0f2f6" }}>
                    <td style={{ padding: "12px 20px", color: "#3d3d3f" }}>{row.feature}</td>
                    {(["free", "pro", "business"] as const).map((k) => {
                      const v = row[k];
                      return (
                        <td key={k} style={{ textAlign: "center", padding: "12px" }}>
                          {typeof v === "boolean" ? (
                            v ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2e4bd8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}><polyline points="20 6 9 17 4 12" /></svg>
                            ) : (
                              <span style={{ color: "#cbd0dc" }}>–</span>
                            )
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#3d3d3f" }}>{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#8e8e93", marginTop: 28 }}>
          모든 가격은 부가세(VAT) 포함 금액입니다.
        </p>
      </div>
    </>
  );
}
