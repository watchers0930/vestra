"use client";

/** 재인증 필요 패널(설계 §5.1). 세션 만료/미인증 — 로그인 유도. 복구 경로를 막지 않는다. */

import { LogIn } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RenewalStatusPanel } from "./RenewalStatusPanel";

export function ReauthPanel({ onLogin }: { onLogin: () => void }) {
  return (
    <RenewalStatusPanel
      title="로그인이 필요합니다"
      tone="neutral"
      icon={<LogIn size={16} aria-hidden />}
      banner="세션이 만료되었거나 로그인이 필요합니다. 다시 로그인하면 이어서 진행할 수 있습니다."
      actions={
        <Button variant="primary" fullWidth onClick={onLogin}>
          로그인하기
        </Button>
      }
    />
  );
}
