"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import s from "./monitoring-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import RenewalLoginModal from "../_shared/RenewalLoginModal";
import RegistryIssueBar from "../_shared/RegistryIssueBar";
import AddPropertyModalRenewal from "./components/AddPropertyModalRenewal";
import { isPaidPlan } from "@/lib/subscription-plan";

// 등기감시 페이지 = 프로세스 설명 + 물건 추가(등록) 전용.
// 감시 결과(현황·알림)는 마이페이지 > 등기감시 탭에서 확인(역할 분리).
const STEPS = [
  { n: "1", title: "등기부 등록", desc: "내 부동산 등기부(PDF)를 등록하면 부동산 고유번호와 기준 상태를 안전하게 저장합니다." },
  { n: "2", title: "하루 2회 자동 감시", desc: "등기신청사건을 자동으로 프리체크해 등기 변동 조짐을 조기에 포착합니다." },
  { n: "3", title: "변동 시 즉시 알림", desc: "근저당 설정·압류·소유권 이전 등 위험 변동을 위험도에 따라 알려드립니다." },
  { n: "4", title: "직접 확인", desc: "알림을 받으면 등기부를 발급해 실제 반영 내용을 확인하실 수 있습니다." },
];

export default function MonitoringRenewalClient({ initialAddress = "", initialListingId = "" }: { initialAddress?: string; initialListingId?: string }) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [isPaid, setIsPaid] = useState<boolean | null>(null);

  // 유료 회원(PRO/BUSINESS 구독 또는 ADMIN) 여부 조회 — 등기감시는 유료 전용
  useEffect(() => {
    if (!isLoggedIn) { setIsPaid(null); return; }
    if (session?.user?.role === "ADMIN") { setIsPaid(true); return; }
    let alive = true;
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((s) => { if (alive) setIsPaid(isPaidPlan(s?.plan, s?.status)); })
      .catch(() => { if (alive) setIsPaid(false); });
    return () => { alive = false; };
  }, [isLoggedIn, session?.user?.role]);

  const handleAdd = useCallback(() => {
    // 비회원이거나 무료회원이면 처음부터 유료 전용 안내 모달 → 구독 안내로 유도
    if (!isLoggedIn || isPaid === false) {
      setShowPaidModal(true);
      return;
    }
    setShowAddModal(true);
  }, [isLoggedIn, isPaid]);

  // 매물 상세 등에서 ?address= 로 진입 시 감시 등록 모달 자동 오픈(주소 프리필)
  useEffect(() => {
    if (!initialAddress) return;
    if (isLoggedIn) setShowAddModal(true);
    else setShowLoginModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress, isLoggedIn]);

  return (
    <>
      <RenewalGnb active="monitoring" />

      <section className={s.subHero}>
        <div className={s.subHeroBg}></div>
        <div className={s.subHeroIn}>
          <span className={s.heroChip}>Registry Monitor</span>
          <h1>등기감시</h1>
          <p className={s.subHeroSub}>등기부 변동을 실시간 감시하고, 블록체인으로 기록을 보호합니다</p>
        </div>
      </section>

      <RegistryIssueBar />

      <div className={s.pageWrap}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1d1d1f", textAlign: "center", marginBottom: 8 }}>등기감시는 이렇게 작동합니다</h2>
          <p style={{ fontSize: 14, color: "#6e6e73", textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>
            등기부를 등록해두면, 담보 대출(근저당)·압류 같은 위험 변동을 놓치지 않도록 자동으로 감시합니다.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
            {STEPS.map((st) => (
              <div key={st.n} style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: 14, padding: "20px 18px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{st.n}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", marginBottom: 6 }}>{st.title}</div>
                <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: 0 }}>{st.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className={s.addBtn} onClick={handleAdd}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              등기부 물건 추가
            </button>
            <Link href="/profile?tab=monitoring" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "1px solid #dde0ec", background: "#fff", color: "#2e4bd8", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              내 감시 현황 보기
            </Link>
          </div>
          <p style={{ textAlign: "center", fontSize: 12.5, color: "#8e8e93", marginTop: 14, lineHeight: 1.6 }}>
            등록한 물건의 감시 현황·알림은 <strong style={{ color: "#2e4bd8" }}>마이페이지 &gt; 등기감시</strong>에서 확인하실 수 있습니다.
          </p>
        </div>
      </div>

      {showAddModal && (
        <AddPropertyModalRenewal
          initialAddress={initialAddress}
          initialListingId={initialListingId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => setShowAddModal(false)}
        />
      )}

      {showLoginModal && (
        <RenewalLoginModal
          featureName="등기감시"
          description="로그인하면 물건을 등록하고 등기 변동을 실시간 감시할 수 있습니다."
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showPaidModal && (
        <div onClick={() => setShowPaidModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 30px", maxWidth: 460, width: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>등기감시는 유료 회원 전용입니다</p>
            <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, marginBottom: 22 }}>
              PRO·BUSINESS 구독 회원만 등기부 변동 감시를 이용할 수 있습니다.<br />구독하시면 하루 2회 자동 감시와 변동 알림을 받아보실 수 있습니다.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Link href="/renewal/pricing" style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>구독 안내 보기</Link>
              <button onClick={() => setShowPaidModal(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #dde0ec", background: "#fff", color: "#6e6e73", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <RenewalFooter />
    </>
  );
}

function RenewalFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerIn}>
        <div>
          <div className={s.flogo}><Image src="/vestra-symbol.png" alt="VESTRA" width={26} height={26} className={s.flogoI} /><span className={s.flogoT}>VESTRA</span></div>
          <p className={s.ftag}>The Digital Curator of Real Estate<br />AI 기반 부동산 자산관리 플랫폼</p>
          <div className={s.fcontact}>BMI C&S | 대표이사 김동의<br />사업자등록번호 263-87-03481 | 통신판매신고번호 2025-경기광명-0189<br />서울시 강남구 강남대로 354(역삼동, 혜천빌딩) 1126-5호<br />고객센터 010-8490-9271</div>
        </div>
        <div><p className={s.fcolT}>Legal</p><ul className={s.flinks}><li><a href="#">개인정보처리방침</a></li><li><a href="#">이용약관</a></li></ul></div>
        <div><p className={s.fcolT}>Product</p><ul className={s.flinks}><li><a href="#">기능 소개</a></li><li><a href="#">요금제</a></li></ul></div>
        <div><p className={s.fcolT}>Company</p><ul className={s.flinks}><li><a href="#">회사 소개</a></li><li><a href="#">채용</a></li></ul></div>
        <div><p className={s.fcolT}>Connect</p><ul className={s.flinks}><li><a href="#">LinkedIn</a></li></ul></div>
      </div>
      <div className={s.fbot}><span>© 2026 BMI-C&S All rights reserved.</span><span>The Digital Curator of Real Estate</span></div>
    </footer>
  );
}
