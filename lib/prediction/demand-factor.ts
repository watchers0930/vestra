/**
 * 인구·연령·정책 기반 장기 성장률 보정 계수
 * ────────────────────────────────────────────────
 * 기존 구매력 계수(purchasing-power.ts)와 동일한 방식으로, 최근 급등 추세를
 * 장기(5·10년)까지 무한 연장하는 비현실적 폭등을 억제한다.
 * 인구 감소·고령화·규제 강화는 장기 수요를 약화시키므로 성장률을 소폭 낮추고,
 * 세대수 증가·매입주력연령 확대·규제 완화는 소폭 높인다.
 *
 * 두 함수 모두 순수함수(데이터를 인자로 받아 계수만 반환).
 *
 * 데이터 출처:
 *  - 인구·세대수·연령대: 통계청 KOSIS 주민등록인구/연령별인구
 *    (lib/feasibility/api/kosis-api.ts — fetchPopulationTrends / fetchAgeGroupPopulation,
 *     실패 시 kosis-api.ts 내장 fallback 데이터)
 *  - 정책: lib/feasibility/static-data-policy.ts — POLICY_TIMELINE (정부 부동산 대책 연표)
 */

import type { PopulationTrend, AgeGroupPopulation } from "../feasibility/api/kosis-api";
import type { PolicyEvent } from "../feasibility/static-data-policy";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 연평균 복합성장률(CAGR): 시작값 → 끝값, 연수 기반 */
function cagr(start: number, end: number, years: number): number {
  if (start <= 0 || end <= 0 || years <= 0) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * 매입주력연령(30~54세) 인구가 전체에서 차지하는 비율 산출.
 *
 * KOSIS 응답은 연령대 라벨 포맷이 다양하므로("30~34세", "30~39세", "30-34" 등)
 * 라벨에서 시작 나이를 파싱해 30~54세 구간에 걸치는 그룹만 합산한다.
 * "계"/"합계" 같은 소계 행과 시작 나이를 못 읽는 행은 제외한다.
 */
function primeBuyerRatio(ageGroups: AgeGroupPopulation[]): number {
  let prime = 0;
  let total = 0;
  for (const g of ageGroups) {
    const label = g.ageGroup ?? "";
    if (!label || label.includes("계") || label.includes("합계")) continue;
    const total_g = g.total || g.male + g.female;
    if (total_g <= 0) continue;
    total += total_g;

    // 라벨에서 첫 숫자(구간 시작 나이) 추출
    const m = label.match(/\d+/);
    if (!m) continue;
    const startAge = parseInt(m[0], 10);
    // 30~54세 매입주력: 구간 시작이 30~50 사이면 주력으로 간주
    // (30~34, 35~39, 40~44, 45~49, 50~54 / fallback 포맷 30~39, 40~49, 50~59 일부 포함)
    if (startAge >= 30 && startAge <= 50) {
      prime += total_g;
    }
  }
  if (total <= 0) return 0;
  return prime / total;
}

/**
 * 인구수요 계수 (0.90 ~ 1.05)
 * ────────────────────────────
 * 세 가지 실측 신호를 조합해 장기 성장률에 곱할 보정 계수를 만든다.
 *  1) 인구 CAGR   — 최근 인구 증감. 감소면 음의 기여(수요 축소).
 *  2) 세대수 CAGR — 최근 세대수 증감. 증가면 양의 기여(가구 분화 → 실수요).
 *  3) 매입주력연령(30~54세) 비율 — 낮을수록(고령화) 하향.
 *
 * 각 신호는 ±수 %p 이내로 제한해 보수적으로 반영하고, 최종은 0.90~1.05로 clamp.
 *
 * @param popTrends 연도 오름차순 인구·세대수 추이 (fetchPopulationTrends().trends)
 * @param ageGroups 연령대별 인구 (fetchAgeGroupPopulation())
 */
export function demandFactor(
  popTrends: PopulationTrend[],
  ageGroups: AgeGroupPopulation[],
): number {
  let factor = 1;

  // ── 1) 인구 CAGR ──
  if (popTrends.length >= 2) {
    const sorted = [...popTrends].sort((a, b) => a.year - b.year);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const years = last.year - first.year;
    if (years > 0 && first.population > 0 && last.population > 0) {
      const popCagr = cagr(first.population, last.population, years);
      // 연 -1% → -0.02, 연 +1% → +0.02 기여 (계수 3배, ±2%p로 clamp)
      factor += clamp(popCagr * 3, -0.03, 0.02);
    }

    // ── 2) 세대수 CAGR ──
    if (years > 0 && first.households > 0 && last.households > 0) {
      const hhCagr = cagr(first.households, last.households, years);
      // 세대수 증가는 인구 감소를 일부 상쇄(1~2인 가구 분화 → 실수요 유지)
      factor += clamp(hhCagr * 2, -0.02, 0.02);
    }
  }

  // ── 3) 매입주력연령(30~54세) 비율 ──
  if (ageGroups.length > 0) {
    const ratio = primeBuyerRatio(ageGroups);
    // 기준선 0.35(35%): 이보다 낮으면 고령화 → 하향, 높으면 상향
    // (전국 30~54세 비율 대략 35% 안팎). 편차 1%p당 계수 0.5%p, ±2.5%p clamp
    const dev = ratio - 0.35;
    factor += clamp(dev * 0.5, -0.025, 0.025);
  }

  return clamp(factor, 0.9, 1.05);
}

/**
 * 정책 계수 (0.95 ~ 1.03)
 * ────────────────────────
 * 최근 24개월 이내 정부 부동산 대책에서 완화·강화 방향의 우세를 계량한다.
 *  - 규제완화 / 공급확대·긍정 → 상방 신호
 *  - 규제강화 / 부정          → 하방 신호
 * 순 신호(net)를 소폭 반영하고 0.95~1.03으로 clamp(보수적, 정책은 단기 변동성이 큼).
 *
 * @param timeline POLICY_TIMELINE (정부 부동산 대책 연표)
 * @param now 기준 시점(테스트 편의; 기본 현재)
 */
export function policyFactor(timeline: PolicyEvent[], now: Date = new Date()): number {
  if (!timeline || timeline.length === 0) return 1;

  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 24);

  let net = 0;
  let count = 0;
  for (const ev of timeline) {
    const d = new Date(ev.date);
    if (isNaN(d.getTime()) || d < cutoff || d > now) continue;
    count++;

    // 카테고리 기반 방향 (규제완화/공급확대 = 상방, 규제강화 = 하방)
    if (ev.category === "규제완화") net += 1;
    else if (ev.category === "공급확대") net += 0.5; // 공급확대는 수요 진작이나 가격 상방은 약함
    else if (ev.category === "규제강화") net -= 1;

    // 명시된 시장 영향 방향으로 소폭 가중
    if (ev.impact === "긍정") net += 0.3;
    else if (ev.impact === "부정") net -= 0.3;
    // 금융/세제/중립은 카테고리·impact 신호만 반영
  }

  if (count === 0) return 1;

  // 이벤트당 평균 순신호를 계수로 환산 (평균 +1 신호 → +1.5%p 상방)
  const avg = net / count;
  const factor = 1 + avg * 0.015;

  return clamp(factor, 0.95, 1.03);
}
