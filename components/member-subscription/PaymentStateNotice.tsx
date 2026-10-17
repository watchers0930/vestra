"use client";

/**
 * 결제 진행/결과 안내 UI(설계 §5.2·§4.9). 결제 상태머신의 표시 상태만 받아 렌더한다(UI 전용).
 * 완료는 서버 확정(paid&&applied) 이후에만 done으로 전달된다. 실패 메시지는 사용자용 일반 안내다.
 */

import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/common/Button";

interface PaymentStateNoticeProps {
  busy: boolean;
  done: boolean;
  /** failed일 때만 메시지. 그 외 null */
  errorMessage: string | null;
  /** 재시도 가능한 실패(retry_payment/recheck/일시 오류)인가 */
  canRetry: boolean;
  onRetry: () => void;
  onReset: () => void;
  doneMessage?: string;
}

export function PaymentStateNotice({
  busy,
  done,
  errorMessage,
  canRetry,
  onRetry,
  onReset,
  doneMessage = "구독이 적용되었습니다.",
}: PaymentStateNoticeProps) {
  if (busy) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] px-4 py-3 text-sm text-[#48484a]">
        <Loader2 size={16} className="animate-spin text-primary" />
        결제를 진행하고 결과를 확인하고 있습니다. 창을 닫지 말고 잠시만 기다려 주세요.
      </div>
    );
  }
  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[#e8f8ee] px-4 py-3 text-sm font-medium text-[#1d8a44]">
        <CheckCircle2 size={16} className="text-[#30d158]" />
        {doneMessage}
      </div>
    );
  }
  if (errorMessage) {
    return (
      <div className="rounded-xl bg-[#fff4f3] px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-[#c0392b]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {canRetry && (
            <Button variant="primary" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onReset}>
            처음으로
          </Button>
        </div>
      </div>
    );
  }
  return null;
}
