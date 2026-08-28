/**
 * 집키퍼 사건 상태 표시 메타 + 진행 타임라인 (클라이언트 안전, 순수).
 * 사용자 마이페이지·변호사 검수 양면에서 공용.
 */

export type StatusTone = "pending" | "progress" | "done" | "fail";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  desc: string;
}

export const KEEPZIP_STATUS_META: Record<string, StatusMeta> = {
  draft: { label: "작성 중", tone: "pending", desc: "내용증명을 작성 중입니다." },
  paid: { label: "검토 대기", tone: "progress", desc: "결제 완료 · 변호사 검토를 기다리고 있습니다." },
  lawyer_pending: { label: "변호사 검토 중", tone: "progress", desc: "담당 변호사가 문서를 검토·직인 중입니다." },
  lawyer_approved: { label: "직인 완료", tone: "progress", desc: "변호사 검토·직인이 완료되어 발송을 준비합니다." },
  postal_sent: { label: "발송됨", tone: "progress", desc: "우체국 등기로 발송되어 배송 중입니다." },
  delivered: { label: "배달 완료", tone: "done", desc: "상대방에게 배달이 완료되었습니다." },
  returned: { label: "반송", tone: "fail", desc: "수취인 부재 등으로 반송되었습니다." },
  canceled: { label: "반려됨", tone: "fail", desc: "변호사 검토에서 반려되었습니다. (환불 대상)" },
  refunded: { label: "환불", tone: "fail", desc: "환불 처리되었습니다." },
  closed: { label: "종결", tone: "done", desc: "사건이 종결되었습니다." },
  unresponded: { label: "미대응", tone: "progress", desc: "이행기한 내 상대방 대응이 없습니다." },
  payment_order: { label: "지급명령", tone: "progress", desc: "지급명령을 진행 중입니다." },
  litigation: { label: "소송 상담", tone: "progress", desc: "소송(변호사 선임)을 상담 중입니다." },
  public_notice: { label: "공시송달", tone: "progress", desc: "공시송달을 진행 중입니다." },
};

export function statusMeta(status?: string | null): StatusMeta {
  return KEEPZIP_STATUS_META[status ?? ""] ?? { label: status ?? "-", tone: "pending", desc: "" };
}

/** 진행 타임라인 4단계 */
export const KEEPZIP_TIMELINE = ["결제·접수", "변호사 검토·직인", "우체국 발송", "배달 완료"] as const;

/** status → 현재 완료된 타임라인 단계 인덱스(0~3). 실패 상태는 -1(별도 표기). */
export function timelineStep(status?: string | null): number {
  switch (status) {
    case "draft":
      return 0;
    case "paid":
    case "lawyer_pending":
    case "lawyer_approved":
      return 1;
    case "postal_sent":
      return 2;
    case "delivered":
    case "closed":
    case "unresponded":
    case "payment_order":
    case "litigation":
      return 3;
    case "canceled":
    case "returned":
    case "refunded":
    case "public_notice":
      return -1;
    default:
      return 1;
  }
}
