"use client";

import { useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import s from "./LoginModal.module.css";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  // ESC 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSocialLogin = (provider: "google" | "naver") => {
    try {
      sessionStorage.setItem("vestra_alive", "1");
    } catch {}
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div
      className={s.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="로그인"
    >
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <button className={s.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <div className={s.head}>
          <div className={s.brand}>VESTRA</div>
          <p className={s.subtitle}>AI 부동산 자산관리 플랫폼</p>
        </div>

        <p className={s.tabHint}>간편하게 로그인하세요</p>

        {/* 소셜 간편 로그인 */}
        <div className={s.socials}>
          <button
            className={`${s.social} ${s.google}`}
            onClick={() => handleSocialLogin("google")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 로그인
          </button>

          <button
            className={`${s.social} ${s.naver}`}
            onClick={() => handleSocialLogin("naver")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
            </svg>
            네이버로 로그인
          </button>
        </div>

        {/* 간편가입 */}
        <div className={s.divider}>
          <span className={s.dividerText}>아직 회원이 아니신가요?</span>
        </div>
        <Link href="/signup" className={s.signup} onClick={onClose}>
          <strong>간편가입</strong> 하러 가기
        </Link>
      </div>
    </div>
  );
}
