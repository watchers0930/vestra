"use client";

import { signOut } from "next-auth/react";

const CATEGORY_LABELS: Record<string, string> = {
  lawyer: "변호사",
  judicial: "법무사",
  tax: "세무사",
  accountant: "회계사",
  appraiser: "감정평가사",
};

/**
 * 전문가 심사 대기(kycStatus="pending") 계정 전용 차단 게이트.
 * 승인 전까지 개인 홈 대신 이 모달만 노출하고 서비스 이용을 완전 차단한다.
 * 서버 컴포넌트(home/page.tsx)에서 대기 상태를 판별한 뒤에만 렌더된다.
 */
export default function ExpertPendingGate({ category }: { category?: string }) {
  const label = (category && CATEGORY_LABELS[category]) || "전문가";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expert-pending-title"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          padding: "36px 28px 28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 20px",
            borderRadius: "50%",
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
          aria-hidden
        >
          ⏳
        </div>

        <h2
          id="expert-pending-title"
          style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}
        >
          심사가 진행중입니다
        </h2>

        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#475569", margin: "0 0 8px" }}>
          {label} 인증을 신청해 주셔서 감사합니다.
          <br />
          관리자 승인 후 전문가 서비스를 이용하실 수 있습니다.
        </p>
        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#94a3b8", margin: "0 0 24px" }}>
          승인이 완료되면 다시 로그인해 주세요.
        </p>

        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/" })}
          style={{
            width: "100%",
            height: "48px",
            borderRadius: "10px",
            border: "none",
            background: "#1e293b",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
