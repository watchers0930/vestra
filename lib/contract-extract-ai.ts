/**
 * 계약서 핵심정보 AI 추출 (당사자·금액·기간·지급일정)
 *
 * 정규식 파서(`extractContractInfo`)는 한글 금액("이억오천만원")·다양한
 * 당사자 표기·표 형식에 취약해 오추출이 잦다. LLM으로 계약서 텍스트에서
 * 핵심 정보를 구조화 추출해 정규식 결과를 보정한다.
 *
 * @module lib/contract-extract-ai
 */

import { getOpenAIClient, OPENAI_MODEL, REASONING_ANALYTICAL } from "@/lib/openai";
import { CONTRACT_EXTRACT_PROMPT } from "@/lib/prompts";
import type {
  ContractExtractedInfo,
  ContractPaymentItem,
  ContractPropertyDetail,
} from "@/lib/contract-analyzer";

const MAX_INPUT_CHARS = 12000;

function toPosInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[,\s원]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** "YYYY-MM-DD" 정규화 (그 외 형식도 관대 처리) */
function toDate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = v.match(/(\d{4})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})/);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const mm = mo.padStart(2, "0");
  const dd = d.padStart(2, "0");
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return undefined;
  return `${y}-${mm}-${dd}`;
}

/** 라벨·일반어를 이름으로 오인하지 않도록 방어 */
const NAME_STOPWORDS = new Set([
  "성명", "이름", "임대인", "임차인", "매도인", "매수인", "쌍방", "갑", "을",
  "당사자", "본인", "대리인", "소유자", "귀하", "주소", "성함",
]);
function toName(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < 2 || s.length > 40) return undefined;
  if (NAME_STOPWORDS.has(s)) return undefined;
  return s;
}

function toStr(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function coercePayments(v: unknown): ContractPaymentItem[] {
  if (!Array.isArray(v)) return [];
  const out: ContractPaymentItem[] = [];
  for (const raw of v.slice(0, 10)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const label = r.label === "계약금" || r.label === "중도금" || r.label === "잔금" ? r.label : undefined;
    if (!label) continue;
    out.push({
      label,
      amount: toPosInt(r.amount),
      dueDate: toDate(r.dueDate),
      rawText: `${label}${toPosInt(r.amount) ? ` ${toPosInt(r.amount)?.toLocaleString()}원` : ""}`,
    });
  }
  return out;
}

/** "부동산의 표시" 표 항목 검증 (label·value 문자열, 상한·길이 제한) */
function coercePropertyDetails(v: unknown): ContractPropertyDetail[] {
  if (!Array.isArray(v)) return [];
  const out: ContractPropertyDetail[] = [];
  for (const raw of v.slice(0, 20)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const label = toStr(r.label, 40);
    const value = toStr(r.value, 300);
    if (!label || !value) continue;
    out.push({ label, value });
  }
  return out;
}

/** 모델 raw JSON → 검증된 부분 추출 결과 */
export function coerceExtractedAI(raw: unknown): Partial<ContractExtractedInfo> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    propertyAddress: toStr(r.propertyAddress),
    propertyDetails: coercePropertyDetails(r.propertyDetails),
    landlordName: toName(r.landlordName),
    tenantName: toName(r.tenantName),
    depositAmount: toPosInt(r.depositAmount),
    monthlyRentAmount: toPosInt(r.monthlyRentAmount),
    contractStartDate: toDate(r.contractStartDate),
    contractEndDate: toDate(r.contractEndDate),
    paymentSchedule: coercePayments(r.paymentSchedule),
  };
}

/**
 * 계약서 텍스트 → 핵심정보 부분 추출. 실패 시 null(정규식 폴백).
 */
export async function extractContractInfoAI(
  text: string,
): Promise<Partial<ContractExtractedInfo> | null> {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: CONTRACT_EXTRACT_PROMPT },
        { role: "user", content: text.slice(0, MAX_INPUT_CHARS) },
      ],
      reasoning_effort: REASONING_ANALYTICAL,
      // propertyDetails(부동산 표시 표) 추가로 출력이 커졌다. medium reasoning 토큰이
      // 예산을 함께 소모하므로 2000이면 잘려 JSON 파싱 실패→정규식 폴백이 간헐 발생.
      // 여유 확보해 안정적으로 완결된 JSON을 받는다.
      max_completion_tokens: 4000,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return null;
    return coerceExtractedAI(JSON.parse(content));
  } catch (error) {
    console.warn("[계약 AI추출] 실패, 정규식 폴백:", error);
    return null;
  }
}
