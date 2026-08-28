/**
 * 집키퍼 변호사 평점(LawyerRating) 공용 로직 — 순수 함수(클라이언트·서버 공용).
 * 5항목 별점(전문성·응답속도·소통·결과만족·비용만족) 1~5점.
 */

export const RATING_ITEMS = [
  { key: "scoreExpertise", label: "전문성" },
  { key: "scoreResponse", label: "응답 속도" },
  { key: "scoreCommunication", label: "소통·친절" },
  { key: "scoreResult", label: "결과 만족" },
  { key: "scoreValue", label: "비용 만족" },
] as const;

export type RatingKey = (typeof RATING_ITEMS)[number]["key"];

export type RatingScores = Record<RatingKey, number>;

/** 5항목 점수 검증 — 각 항목이 1~5 정수인지 확인. 유효하면 정규화된 점수 반환. */
export function parseScores(input: unknown): { ok: true; scores: RatingScores } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "평점 값이 없습니다." };
  }
  const src = input as Record<string, unknown>;
  const scores = {} as RatingScores;
  for (const { key, label } of RATING_ITEMS) {
    const v = src[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
      return { ok: false, error: `${label} 점수는 1~5 사이여야 합니다.` };
    }
    scores[key] = v;
  }
  return { ok: true, scores };
}

/** 5항목 평균(소수 2자리 반올림). */
export function avgScore(scores: RatingScores): number {
  const sum = RATING_ITEMS.reduce((acc, { key }) => acc + scores[key], 0);
  return Math.round((sum / RATING_ITEMS.length) * 100) / 100;
}

/** 코멘트 정규화 — 앞뒤 공백 제거 + 길이 제한(1000자). */
export function normalizeComment(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 1000);
}
