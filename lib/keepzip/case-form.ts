/**
 * 집키퍼 내용증명 작성 폼 — 공통 데이터·타입 (클라이언트 안전, 순수)
 * 임차인 화면((personal-home)/renewal/keepzip)과 임대인 화면((app)/keepzip)이 공유.
 * 서버 프롬프트(lib/keepzip/cd-template.ts)와 cause 코드값만 일치.
 */

export type SenderSide = "tenant" | "landlord";

export type KeepzipCause =
  | "deposit_return"
  | "terminate_by_tenant"
  | "terminate_by_landlord"
  | "rent_arrears"
  | "maintenance_arrears";

export type FieldType = "amount" | "date" | "select" | "text";

export interface CaseFieldDef {
  key: keyof DraftFormData;
  type: FieldType;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  condition?: (f: DraftFormData) => boolean;
}

export interface DraftFormData {
  cause?: KeepzipCause;
  senderName: string;
  recipientName: string;
  address: string;        // 도로명 주소(다음 우편번호 검색 결과)
  zipCode: string;        // 우편번호(zonecode)
  addressDetail: string;  // 상세주소(집합건물 동/호수 등)
  isBuilding: string;     // "Y"|"N" — 집합건물(공동주택) 여부. 동/호수 입력폼 노출 제어
  deposit: string;
  arrears: string;
  contractDate: string;
  endDate: string;
  dueDate: string;
  reason: string;
  etcReason: string;
  arrearsStart: string;
}

export interface DraftResult {
  cause: string;
  causeLabel: string;
  senderSide: string;
  title: string;
  content: string;
}

export const EMPTY_FORM: DraftFormData = {
  cause: undefined,
  senderName: "", recipientName: "", address: "",
  zipCode: "", addressDetail: "", isBuilding: "N",
  deposit: "", arrears: "", contractDate: "", endDate: "",
  dueDate: "", reason: "", etcReason: "", arrearsStart: "",
};

/** 초안 전송용 전체 주소 문자열(도로명 + 상세주소) */
export function fullAddress(form: DraftFormData): string {
  return [form.address, form.addressDetail].filter((v) => v && v.trim()).join(" ").trim();
}

interface SideMeta {
  senderLabel: string;
  recipientLabel: string;
  causes: KeepzipCause[];
}

/** 발신 주체별: 작성 가능한 종류 + 당사자 라벨 */
export const SIDE_META: Record<SenderSide, SideMeta> = {
  tenant: {
    senderLabel: "임차인 (발신 · 본인)",
    recipientLabel: "임대인 (수신)",
    causes: ["deposit_return", "terminate_by_tenant"],
  },
  landlord: {
    senderLabel: "임대인 (발신 · 본인)",
    recipientLabel: "임차인 / 입주민 (수신)",
    causes: ["terminate_by_landlord", "rent_arrears", "maintenance_arrears"],
  },
};

export const CAUSE_LABELS: Record<KeepzipCause, string> = {
  deposit_return: "보증금 반환청구",
  terminate_by_tenant: "부동산 계약해지 (세입자용)",
  terminate_by_landlord: "부동산 계약해지 (임대인용)",
  rent_arrears: "월세 청구",
  maintenance_arrears: "체납 관리비 납부 요청",
};

export const CAUSE_DESC: Record<KeepzipCause, string> = {
  deposit_return: "계약이 끝났는데 보증금을 돌려주지 않을 때",
  terminate_by_tenant: "집주인에게 계약을 끝내겠다고 알릴 때",
  terminate_by_landlord: "임차인에게 계약을 끝내겠다고 알릴 때",
  rent_arrears: "임차인이 월세를 내지 않을 때",
  maintenance_arrears: "관리비를 내지 않는 입주민에게 납부를 요청할 때",
};

const TERMINATION_REASON = [
  { value: "기간 만료", label: "기간 만료" },
  { value: "묵시적연장 종료희망", label: "묵시적연장 종료희망" },
];

const LANDLORD_REASON = [
  { value: "임대료 연체", label: "임대료 연체" },
  { value: "임대 대상물 무단 변경", label: "임대 대상물 무단 변경" },
  { value: "무단 전대차", label: "무단 전대차" },
  { value: "무단 임차권 양도", label: "무단 임차권 양도" },
  { value: "임대기간 만료", label: "임대기간 만료" },
  { value: "기타", label: "기타" },
];

/** 종류별 추가 입력 필드 (공통 당사자·주소 필드는 화면이 별도 렌더) */
export const CAUSE_FIELDS: Record<KeepzipCause, CaseFieldDef[]> = {
  deposit_return: [
    { key: "deposit", type: "amount", label: "임차보증금 (원)" },
    { key: "reason", type: "select", label: "계약 종료 사유", options: TERMINATION_REASON },
    { key: "contractDate", type: "date", label: "계약일" },
    { key: "dueDate", type: "date", label: "보증금 반환 희망일" },
  ],
  terminate_by_tenant: [
    { key: "deposit", type: "amount", label: "임차보증금 (원)" },
    { key: "reason", type: "select", label: "계약 해지 사유", options: TERMINATION_REASON },
    { key: "contractDate", type: "date", label: "계약일" },
    { key: "dueDate", type: "date", label: "보증금 반환 희망일" },
  ],
  terminate_by_landlord: [
    { key: "reason", type: "select", label: "해지 사유", options: LANDLORD_REASON },
    { key: "arrears", type: "amount", label: "연체 임대료 총액 (원)", condition: (f) => f.reason === "임대료 연체" },
    { key: "etcReason", type: "text", label: "기타 사유", placeholder: "예: 임대 목적물 불법 전대", condition: (f) => f.reason === "기타" },
    { key: "endDate", type: "date", label: "임대차 종료일" },
    { key: "contractDate", type: "date", label: "계약일" },
  ],
  rent_arrears: [
    { key: "arrears", type: "amount", label: "연체 임대료 총액 (원)" },
    { key: "contractDate", type: "date", label: "계약일" },
  ],
  maintenance_arrears: [
    { key: "arrearsStart", type: "text", label: "체납 시작 시기", placeholder: "예: 2025년 6월" },
    { key: "arrears", type: "amount", label: "미납 관리비 총액 (원)" },
  ],
};

/** 특정 폼 상태에서 활성화된(조건 충족) 필드만 반환 */
export function activeFields(form: DraftFormData): CaseFieldDef[] {
  if (!form.cause) return [];
  return CAUSE_FIELDS[form.cause].filter((f) => !f.condition || f.condition(form));
}

/** 금액(원) → "1억 2,300만원" 한글 단위 힌트 */
export function amountHint(raw: string): string {
  const n = Number(String(raw).replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  const eok = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  return parts.length ? `${parts.join(" ")}원` : `${n.toLocaleString("ko-KR")}원`;
}
