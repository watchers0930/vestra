"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import RoleTypeSelector from "@/components/auth/RoleTypeSelector";
import { markSignupIntent } from "@/lib/signup-intent";

interface Props {
  onClose: () => void;
  /** "이미 계정이 있으신가요? 로그인" → 로그인 모달로 전환 */
  onSwitchToLogin?: () => void;
}

/**
 * 회원가입 전용 모달 — 역할(일반/부동산/기업) 선택 후 소셜 가입.
 * 기존 /signup 페이지 로직(RoleTypeSelector + signIn redirectTo /signup/complete)을 모달로 이식.
 */
export default function RenewalSignupModal({ onClose, onSwitchToLogin }: Props) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleSocial = (provider: "google" | "naver") => {
    if (!selectedRole) return;
    markSignupIntent(); // 서버 signIn 콜백에 "가입 의도" 전달 (미가입 자동생성 차단 우회)
    signIn(provider, { redirectTo: `/signup/complete?intendedRole=${selectedRole}` });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(10,15,30,0.55)", backdropFilter: "blur(4px)", overflowY: "auto" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="회원가입"
    >
      <div style={{ width: "100%", maxWidth: 960, background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.28)", padding: "32px 28px 28px", position: "relative", margin: "auto" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", borderRadius: 8, color: "#86868b", fontSize: 20, lineHeight: 1, cursor: "pointer" }}
          aria-label="닫기"
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.22em", color: "#1d1d1f" }}>VESTRA</div>
          <p style={{ marginTop: 6, fontSize: 13, color: "#6e6e73" }}>AI 부동산 자산관리 플랫폼</p>
        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>이용 목적에 맞는 회원 유형을 선택하세요</h3>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>유형에 따라 맞춤 기능이 제공됩니다</p>
        </div>

        <RoleTypeSelector selectedRole={selectedRole} onSelect={setSelectedRole} />

        {selectedRole && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px" }}>
              <div style={{ flex: 1, borderTop: "1px solid #e5e7eb" }} />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>소셜 계정으로 시작</span>
              <div style={{ flex: 1, borderTop: "1px solid #e5e7eb" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380, margin: "0 auto" }}>
              <button
                onClick={() => handleSocial("google")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 13, borderRadius: 14, border: "1px solid #e5e5e7", background: "#fff", fontSize: 14, fontWeight: 500, color: "#1d1d1f", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google로 시작하기
              </button>
              <button
                onClick={() => handleSocial("naver")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 13, borderRadius: 14, border: "none", background: "#03C75A", fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
                </svg>
                네이버로 시작하기
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 13, color: "#6e6e73", margin: "20px 0 0" }}>
          이미 계정이 있으신가요?{" "}
          {onSwitchToLogin ? (
            <span onClick={onSwitchToLogin} style={{ fontWeight: 600, color: "#0071e3", cursor: "pointer" }}>로그인</span>
          ) : (
            <span onClick={onClose} style={{ fontWeight: 600, color: "#0071e3", cursor: "pointer" }}>로그인</span>
          )}
        </p>

        <div style={{ textAlign: "center", margin: "16px 0 0", paddingTop: 16, borderTop: "1px solid #f0f0f2" }}>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 12px" }}>
            변호사·법무사·세무사·회계사·감정평가사이신가요?
          </p>
          <Link
            href="/renewal/expert-signup"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #4f46e5 0%, #2e4bd8 100%)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(46,75,216,0.32)",
            }}
          >
            <span aria-hidden style={{ fontSize: 16 }}>⚖️</span>
            전문가로 가입하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
