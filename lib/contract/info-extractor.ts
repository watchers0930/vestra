/**
 * VESTRA 계약서 분석 — 핵심정보 추출 & 병합
 * ──────────────────────────────────────────────────────────────
 * 정규식 baseline으로 주소·당사자·금액·기간·지급일정을 추출하고,
 * AI 추출 결과를 필드별로 병합한다. contract-analyzer에서 추출(동작 변경 없음).
 */

import type { ContractExtractedInfo, ContractPaymentItem } from "./types";

function normalizeDate(raw: string): string | undefined {
  const compact = raw
    .replace(/\s+/g, "")
    .replace(/[./]/g, "-")
    .replace(/년|월/g, "-")
    .replace(/일/g, "");
  const match = compact.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return undefined;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function monthDiff(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return undefined;
  const inclusiveEnd = new Date(e);
  inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
  const months = (inclusiveEnd.getFullYear() - s.getFullYear()) * 12 + (inclusiveEnd.getMonth() - s.getMonth());
  return months + (inclusiveEnd.getDate() >= s.getDate() ? 0 : -1);
}

function parseKoreanMoney(raw: string): number | undefined {
  const text = raw.replace(/[,\s]/g, "");
  if (!text) return undefined;
  const numericWon = text.match(/(\d+(?:\.\d+)?)원/);
  if (numericWon && !/[억만천]/.test(text)) {
    return Math.round(Number(numericWon[1]));
  }

  let total = 0;
  const eok = text.match(/(\d+(?:\.\d+)?)억/);
  const man = text.match(/(\d+(?:\.\d+)?)만/);
  const cheon = text.match(/(\d+(?:\.\d+)?)천(?=만|만원|원)?/);
  if (eok) total += Number(eok[1]) * 100_000_000;
  if (cheon && /천만/.test(text)) total += Number(cheon[1]) * 10_000_000;
  if (man && !/천만/.test(text)) total += Number(man[1]) * 10_000;
  return total > 0 ? Math.round(total) : undefined;
}

const MONEY_TEXT_PATTERN = String.raw`([0-9,.]+\s*억(?:\s*[0-9,.]+\s*천\s*만)?(?:\s*[0-9,.]+\s*만)?\s*원?|[0-9,.]+\s*천만\s*원?|[0-9,.]+\s*만\s*원?|[0-9,.]+\s*원)`;

function extractFirstMoneyAfter(labelPattern: RegExp, text: string): number | undefined {
  const match = text.match(labelPattern);
  if (!match) return undefined;
  return parseKoreanMoney(match[1] || match[0]);
}

function extractLabeledLineValue(text: string, labels: string[]): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const label = labels.find((item) => line.includes(item));
    if (!label) continue;

    const afterLabel = line
      .slice(line.indexOf(label) + label.length)
      .replace(/^[\s:：)\]】.-]+/, "")
      .trim();
    if (afterLabel.length >= 4 && !/^제\s*\d+\s*조/.test(afterLabel)) {
      return afterLabel;
    }

    const nextLine = lines[index + 1];
    if (nextLine && !/^제\s*\d+\s*조/.test(nextLine)) {
      return nextLine.replace(/^[\s:：)\]】.-]+/, "").trim();
    }
  }

  return undefined;
}

/** 정규식 baseline이 이름 자리에서 잡는 라벨·일반어·조사어 (오값 노출 방지) */
const PARTY_NAME_STOPWORDS = new Set([
  "성명", "이름", "성함", "임대", "임차", "매도", "매수", "쌍방", "당사자", "본인",
  "대리인", "소유자", "귀하", "주소", "동의", "전화", "연락처", "번호", "대표", "법인",
  "회사", "생년", "월일", "서명", "날인", "기명", "확인", "목적물", "부동산", "기타",
]);

/**
 * 정규식으로 캡처한 당사자 이름 후보를 정제한다.
 * 끝에 붙은 조사 제거 후, 라벨·일반어(stopword)면 undefined(→ 미확인).
 * "임대인 동의 없이"→"동의"(배제), "임차인 쌍방은"→"쌍방"(배제),
 * "임대인 김철수와"→"김철수", "임차인 이영희는"→"이영희".
 */
export function cleanPartyName(raw?: string): string | undefined {
  if (!raw) return undefined;
  let s = raw.replace(/\s+/g, "");
  if (PARTY_NAME_STOPWORDS.has(s)) return undefined;
  s = s.replace(/(으로서|으로|로서|에게|께서|과|와|은|는|이|가|을|를|의|도|만|에|께|로)$/, "");
  if (s.length < 2 || s.length > 5) return undefined;
  if (PARTY_NAME_STOPWORDS.has(s)) return undefined;
  if (/^(임대인|임차인|매도인|매수인)/.test(s)) return undefined;
  return s;
}

export function extractContractInfo(text: string): ContractExtractedInfo {
  const address =
    extractLabeledLineValue(text, ["소재지", "주소", "목적물의 표시", "목적물"]) ||
    text.match(/([가-힣]+(?:특별시|광역시|특별자치시|도)\s+[^\n,]+(?:동|리|로|길)[^\n]*)/)?.[1]?.trim();

  // "임대인 성명: 홍길동", "임대인(갑): 홍길동", "임대인 홍길동" 등에서 이름만.
  // 그리디 캡처 후 cleanPartyName이 조사 제거·불용어 배제로 오값을 걸러낸다.
  const landlordName = cleanPartyName(
    text.match(/(?:임대인|매도인)\s*(?:\([^)]{0,12}\))?\s*(?:성\s*명)?\s*[:：]?\s*([가-힣]{2,5})/)?.[1],
  );
  const tenantName = cleanPartyName(
    text.match(/(?:임차인|매수인)\s*(?:\([^)]{0,12}\))?\s*(?:성\s*명)?\s*[:：]?\s*([가-힣]{2,5})/)?.[1],
  );

  const depositAmount = extractFirstMoneyAfter(
    new RegExp(String.raw`보증금(?:은|:|：)?\s*(?:금)?\s*${MONEY_TEXT_PATTERN}`),
    text,
  );
  const monthlyRentAmount = extractFirstMoneyAfter(
    new RegExp(String.raw`(?:월세|차임|월\s*차임)(?:은|:|：)?\s*(?:금)?\s*${MONEY_TEXT_PATTERN}`),
    text,
  );

  const periodMatch = text.match(
    /(\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?)\s*(?:부터|~|-|부터\s*)\s*(\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?)(?:까지)?/,
  );
  const contractStartDate = periodMatch ? normalizeDate(periodMatch[1]) : undefined;
  const contractEndDate = periodMatch ? normalizeDate(periodMatch[2]) : undefined;
  const explicitYearDuration = text.match(/(?:계약기간|임대차\s*기간)[\s\S]{0,40}(\d+)\s*년/)?.[1];
  const explicitMonthDuration = text.match(/(?:계약기간|임대차\s*기간)[\s\S]{0,40}(\d+)\s*개월/)?.[1];
  const durationMonths =
    monthDiff(contractStartDate, contractEndDate) ||
    (explicitYearDuration ? Number(explicitYearDuration) * 12 : undefined) ||
    (explicitMonthDuration ? Number(explicitMonthDuration) : undefined);

  const paymentSchedule: ContractPaymentItem[] = [];
  const paymentPattern = new RegExp(
    String.raw`(계약금|중도금|잔금)[^\n,。]*?(?:금)?\s*${MONEY_TEXT_PATTERN}[^\n,。]*`,
    "g",
  );
  let paymentMatch;
  while ((paymentMatch = paymentPattern.exec(text)) !== null) {
    const date = paymentMatch[0].match(/\d{4}\s*[년./-]\s*\d{1,2}\s*[월./-]\s*\d{1,2}\s*일?/);
    paymentSchedule.push({
      label: paymentMatch[1] as ContractPaymentItem["label"],
      amount: parseKoreanMoney(paymentMatch[2]),
      dueDate: date ? normalizeDate(date[0]) : undefined,
      rawText: paymentMatch[0],
    });
  }

  return {
    propertyAddress: address,
    landlordName,
    tenantName,
    depositAmount,
    monthlyRentAmount,
    contractStartDate,
    contractEndDate,
    durationMonths,
    paymentSchedule,
  };
}

/** AI 추출 결과(override)를 정규식 baseline 위에 필드별로 덮어쓴다. null/undefined는 폴백. */
export function mergeExtractedInfo(
  base: ContractExtractedInfo,
  override?: Partial<ContractExtractedInfo> | null,
): ContractExtractedInfo {
  if (!override) return base;
  const pick = <T>(o: T | undefined | null, b: T | undefined): T | undefined =>
    o !== undefined && o !== null ? o : b;

  const merged: ContractExtractedInfo = {
    propertyAddress: pick(override.propertyAddress, base.propertyAddress),
    propertyDetails:
      override.propertyDetails && override.propertyDetails.length > 0
        ? override.propertyDetails
        : base.propertyDetails,
    landlordName: pick(override.landlordName, base.landlordName),
    tenantName: pick(override.tenantName, base.tenantName),
    depositAmount: pick(override.depositAmount, base.depositAmount),
    monthlyRentAmount: pick(override.monthlyRentAmount, base.monthlyRentAmount),
    contractStartDate: pick(override.contractStartDate, base.contractStartDate),
    contractEndDate: pick(override.contractEndDate, base.contractEndDate),
    durationMonths: pick(override.durationMonths, base.durationMonths),
    paymentSchedule:
      override.paymentSchedule && override.paymentSchedule.length > 0
        ? override.paymentSchedule
        : base.paymentSchedule,
  };
  if (merged.durationMonths === undefined) {
    merged.durationMonths = monthDiff(merged.contractStartDate, merged.contractEndDate);
  }
  return merged;
}
