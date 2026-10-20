"use client";

/**
 * 사업자 승인 대기 패널(설계 §5.1, AC-02·AC-05). "승인 대기"를 "인증 완료"처럼 보이지 않게 한다 —
 * 녹색 체크·완료 문구 금지, amber 톤 + 시계 아이콘으로 대기 상태를 명확히 한다. 수동 "상태 다시 확인"을
 * 필수 제공한다(재진입/포커스 복귀 갱신은 호출부가 담당). 심사 소요시간은 약속하지 않는다.
 */

import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { RenewalStatusPanel } from "./RenewalStatusPanel";

interface PendingPanelProps {
  /** 사업자 유형 라벨(설명용 힌트). 없으면 "사업자 회원". */
  roleLabel?: string;
  /** 상태 재조회(필수). */
  onRecheck: () => void;
  /** 재조회 진행 중 표시. */
  rechecking?: boolean;
  /** 보조 액션(마이페이지 등). */
  secondaryAction?: React.ReactNode;
  /**
   * 재조회 실패/세션 만료 안내. "아직 pending"과 "조회 자체가 실패"를 사용자가 구분할 수 있도록,
   * 재확인이 실패하면 이 영역에 사유(및 재로그인 유도)를 표시한다(§5.1 — 실패/재인증 노출).
   */
  notice?: React.ReactNode;
}

export function PendingPanel({ roleLabel = "사업자 회원", onRecheck, rechecking, secondaryAction, notice }: PendingPanelProps) {
  return (
    <RenewalStatusPanel
      title="사업자 인증 심사 중"
      tone="warning"
      icon={<Clock size={16} aria-hidden />}
      banner={`${roleLabel} 신청이 접수되어 관리자 승인을 기다리고 있습니다. 승인되면 이 단계에서 이어서 진행할 수 있습니다.`}
      description="아직 인증이 완료된 것은 아닙니다. 승인 여부는 아래 '상태 다시 확인'으로 새로 조회하거나, 마이페이지에서도 확인할 수 있습니다."
      actions={
        <>
          {notice}
          <Button variant="primary" fullWidth icon={RefreshCw} loading={rechecking} onClick={onRecheck}>
            상태 다시 확인
          </Button>
          {secondaryAction}
        </>
      }
    />
  );
}
