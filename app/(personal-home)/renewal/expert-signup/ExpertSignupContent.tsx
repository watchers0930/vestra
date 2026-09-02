"use client";

import { useSession } from "next-auth/react";
import RenewalGnb from "../_shared/RenewalGnb";
import ExpertLoginGate from "./ExpertLoginGate";
import ExpertIntro from "./ExpertIntro";
import ExpertFooter from "../expert/components/ExpertFooter";
import ExpertRegisterCard from "./ExpertRegisterCard";

/**
 * 전문가 가입 페이지 — 게이트/레이아웃 컨테이너.
 * 비로그인: 랜딩형 게이트(ExpertLoginGate). 로그인: 2칼럼(좌 인트로 / 우 자격등록 카드).
 */
export default function ExpertSignupContent() {
  const { data: session, status } = useSession();
  const authed = status === "authenticated";

  return (
    <>
      <RenewalGnb />

      <div className="mx-auto px-8 py-10" style={{ maxWidth: 1200 }}>
        {status === "loading" ? (
          <p className="py-20 text-center text-sm text-gray-400">불러오는 중…</p>
        ) : !authed ? (
          <ExpertLoginGate />
        ) : (
          /* 로그인 후: 로그인 전과 동일한 2칼럼 (좌 공유 인트로 / 우 자격등록 카드) */
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem", alignItems: "flex-start" }}>
            <ExpertIntro />
            <ExpertRegisterCard email={session?.user?.email ?? null} />
          </div>
        )}
      </div>

      <ExpertFooter />
    </>
  );
}
