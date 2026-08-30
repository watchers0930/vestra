/**
 * 전세대출 심사조건 오버라이드 관리
 * ──────────────────────────────────
 * 하드코딩된 LOAN_PRODUCTS(loan-simulator)의 심사 수치조건
 * (LTV / DTI / 최대한도 / 소득상한 / 최소신용점수)을 관리자가 코드 수정 없이
 * 조정할 수 있도록 SystemSetting에 평문 JSON으로 저장/로드/머지한다.
 * 스키마 변경 없음 (가중치 live-weights.ts와 동일한 SystemSetting 재활용 패턴).
 * 오버라이드 미설정 시 기본값(LOAN_PRODUCTS) 그대로 사용.
 */

import { prisma } from "./prisma";
import type { BankLoanProduct } from "./loan-simulator";

const SETTING_KEY = "loan_underwriting_overrides";
const SETTING_CATEGORY = "loan";

// ─── 검증 상한 (sanity) ───
const MAX_AMOUNT_CEIL = 2_000_000_000; // 최대 한도 상한 20억원
const MAX_INCOME_CEIL = 1_000_000_000; // 소득 상한 상한 10억원
const MAX_CREDIT_SCORE = 1000;

/** 상품별 오버라이드 가능한 심사 수치조건 (부분 지정 가능) */
export interface UnderwritingOverride {
  maxLTV?: number;
  maxDTI?: number;
  maxAmount?: number;
  maxIncome?: number | null; // null = 소득 상한 없음
  minCreditScore?: number;
}

export type UnderwritingOverrideMap = Record<string, UnderwritingOverride>;

/** 상품 식별 키 (은행명::상품명) */
export function productKey(bankName: string, productName: string): string {
  return `${bankName}::${productName}`;
}

/**
 * 단일 오버라이드 값 정제·검증. 유효 범위를 통과한 필드만 반환.
 * 반환 객체가 비어 있으면 저장할 오버라이드가 없다는 의미.
 */
export function sanitizeOverride(raw: unknown): UnderwritingOverride {
  const out: UnderwritingOverride = {};
  if (typeof raw !== "object" || raw === null) return out;
  const o = raw as Record<string, unknown>;

  if (typeof o.maxLTV === "number" && o.maxLTV > 0 && o.maxLTV <= 1) {
    out.maxLTV = Math.round(o.maxLTV * 1000) / 1000;
  }
  if (typeof o.maxDTI === "number" && o.maxDTI > 0 && o.maxDTI <= 1) {
    out.maxDTI = Math.round(o.maxDTI * 1000) / 1000;
  }
  if (typeof o.maxAmount === "number" && o.maxAmount > 0 && o.maxAmount <= MAX_AMOUNT_CEIL) {
    out.maxAmount = Math.round(o.maxAmount);
  }
  // 소득 상한: null(제한 없음) 허용, 숫자면 0 이상 상한 이하
  if (o.maxIncome === null) {
    out.maxIncome = null;
  } else if (typeof o.maxIncome === "number" && o.maxIncome >= 0 && o.maxIncome <= MAX_INCOME_CEIL) {
    out.maxIncome = Math.round(o.maxIncome);
  }
  if (
    typeof o.minCreditScore === "number" &&
    o.minCreditScore >= 0 &&
    o.minCreditScore <= MAX_CREDIT_SCORE
  ) {
    out.minCreditScore = Math.round(o.minCreditScore);
  }
  return out;
}

/** 전체 오버라이드 맵 정제 (빈 항목·비정상 키 제거) */
export function sanitizeOverrideMap(raw: unknown): UnderwritingOverrideMap {
  const out: UnderwritingOverrideMap = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length === 0 || key.length > 120) continue;
    const clean = sanitizeOverride(val);
    if (Object.keys(clean).length > 0) out[key] = clean;
  }
  return out;
}

/** DB에서 오버라이드 맵 로드 (실패 시 빈 맵) */
export async function getUnderwritingOverrides(): Promise<UnderwritingOverrideMap> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    if (!row?.value) return {};
    return sanitizeOverrideMap(JSON.parse(row.value));
  } catch {
    return {};
  }
}

/** 오버라이드 맵 저장 (정제 후 upsert). 저장된 정제 맵 반환. */
export async function setUnderwritingOverrides(raw: unknown): Promise<UnderwritingOverrideMap> {
  const clean = sanitizeOverrideMap(raw);
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean), category: SETTING_CATEGORY },
    create: { key: SETTING_KEY, value: JSON.stringify(clean), category: SETTING_CATEGORY },
  });
  return clean;
}

/**
 * 상품 배열에 오버라이드를 머지한 새 배열 반환.
 * 오버라이드가 지정한 필드만 덮어쓰고 나머지는 기본값 유지.
 */
export function mergeOverrides(
  products: BankLoanProduct[],
  overrides: UnderwritingOverrideMap,
): BankLoanProduct[] {
  if (Object.keys(overrides).length === 0) return products;
  return products.map((p) => {
    const ov = overrides[productKey(p.bankName, p.productName)];
    if (!ov) return p;
    return {
      ...p,
      ...(ov.maxLTV !== undefined ? { maxLTV: ov.maxLTV } : {}),
      ...(ov.maxDTI !== undefined ? { maxDTI: ov.maxDTI } : {}),
      ...(ov.maxAmount !== undefined ? { maxAmount: ov.maxAmount } : {}),
      // maxIncome: null → 제한 없음(undefined), 숫자 → 그 값
      ...(ov.maxIncome !== undefined
        ? { maxIncome: ov.maxIncome === null ? undefined : ov.maxIncome }
        : {}),
      ...(ov.minCreditScore !== undefined ? { minCreditScore: ov.minCreditScore } : {}),
    };
  });
}

/** DB 오버라이드를 로드해 상품 배열에 적용 (simulateLoan에서 호출) */
export async function applyUnderwritingOverrides(
  products: BankLoanProduct[],
): Promise<BankLoanProduct[]> {
  const overrides = await getUnderwritingOverrides();
  return mergeOverrides(products, overrides);
}
