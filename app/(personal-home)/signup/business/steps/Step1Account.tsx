"use client";

/** 사업자 위저드 1단계 — 가입(설계 §4.2). 로그인·회원 생성 완료 시 다음 단계로. 기존 계정은 완료로 표시. */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { stepPath } from "../wizardConfig";

export function Step1Account() {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <div className="rounded-2xl border border-[#e5e5e7] bg-white p-7">
      <h1 className="text-xl font-bold text-[#1d1d1f]">사업자 회원 가입</h1>
      <p className="mt-2 text-sm text-[#6e6e73]">
        사업자 회원은 가입 → 사업자 인증 → 플랜 선택 → 결제의 4단계로 진행합니다.
      </p>

      {authenticated ? (
        <div className="mt-6">
          <div className="flex items-center gap-2 rounded-xl bg-[#e8f8ee] px-4 py-3 text-sm font-medium text-[#1d8a44]">
            <CheckCircle2 size={16} className="text-[#30d158]" />
            로그인이 완료되었습니다. 다음 단계로 진행하세요.
          </div>
          <div className="mt-5">
            <Link href={stepPath(2)}>
              <Button variant="primary" fullWidth>
                다음: 사업자 인증
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-[#48484a]">
            먼저 로그인하거나 가입해 주세요. 가입 후 이 위저드로 돌아와 이어서 진행할 수 있습니다.
          </p>
          <div className="mt-5">
            <Link href="/home?auth=login">
              <Button variant="primary" fullWidth>
                로그인 / 가입하기
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
