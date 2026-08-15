"use client";

import type { ReactNode } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Map, Landmark, Calculator } from "lucide-react";
import RenewalGnb, { type RenewalGnbKey } from "./RenewalGnb";

interface Props {
  active: RenewalGnbKey;
  featureName: string;
  /** 로그인 안내 부제 (기능 설명) */
  description?: string;
  children: ReactNode;
}

const PUBLIC_LINKS = [
  { href: "/renewal/price-map", label: "시세지도", Icon: Map },
  { href: "/renewal/official-price", label: "공시가격", Icon: Landmark },
  { href: "/renewal/tax", label: "세금계산", Icon: Calculator },
];

/**
 * renewal 로그인 필수 기능 게이트.
 * 비로그인 시 renewal 톤 로그인 유도 화면을, 로그인 시 children을 렌더한다.
 * (기존 AuthGuard와 동일한 로그인 정책: Google/Naver signIn + 공개기능 안내)
 */
export default function RenewalAuthGate({ active, featureName, description, children }: Props) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const callbackUrl = pathname || "/renewal/monitoring";

  if (status === "loading") {
    return (
      <>
        <RenewalGnb active={active} />
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#1a1d2e" }} className="animate-spin" />
        </div>
      </>
    );
  }

  if (session?.user) {
    return <>{children}</>;
  }

  return (
    <>
      <RenewalGnb active={active} />

      {/* 다크 히어로 */}
      <section
        style={{
          position: "relative",
          padding: "72px 20px 64px",
          background: "linear-gradient(135deg, #1a1d2e 0%, #2a2f45 100%)",
          textAlign: "center",
          color: "#fff",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#9db2ff",
            background: "rgba(157,178,255,0.12)",
            border: "1px solid rgba(157,178,255,0.25)",
            borderRadius: 20,
            padding: "5px 14px",
            marginBottom: 16,
          }}
        >
          Members Only
        </span>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 10px" }}>{featureName}</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.72)", margin: 0 }}>
          {description || `${featureName}은(는) 로그인 후 이용할 수 있는 회원 전용 기능입니다`}
        </p>
      </section>

      {/* 로그인 카드 */}
      <div style={{ maxWidth: 420, margin: "-32px auto 64px", padding: "0 20px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, textAlign: "center", margin: "0 0 20px", color: "#1a1d2e" }}>로그인</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => signIn("google", { callbackUrl })}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 500, color: "#1d1d1f", cursor: "pointer" }}
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
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#03C75A", fontSize: 14, fontWeight: 500, color: "#fff", cursor: "pointer" }}
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
            <Link href="/signup" style={{ fontWeight: 600, color: "#0071e3" }}>회원가입</Link>
          </p>
        </div>
      </div>
    </>
  );
}
