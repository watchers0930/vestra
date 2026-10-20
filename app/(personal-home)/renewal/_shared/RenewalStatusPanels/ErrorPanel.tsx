"use client";

/**
 * 오류/상태 조회 실패 패널(설계 §1.2·§5.1). 성공·완료로 오인하지 않고 재시도만 제공한다(AC-06).
 * 조회 실패를 자동 완료/홈 이동으로 바꾸지 않는다.
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RenewalStatusPanel } from "./RenewalStatusPanel";

interface ErrorPanelProps {
  title?: string;
  message: string;
  /** 재시도 버튼 라벨. */
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorPanel({ title = "상태를 확인하지 못했습니다", message, retryLabel = "다시 시도", onRetry }: ErrorPanelProps) {
  return (
    <RenewalStatusPanel
      title={title}
      tone="danger"
      icon={<AlertCircle size={16} aria-hidden />}
      banner={message}
      description="네트워크/서버 상태를 확인한 뒤 다시 시도해 주세요. 상태가 확인되기 전에는 다음 단계로 진행하지 않습니다."
      actions={
        onRetry && (
          <Button variant="secondary" fullWidth onClick={onRetry}>
            {retryLabel}
          </Button>
        )
      }
    />
  );
}
