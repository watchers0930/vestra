"use client";

import { signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Map, Landmark, Calculator } from "lucide-react";
import { RENEWAL_ROUTES } from "./renewal-config";

interface Props {
  /** 로그인 안내에 노출할 기능명 (생략 시 일반 로그인 유도) */
  featureName?: string;
  description?: string;
  /** 닫기 (액션 취소 — 원래 화면 유지) */
  onClose: () => void;
  /** "회원가입" → 회원가입 모달로 전환 */
  onSwitchToSignup?: () => void;
}

const PUBLIC_LINKS = [
  { href: RENEWAL_ROUTES.priceMap, label: "시세지도", Icon: Map },
  { href: RENEWAL_ROUTES.officialPrice, label: "공시가격", Icon: Landmark },
  { href: RENEWAL_ROUTES.tax, label: "세금계산", Icon: Calculator },
];

/**
 * 액션 시점 로그인 유도 모달.
 * 진입은 자유롭게 두고, 저장·개인 데이터가 필요한 순간(예: 등기감시 물건 추가)에만 띄운다.
 * 닫으면 원래 화면으로 복귀(진입 차단 아님).
 */
export default function RenewalLoginModal({ featureName, description, onClose, onSwitchToSignup }: Props) {
  const pathname = usePathname();
  const callbackUrl = pathname || RENEWAL_ROUTES.home;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.20)", padding: "32px 28px", position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", background: "#f5f5f7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="닫기"
        >
          <X size={14} strokeWidth={2} style={{ color: "#6e6e73" }} />
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#0071e3", background: "rgba(0,113,227,0.08)", borderRadius: 20, padding: "5px 12px", marginBottom: 14 }}>
            로그인이 필요해요
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>
            {featureName ? `${featureName} 기능은 로그인 후 이용할 수 있어요` : "로그인하고 시작하세요"}
          </h3>
          <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.6, margin: 0 }}>
            {description || "로그인하면 내 정보를 안전하게 저장하고 관리할 수 있습니다."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => signIn("google", { callbackUrl })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 13, borderRadius: 14, border: "1px solid #e5e5e7", background: "#fff", fontSize: 14, fontWeight: 500, color: "#1d1d1f", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 로그인
          </button>
          <button
            onClick={() => signIn("naver", { callbackUrl })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 13, borderRadius: 14, border: "none", background: "#03C75A", fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
            </svg>
            네이버로 로그인
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
          <div style={{ flex: 1, borderTop: "1px solid #e5e7eb" }} />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>또는</span>
          <div style={{ flex: 1, borderTop: "1px solid #e5e7eb" }} />
        </div>

        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 500, letterSpacing: "0.03em", color: "#86868b", margin: "0 0 10px" }}>로그인 없이 바로 이용</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {PUBLIC_LINKS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 12, border: "1px solid #e5e7eb", textDecoration: "none", color: "#1d1d1f" }}>
              <Icon size={18} color="#0071e3" />
              <span style={{ fontSize: 11, fontWeight: 500 }}>{label}</span>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6e6e73", margin: "22px 0 0" }}>
          아직 계정이 없으신가요?{" "}
          {onSwitchToSignup ? (
            <span onClick={onSwitchToSignup} style={{ fontWeight: 600, color: "#0071e3", cursor: "pointer" }}>회원가입</span>
          ) : (
            <Link href={RENEWAL_ROUTES.signup} style={{ fontWeight: 600, color: "#0071e3" }}>회원가입</Link>
          )}
        </p>
      </div>
    </div>
  );
}
