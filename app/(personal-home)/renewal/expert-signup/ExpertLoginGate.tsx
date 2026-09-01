"use client";

import { signIn } from "next-auth/react";
import { markSignupIntent } from "@/lib/signup-intent";
import { Globe, Users, FileCheck, CalendarCheck } from "lucide-react";

/** 로그인 후 전문가 가입 폼으로 복귀 */
const CALLBACK = "/renewal/expert-signup";

const FIELDS = ["변호사", "법무사", "세무사", "회계사", "감정평가사"];

const BENEFITS = [
  { icon: Globe, title: "나만의 전문가 홈페이지", desc: "약력·경력·전문분야를 담은 미니홈페이지가 자동으로 만들어집니다." },
  { icon: Users, title: "고객 상담·의뢰 연결", desc: "부동산 분쟁·자문이 필요한 고객과 1:1로 직접 연결됩니다." },
  { icon: FileCheck, title: "내용증명 검수·수임", desc: "AI가 작성한 내용증명을 검수하고 전자직인으로 수임합니다." },
  { icon: CalendarCheck, title: "상담·방문 일정 관리", desc: "상담 신청과 방문 예약을 캘린더 한 곳에서 관리합니다." },
];

const STEPS = [
  { n: "1", t: "소셜 로그인", d: "구글·네이버로 간편하게 시작" },
  { n: "2", t: "자격 정보 등록", d: "분야·등록번호·소속 입력" },
  { n: "3", t: "자격 심사", d: "관리자가 자격을 확인" },
  { n: "4", t: "전문가 승인", d: "승인 즉시 활동 시작" },
];

const ACCENT = "#2e4bd8";

/**
 * 전문가 가입 로그인 게이트 — 흰 배경 2칼럼(좌 설명·혜택 / 우 소셜 로그인).
 * 전문가 계정은 소셜 User와 1:1 연결(LawyerPartner.userId)되므로 폼 입력 전 로그인이 선행되어야 한다.
 */
export default function ExpertLoginGate() {
  const handleSocial = (provider: "google" | "naver") => {
    markSignupIntent();
    signIn(provider, { callbackUrl: CALLBACK });
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2.5rem", alignItems: "flex-start" }}>
      {/* 좌: 설명 + 혜택 */}
      <div style={{ flex: "1 1 440px", minWidth: 0 }}>
        <span
          className="inline-block rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide"
          style={{ background: "rgba(46,75,216,0.08)", color: ACCENT }}
        >
          VESTRA 전문가 파트너
        </span>
        <h1 className="mt-6 font-extrabold leading-tight text-gray-900" style={{ fontSize: "clamp(2.6rem, 5.5vw, 5.3rem)" }}>
          부동산 전문가로,<br />더 많은 고객과 만나세요
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-gray-500">
          VESTRA에 전문가로 등록하면 나만의 홈페이지부터 고객 연결,<br />내용증명 수임까지
          한 곳에서 시작할 수 있습니다.
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <span key={f} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
              {f}
            </span>
          ))}
        </div>

        {/* 혜택 리스트 */}
        <div className="mt-10 flex flex-col gap-6">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(46,75,216,0.08)" }}>
                <Icon size={19} style={{ color: ACCENT }} strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 우: 소셜 로그인 + 절차 (카드) */}
      <div
        className="rounded-2xl border border-gray-200 bg-white p-7"
        style={{ flex: "0 0 380px", maxWidth: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        <h2 className="text-lg font-extrabold text-gray-900">소셜 계정으로 시작하기</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
          로그인 후 자격 정보를 등록하면 심사를 거쳐 전문가 계정이 승인됩니다.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleSocial("google")}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google로 계속하기
          </button>
          <button
            type="button"
            onClick={() => handleSocial("naver")}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#03C75A] py-3 text-sm font-medium text-white transition-all hover:brightness-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
            </svg>
            네이버로 계속하기
          </button>
        </div>

        {/* 가입 절차 (세로) */}
        <div className="mt-7 border-t border-gray-100 pt-6">
          <p className="mb-4 text-xs font-semibold text-gray-500">가입 절차</p>
          <div className="flex flex-col gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ACCENT }}>
                  {s.n}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{s.t}</p>
                  <p className="text-[11.5px] text-gray-400">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
