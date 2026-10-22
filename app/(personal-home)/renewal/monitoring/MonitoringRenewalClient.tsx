"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import s from "./monitoring-renewal.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import SiteFooter from "@/components/layout/SiteFooter";
import RegistryIssueBar from "../_shared/RegistryIssueBar";
import AddPropertyModalRenewal from "./components/AddPropertyModalRenewal";
import GuestEntrySection from "./components/guest/GuestEntrySection";
import { isPaidPlan } from "@/lib/subscription-plan";

// 등기감시 페이지 = 프로세스 설명 + 물건 추가(등록) 전용.
// 감시 결과(현황·알림)는 마이페이지 > 등기감시 탭에서 확인(역할 분리).
const STEPS = [
  { n: "1", title: "등기부 등록", desc: "내 부동산 등기부(PDF)를 등록하면 부동산 고유번호와 기준 상태를 안전하게 저장합니다." },
  { n: "2", title: "하루 2회 자동 감시", desc: "등기신청사건을 자동으로 프리체크해 등기 변동 조짐을 조기에 포착합니다." },
  { n: "3", title: "변동 시 즉시 알림", desc: "근저당 설정·압류·소유권 이전 등 위험 변동을 위험도에 따라 알려드립니다." },
  { n: "4", title: "직접 확인", desc: "알림을 받으면 등기부를 발급해 실제 반영 내용을 확인하실 수 있습니다." },
];

export default function MonitoringRenewalClient({ initialAddress = "", initialListingId = "", guestEnabled = false }: { initialAddress?: string; initialListingId?: string; guestEnabled?: boolean }) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [addOpened, setAddOpened] = useState(false);
  const [addClosed, setAddClosed] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [fetchedPaid, setFetchedPaid] = useState<boolean | null>(null);

  // 유료 회원(PRO/BUSINESS 구독 또는 ADMIN) 여부 — 비로그인/ADMIN은 동기 파생, 그 외는 조회.
  const isPaid: boolean | null =
    !isLoggedIn ? null : session?.user?.role === "ADMIN" ? true : fetchedPaid;

  // 등기감시는 유료 전용 — 로그인·비ADMIN만 구독 상태 조회(effect 내 동기 setState 없음).
  useEffect(() => {
    if (!isLoggedIn || session?.user?.role === "ADMIN") return;
    let alive = true;
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((s) => { if (alive) setFetchedPaid(isPaidPlan(s?.plan, s?.status)); })
      .catch(() => { if (alive) setFetchedPaid(false); });
    return () => { alive = false; };
  }, [isLoggedIn, session?.user?.role]);

  // 매물 상세 등에서 ?address= 로 진입 시: 회원은 등록 모달 자동 오픈(닫기 전까지),
  // 비회원은 아래 비회원 신청 섹션으로 유도(주소 프리필). 파생값이라 effect setState 불필요.
  const showAddModal = addOpened || (!!initialAddress && isLoggedIn && !addClosed);
  const closeAddModal = useCallback(() => { setAddOpened(false); setAddClosed(true); }, []);

  const handleAdd = useCallback(() => {
    // 비회원이거나 무료회원이면 처음부터 유료 전용 안내 모달 → 구독 안내로 유도
    if (!isLoggedIn || isPaid === false) {
      setShowPaidModal(true);
      return;
    }
    setAddOpened(true);
  }, [isLoggedIn, isPaid]);

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

          {isLoggedIn && (
            <>
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
            </>
          )}
        </div>

        {/* 비회원(비로그인): 서버 기능 플래그 ON일 때만 신청 섹션 노출(설계 §0·§3.0).
            비회원 경로는 PDF-only로 주소 주입 없음(설계 §4.1). 회원 추가 모달은 initialAddress 유지. */}
        {!isLoggedIn && guestEnabled && <GuestEntrySection />}
      </div>

      {showAddModal && (
        <AddPropertyModalRenewal
          initialAddress={initialAddress}
          initialListingId={initialListingId}
          onClose={closeAddModal}
          onSuccess={closeAddModal}
        />
      )}

      {showPaidModal && (
        <div onClick={() => setShowPaidModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 30px", maxWidth: 460, width: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>등기감시는 유료 회원 전용입니다</p>
            <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, marginBottom: 22 }}>
              PRO·PREMIUM 구독 회원만 등기부 변동 감시를 이용할 수 있습니다.<br />구독하시면 하루 2회 자동 감시와 변동 알림을 받아보실 수 있습니다.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Link href="/renewal/pricing" style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>구독 안내 보기</Link>
              <button onClick={() => setShowPaidModal(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #dde0ec", background: "#fff", color: "#6e6e73", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </>
  );
}
