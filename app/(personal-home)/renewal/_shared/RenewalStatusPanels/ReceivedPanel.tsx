"use client";

/**
 * 사업자 신청 접수 패널(설계 §5.1, AC-02). 기존 "등록 완료/녹색 체크/3초 자동이동"을 대체한다 —
 * HTTP 200은 접수 성공이지 승인/인증 완료가 아니므로, 녹색 완료가 아닌 "접수 → 승인 대기"로 표현한다.
 */

import { Clock, Inbox } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RenewalStatusPanel } from "./RenewalStatusPanel";

interface ReceivedPanelProps {
  roleLabel: string;
  /** 승인 대기 단계로 이어가기. */
  onContinue: () => void;
}

export function ReceivedPanel({ roleLabel, onContinue }: ReceivedPanelProps) {
  return (
    <RenewalStatusPanel
      title="신청이 접수되었습니다"
      tone="warning"
      icon={<Inbox size={16} aria-hidden />}
      banner={`${roleLabel} 인증을 신청했습니다. 아직 승인 전이며, 관리자 승인 후 플랜 선택 단계가 열립니다.`}
      description="접수는 인증 완료가 아닙니다. 다음 화면에서 승인 상태를 확인하고 이어서 진행할 수 있습니다."
      actions={
        <Button variant="primary" fullWidth icon={Clock} onClick={onContinue}>
          승인 대기 화면으로
        </Button>
      }
    />
  );
}
