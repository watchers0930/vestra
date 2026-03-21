/**
 * 라이브 가중치 로더
 * ──────────────────
 * SystemSetting 테이블에서 적응형 가중치를 로드.
 * 캐시 없음 (매 요청마다 최신 가중치 반영).
 * 실패 시 undefined 반환 → 호출자가 기본값 사용.
 */

import { prisma } from "./prisma";

/**
 * SystemSetting에서 `weights_{analysisType}` 키로 저장된 가중치를 로드.
 * @returns 가중치 객체 또는 undefined (미설정/오류 시)
 */
export async function loadLiveWeights(
  analysisType: string
): Promise<Record<string, number> | undefined> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: `weights_${analysisType}` },
    });

    if (!setting?.value) return undefined;

    const parsed = JSON.parse(setting.value);

    // 유효성 검증: 객체이고 모든 값이 숫자인지 확인
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }

    const weights = parsed as Record<string, number>;
    for (const value of Object.values(weights)) {
      if (typeof value !== "number" || isNaN(value)) {
        return undefined;
      }
    }

    return weights;
  } catch {
    // DB 조회 또는 파싱 실패 시 기본값 사용
    return undefined;
  }
}
