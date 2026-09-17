import { prisma } from "@/lib/prisma";
import { DEFAULT_GUARANTEE_RULES, type GuaranteeRules } from "./guarantee-insurance";

/**
 * 보증보험 활성 규칙 로더 (서버 전용)
 * ──────────────────────────────────────────
 * GuaranteeRule 테이블의 isActive=true 규칙을 읽어 계산이 쓰는 GuaranteeRules로 조합한다.
 * 어드민이 "보증보험 규칙 탭"에서 값을 바꾸면 계산에 반영되도록 하는 연결 고리.
 *
 * - DB에 특정 기관 규칙이 없거나 조회 실패 시 해당 기관은 DEFAULT_GUARANTEE_RULES로 폴백
 *   (규칙이 없다고 계산 자체가 막히면 안 됨 — 항상 유효한 규칙을 반환).
 * - 규칙은 거의 바뀌지 않으므로 60초 메모리 캐시로 DB 반복 조회를 줄인다.
 *   (서버리스 인스턴스별 캐시 — 최대 60초 내 반영. 즉시 반영이 필요하면 TTL을 낮출 것.)
 */

const CACHE_TTL_MS = 60_000;
let cache: { rules: GuaranteeRules; at: number } | null = null;

export function invalidateGuaranteeRulesCache(): void {
  cache = null;
}

export async function loadActiveGuaranteeRules(): Promise<GuaranteeRules> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rules;

  try {
    const rows = await prisma.guaranteeRule.findMany({ where: { isActive: true } });

    // 기본값을 베이스로 깔고, DB에 있는 기관만 얕은 병합으로 덮어쓴다.
    const merged: GuaranteeRules = {
      HUG: { ...DEFAULT_GUARANTEE_RULES.HUG },
      HF: { ...DEFAULT_GUARANTEE_RULES.HF },
      SGI: { ...DEFAULT_GUARANTEE_RULES.SGI },
    };

    for (const row of rows) {
      if (!row.rules || typeof row.rules !== "object" || Array.isArray(row.rules)) continue;
      // provider별로 개별 병합 (union 인덱스가 intersection으로 추론되는 것 방지). 기본값 위에 DB 값 덮어씀.
      if (row.provider === "HUG") {
        merged.HUG = { ...merged.HUG, ...(row.rules as Partial<typeof merged.HUG>) };
      } else if (row.provider === "HF") {
        merged.HF = { ...merged.HF, ...(row.rules as Partial<typeof merged.HF>) };
      } else if (row.provider === "SGI") {
        merged.SGI = { ...merged.SGI, ...(row.rules as Partial<typeof merged.SGI>) };
      }
    }

    cache = { rules: merged, at: Date.now() };
    return merged;
  } catch {
    // DB 조회 실패 시에도 계산은 진행 — 기본값 반환(캐시하지 않음)
    return DEFAULT_GUARANTEE_RULES;
  }
}
