/**
 * 집키퍼(KeepZip) 내용증명 5종 템플릿·프롬프트 (설계서 §8.0 / §8.1)
 * ──────────────────────────────────────────────────────────────────────────
 * AI 초안 생성(/api/keepzip/draft)에서 사용하는:
 *   - 내용증명 종류(cause) 5종 메타·시스템 프롬프트
 *   - 서버 입력 검증(zod 미사용 → 수동 검증)
 *   - user 프롬프트 빌더
 *
 * ⚠️ AI 초안은 미리보기용이며, 실제 발송 전 반드시 변호사 승인·직인을 거친다(§8.2).
 */

import { sanitizeField } from "@/lib/sanitize";

export const KEEPZIP_CAUSES = [
  "deposit_return",       // 보증금 반환청구 (세입자→임대인)
  "terminate_by_tenant",  // 부동산 계약해지(세입자용)
  "terminate_by_landlord",// 부동산 계약해지(임대인용)
  "rent_arrears",         // 월세 청구 (임대인→세입자)
  "maintenance_arrears",  // 체납 관리비 납부 요청
] as const;

export type KeepzipCause = (typeof KEEPZIP_CAUSES)[number];

export type SenderSide = "tenant" | "landlord";

interface CauseMeta {
  label: string;
  senderSide: SenderSide;
  /** 종별 시스템 프롬프트(법적 근거·톤 지시) */
  system: string;
}

/** 모든 종에 공통 적용되는 출력 형식·행동 지침 */
const COMMON_SYSTEM = `당신은 대한민국 부동산 임대차 분쟁 내용증명을 작성하는 법률 문서 전문가다.
아래 지침을 반드시 지켜라.
- 대한민국 내용증명 형식으로 작성한다: 제목, 발신인/수신인, 번호를 매긴 본문 문단, 청구(또는 통지) 취지, 이행 기한, 불이행 시 법적 조치 예고 순서.
- 입력으로 주어진 사실만 사용하고, 주어지지 않은 금액·날짜·이름은 임의로 지어내지 말고 "(해당 정보 기재)" 형태의 공란으로 남긴다.
- 정중하되 법적 효력과 압박이 분명한 어조를 쓴다. 허위·과장 사실을 넣지 않는다.
- 관련 법조문을 정확히 인용한다(불확실하면 조문 번호를 지어내지 말 것).
- 반드시 아래 JSON 형식으로만 응답한다:
  {"title": "문서 제목", "content": "내용증명 본문 전체(줄바꿈 포함)"}`;

const CAUSE_META: Record<KeepzipCause, CauseMeta> = {
  deposit_return: {
    label: "보증금 반환청구",
    senderSide: "tenant",
    system: `[내용증명 종류: 임대차 보증금 반환청구 — 발신인=임차인, 수신인=임대인]
- 임대차계약 종료(기간 만료 또는 묵시적 갱신 종료 통지)에 따라 임대인의 보증금 반환 의무가 발생했음을 적시한다.
- 반환 희망(청구) 기한을 명시하고, 미이행 시 조치를 경고한다: 주택임대차보호법 제3조의3에 따른 임차권등기명령, 민사집행법 제276조 이하의 가압류 등 보전처분, 보증금반환청구 소송.
- 소송 제기 시 지연손해금은 소송촉진 등에 관한 특례법 제3조 제1항에 따라 연 12%가 적용될 수 있음을 고지한다.`,
  },
  terminate_by_tenant: {
    label: "부동산 계약해지(세입자용)",
    senderSide: "tenant",
    system: `[내용증명 종류: 임대차계약 해지 통지 — 발신인=임차인, 수신인=임대인]
- 임차인이 임대인에게 계약을 종료(해지)하겠다는 의사를 명확히 통지하는 문서다.
- 해지 사유(기간 만료 / 묵시적 갱신 상태에서의 종료 희망)를 적시한다. 묵시적 갱신 종료는 주택임대차보호법 제6조의2(임차인의 해지권, 통지 후 3개월 경과 시 효력)를 근거로 한다.
- 계약 종료일과 그에 따른 보증금 반환 요청을 함께 통지한다.`,
  },
  terminate_by_landlord: {
    label: "부동산 계약해지(임대인용)",
    senderSide: "landlord",
    system: `[내용증명 종류: 임대차계약 해지 통지 — 발신인=임대인, 수신인=임차인]
- 임대인이 임차인에게 계약 해지를 통지하는 문서다.
- 해지 사유(임대료 연체 / 임대 대상물 무단 변경 / 무단 전대차 / 무단 임차권 양도 / 임대기간 만료 / 기타)를 적시한다.
- 근거 법조문을 사유에 맞게 인용한다: 차임 연체(2기분)는 민법 제640조, 무단 전대·임차권 양도는 민법 제629조, 용법 위반 등은 민법 제654조·제610조.
- 연체 차임이 있으면 그 금액과 납부 기한을 함께 통지하고, 불이행 시 명도(부동산 인도) 청구 소송 등 조치를 예고한다.`,
  },
  rent_arrears: {
    label: "월세 청구",
    senderSide: "landlord",
    system: `[내용증명 종류: 연체 차임(월세) 납부 청구 — 발신인=임대인, 수신인=임차인]
- 임차인의 차임(월세) 연체 사실과 연체 총액을 적시하고 납부를 청구한다.
- 납부 기한을 명시하고, 미납 시 조치를 경고한다: 민법 제640조에 따른 계약 해지(차임 2기분 연체 시), 명도 청구 소송, 연체 차임에 대한 지연손해금.
- 연체가 계속될 경우 계약 해지 및 보증금에서의 공제 가능성을 고지한다.`,
  },
  maintenance_arrears: {
    label: "체납 관리비 납부 요청",
    senderSide: "landlord",
    system: `[내용증명 종류: 체납 관리비 납부 요청 — 발신인=임대인/관리주체, 수신인=입주민(임차인)]
- 관리비 체납 시작 시기와 미납 총액을 적시하고 납부를 요청한다.
- 근거: 관리규약·임대차계약상 관리비 납부 의무, 공동주택관리법(공동주택인 경우), 집합건물의 소유 및 관리에 관한 법률(집합건물인 경우).
- 납부 기한을 명시하고, 미납 시 연체료 부과 및 소액 지급명령·소송 등 법적 조치를 예고한다.`,
  },
};

export function isKeepzipCause(v: unknown): v is KeepzipCause {
  return typeof v === "string" && (KEEPZIP_CAUSES as readonly string[]).includes(v);
}

export function causeLabel(cause: KeepzipCause): string {
  return CAUSE_META[cause].label;
}

export function causeSystemPrompt(cause: KeepzipCause): string {
  return `${COMMON_SYSTEM}\n\n${CAUSE_META[cause].system}`;
}

// ── 입력 검증 ────────────────────────────────────────────────────────────────

export interface DraftInput {
  cause: KeepzipCause;
  senderSide: SenderSide;
  senderName: string;
  recipientName: string;
  address: string;
  /** 종별 선택 값 (없으면 프롬프트에서 공란 처리) */
  deposit?: number;          // 보증금
  arrears?: number;          // 연체 차임/관리비 총액
  contractDate?: string;     // 계약일
  endDate?: string;          // 계약 종료일
  dueDate?: string;          // 반환/납부 희망 기한
  reason?: string;           // 해지/종료 사유(기간만료·묵시연장·임대료연체 등)
  etcReason?: string;        // 기타 사유 자유 텍스트
  arrearsStart?: string;     // 체납 시작 시기(자유 텍스트)
}

export interface ValidationResult {
  ok: boolean;
  data?: DraftInput;
  error?: string;
}

/** 숫자 파싱 — 유한한 0 이상 정수만 통과, 그 외 undefined */
function parseAmount(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

/** 서버 측 입력 재검증 + 정제 (모든 문자열 sanitize) */
export function validateDraftInput(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "요청 본문이 없습니다." };
  const b = raw as Record<string, unknown>;

  if (!isKeepzipCause(b.cause)) {
    return { ok: false, error: "지원하지 않는 내용증명 종류입니다." };
  }
  const cause = b.cause;

  const senderName = sanitizeField(String(b.senderName ?? ""), 100);
  const recipientName = sanitizeField(String(b.recipientName ?? ""), 100);
  const address = sanitizeField(String(b.address ?? ""), 300);

  if (!senderName) return { ok: false, error: "발신인 성명을 입력해주세요." };
  if (!recipientName) return { ok: false, error: "수신인 성명을 입력해주세요." };
  if (!address) return { ok: false, error: "대상 주소를 입력해주세요." };

  // senderSide는 cause에서 파생(클라이언트 값 신뢰하지 않음)
  const senderSide = CAUSE_META[cause].senderSide;

  return {
    ok: true,
    data: {
      cause,
      senderSide,
      senderName,
      recipientName,
      address,
      deposit: parseAmount(b.deposit),
      arrears: parseAmount(b.arrears),
      contractDate: sanitizeField(String(b.contractDate ?? ""), 20) || undefined,
      endDate: sanitizeField(String(b.endDate ?? ""), 20) || undefined,
      dueDate: sanitizeField(String(b.dueDate ?? ""), 20) || undefined,
      reason: sanitizeField(String(b.reason ?? ""), 100) || undefined,
      etcReason: sanitizeField(String(b.etcReason ?? ""), 500) || undefined,
      arrearsStart: sanitizeField(String(b.arrearsStart ?? ""), 50) || undefined,
    },
  };
}

// ── user 프롬프트 빌더 ───────────────────────────────────────────────────────

function won(n?: number): string {
  return n === undefined ? "(금액 기재)" : `${n.toLocaleString("ko-KR")}원`;
}

export function buildUserPrompt(input: DraftInput): string {
  const lines: string[] = [
    `내용증명 종류: ${causeLabel(input.cause)}`,
    `발신인: ${input.senderName}`,
    `수신인: ${input.recipientName}`,
    `대상 부동산 주소: ${input.address}`,
  ];
  if (input.contractDate) lines.push(`계약일: ${input.contractDate}`);
  if (input.endDate) lines.push(`계약 종료(예정)일: ${input.endDate}`);
  if (input.reason) lines.push(`사유: ${input.reason}`);
  if (input.etcReason) lines.push(`기타 사유: ${input.etcReason}`);
  if (input.deposit !== undefined) lines.push(`임대차 보증금: ${won(input.deposit)}`);
  if (input.arrears !== undefined) lines.push(`연체/미납 총액: ${won(input.arrears)}`);
  if (input.arrearsStart) lines.push(`체납 시작 시기: ${input.arrearsStart}`);
  if (input.dueDate) lines.push(`이행(반환/납부) 희망 기한: ${input.dueDate}`);

  return `${lines.join("\n")}\n\n위 정보로 내용증명 초안을 JSON 형식으로 작성하라.`;
}
