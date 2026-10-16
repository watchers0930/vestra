/**
 * 비회원 등기감시 — 프론트 레이어 계약 확장 타입 (설계 pdf.design.md §2.2 / §2.3).
 *
 * 공유 타입(types/guest-monitoring.ts)은 백엔드(Codex)가 계약 SSOT로 관리하므로 프론트에서 건드리지
 * 않는다. parse-pdf 응답의 동/호 분리(unitNumber)와 identity/start(apply)의 role처럼 이번 재설계로
 * 추가된 필드는, 기존 선례(guestApi.ts의 GuestPaymentCallbackRequest)대로 공유 타입을 교차(intersection)
 * 확장해 프론트 레이어에 둔다. 서버 응답/요청의 런타임 모양은 설계 §3 스펙과 1:1로 일치한다.
 */

import type { GuestDraftResponse, GuestIdentityStartRequest } from "@/types/guest-monitoring";

/** 신청 역할(설계 §0.1·§2.2). 권한 확대 플래그가 아니라 신청 맥락 구분. */
export type GuestMonitoringRole = "owner" | "tenant";

/**
 * 집합건물 전유부분의 동/호 분리(설계 §2.2·§2.6). 표시 전용이며 서버 저장 입력이 아니다.
 * 비집합건물은 buildingDong·unitHo 모두 ""(해당 없음), isAggregate=false.
 */
export interface GuestUnitNumber {
  buildingDong: string;
  unitHo: string;
  isAggregate: boolean;
}

/** parse-pdf 성공 응답(설계 §3.1) — 공유 타입에 동/호 분리(unitNumber)를 더한 프론트 계약. */
export type GuestDraft = GuestDraftResponse & { unitNumber: GuestUnitNumber };

/**
 * identity/start 요청(설계 §3.2) — apply 경로는 role 필수. status/renewal은 role을 넣지 않는다.
 * role은 선택 필드로 두고(apply에서만 채워 전송), 서버가 enum·purpose refine으로 최종 검증한다.
 */
export type GuestIdentityStartRequestWithRole = GuestIdentityStartRequest & {
  role?: GuestMonitoringRole;
};
