"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { X, Sparkles } from "lucide-react";

interface Props {
  onClose: () => void;
}

// 로그인 후 역할 분배 허브(/dashboard) 경유 — 개인은 어시스턴트로 복귀, 사업자는 대시보드로.
const CALLBACK = `/dashboard?next=${encodeURIComponent("/renewal/assistant")}`;

/** AI 어시스턴트 게스트 무료 3회 소진 시 회원가입 유도 모달 (기존 assistant 로직 이식) */
export default function AssistantSignupModal({ onClose }: Props) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: "360px", background: "#fff", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.20)", padding: "32px 28px", position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", width: "28px", height: "28px", borderRadius: "50%", background: "#f5f5f7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="닫기"
        >
          <X size={14} strokeWidth={2} style={{ color: "#6e6e73" }} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(148deg, #0c1527, #141820)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(0,113,227,0.2)" }}>
            <Sparkles size={24} strokeWidth={1.5} style={{ color: "#2997ff" }} />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>무료 체험 3회를 모두 사용했습니다</h3>
          <p style={{ fontSize: "13px", color: "#6e6e73", lineHeight: 1.65, margin: 0 }}>
            회원가입하면 AI 상담을 <strong style={{ color: "#1d1d1f" }}>무제한</strong>으로 이용하고<br />
            전세분석, 권리분석 등 모든 기능을 사용할 수 있습니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => signIn("google", { callbackUrl: CALLBACK })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", padding: "13px 16px", borderRadius: "14px", border: "1px solid #e5e5e7", background: "#fff", fontSize: "14px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 무료 가입
          </button>
          <button
            onClick={() => signIn("naver", { callbackUrl: CALLBACK })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", padding: "13px 16px", borderRadius: "14px", border: "none", background: "#03C75A", fontSize: "14px", fontWeight: 500, color: "#fff", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
            </svg>
            네이버로 무료 가입
          </button>
          <Link
            href="/home?auth=signup"
            style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "14px", background: "#f5f5f7", fontSize: "13px", fontWeight: 500, color: "#3d3d3f", textDecoration: "none" }}
          >
            다른 방법으로 회원가입
          </Link>
        </div>

        <p style={{ fontSize: "11px", color: "#aeaeb2", textAlign: "center", marginTop: "16px" }}>
          이미 계정이 있으신가요?{" "}
          <span onClick={() => signIn(undefined, { callbackUrl: CALLBACK })} style={{ color: "#0071e3", cursor: "pointer", fontWeight: 500 }}>로그인</span>
        </p>
      </div>
    </div>
  );
}
