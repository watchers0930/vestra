"use client";

/**
 * 사업자 위저드 2단계 — 사업자정보/인증(설계 §4.2). 실제 사업자정보 제출·관리자 인증은 기존 서버 흐름
 * (`/signup/complete` → /api/user/setup-role, admin/verify)을 그대로 재사용한다(인증 서버 코드 미변경).
 * 이 화면은 인증 상태 표시와 이어하기 안내만 담당한다. verified일 때만 다음 단계로 진입한다.
 */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/common/Button";
import { stepPath } from "../wizardConfig";

const BIZ_ROLES: Array<{ role: string; label: string }> = [
  { role: "RENTAL_BIZ", label: "임대사업자" },
  { role: "BUSINESS", label: "기업" },
  { role: "REALESTATE", label: "부동산 중개사" },
];

export function Step2Verify() {
  const { data: session } = useSession();
  const verifyStatus = session?.user?.verifyStatus ?? "none";

  if (verifyStatus === "verified") {
    return (
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
        <h1 className="text-xl font-bold text-[#1d1d1f]">사업자 인증 완료</h1>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#e8f8ee] px-4 py-3 text-sm font-medium text-[#1d8a44]">
          <CheckCircle2 size={16} className="text-[#30d158]" />
          사업자 인증이 승인되었습니다. 플랜을 선택해 주세요.
        </div>
        <div className="mt-5">
          <Link href={stepPath(3)}>
            <Button variant="primary" fullWidth>
              다음: 플랜 선택
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (verifyStatus === "pending") {
    return (
      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
        <h1 className="text-xl font-bold text-[#1d1d1f]">사업자 인증 심사 중</h1>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#fff8e8] px-4 py-3 text-sm font-medium text-[#b26a00]">
          <Clock size={16} />
          제출하신 사업자 정보를 심사하고 있습니다. 승인되면 이 단계에서 이어서 진행할 수 있습니다.
        </div>
        <p className="mt-4 text-[13px] text-[#8e8e93]">
          심사 상태는 마이페이지에서도 확인할 수 있습니다.
        </p>
        <div className="mt-5">
          <Link href="/profile?tab=tier">
            <Button variant="secondary" fullWidth>
              마이페이지에서 상태 보기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // none / rejected — 사업자 정보 제출로 안내(기존 흐름 재사용)
  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-[#1d1d1f]">사업자 정보 인증</h1>
      </div>
      <p className="mt-2 text-sm text-[#6e6e73]">
        사업자 유형을 선택하고 사업자번호·상호·대표자 정보를 제출해 주세요. 관리자 승인 후 다음 단계가 열립니다.
      </p>
      {verifyStatus === "rejected" && (
        <p className="mt-3 rounded-lg bg-[#fff4f3] px-3 py-2 text-[13px] text-[#c0392b]">
          이전 인증 신청이 반려되었습니다. 정보를 다시 확인해 제출해 주세요.
        </p>
      )}
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {BIZ_ROLES.map((r) => (
          <Link key={r.role} href={`/signup/complete?intendedRole=${r.role}`}>
            <Button variant="secondary" fullWidth>
              {r.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
