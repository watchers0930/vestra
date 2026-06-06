/**
 * 시계열 이상 패턴 탐지
 *
 * 등기부등본의 시간 흐름에서 비정상적인 패턴 8종을 탐지합니다.
 * 1. 급속 소유권이전
 * 2. 압류 전 근저당 설정
 * 3. 채권 가속
 * 4. 근저당 누적
 * 5. 의심스러운 근저당 말소
 * 6. 근저당 말소 직후 매매
 * 7. 복수 근저당 동시 말소
 * 8. 고액 근저당 말소 (소유자 미변경)
 *
 * @module lib/risk/temporal-detector
 */

import type { ParsedRegistry } from "../registry-parser";
import type { TemporalPattern, TemporalRiskResult } from "../patent-types";

// ─── 날짜 유틸 ───

export function dateToMonths(dateStr: string): number {
  const parts = dateStr.split(".");
  if (parts.length < 3) return 0;
  return parseInt(parts[0], 10) * 12 + parseInt(parts[1], 10);
}

export function monthsBetween(d1: string, d2: string): number {
  return Math.abs(dateToMonths(d1) - dateToMonths(d2));
}

// ─── 메인 탐지 함수 ───

export function detectTemporalPatterns(parsed: ParsedRegistry): TemporalRiskResult {
  const patterns: TemporalPattern[] = [];

  // 1. 급속 소유권이전: 5년(60개월) 내 3회 이상 이전
  const ownershipTransfers = parsed.gapgu
    .filter((e) => e.purpose === "소유권이전" && !e.isCancelled && e.date)
    .sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));

  if (ownershipTransfers.length >= 3) {
    for (let i = 0; i <= ownershipTransfers.length - 3; i++) {
      const span = monthsBetween(ownershipTransfers[i].date, ownershipTransfers[i + 2].date);
      if (span <= 60) {
        const transfersInWindow = ownershipTransfers.filter((t) => {
          const m = dateToMonths(t.date);
          return m >= dateToMonths(ownershipTransfers[i].date) &&
                 m <= dateToMonths(ownershipTransfers[i].date) + 60;
        });
        patterns.push({
          id: `rapid_transfer_${i}`,
          patternType: "rapid_transfer",
          severity: transfersInWindow.length >= 4 ? "critical" : "high",
          confidence: Math.min(1, transfersInWindow.length / 5),
          description: `${span}개월 내 소유권이 ${transfersInWindow.length}회 이전되었습니다. 투기성 거래 또는 하자 물건 의심.`,
          evidence: transfersInWindow.map((t) => ({ date: t.date, event: `소유권이전 → ${t.holder}` })),
          timespan: {
            startDate: ownershipTransfers[i].date,
            endDate: transfersInWindow[transfersInWindow.length - 1].date,
            durationMonths: span,
          },
        });
        break; // 첫 번째 패턴만 감지
      }
    }
  }

  // 2. 압류 전 근저당 설정: 압류 6개월 이내에 근저당 추가
  const seizures = parsed.gapgu
    .filter((e) => (e.purpose === "압류" || e.purpose === "가압류") && !e.isCancelled && e.date);
  const mortgages = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && !e.isCancelled && e.date);

  for (const seizure of seizures) {
    const preMortgages = mortgages.filter((m) => {
      const gap = monthsBetween(m.date, seizure.date);
      return gap <= 6 && dateToMonths(m.date) <= dateToMonths(seizure.date);
    });

    if (preMortgages.length > 0) {
      patterns.push({
        id: `pre_seizure_mortgage_${seizure.date}`,
        patternType: "pre_seizure_mortgage",
        severity: "critical",
        confidence: 0.9,
        description: `압류(${seizure.date}) 6개월 이내에 근저당 ${preMortgages.length}건이 설정되었습니다. 재산은닉 또는 채무가중 패턴.`,
        evidence: [
          ...preMortgages.map((m) => ({ date: m.date, event: `근저당 설정 (${m.holder})` })),
          { date: seizure.date, event: `${seizure.purpose} (${seizure.holder})` },
        ],
        timespan: {
          startDate: preMortgages[0].date,
          endDate: seizure.date,
          durationMonths: monthsBetween(preMortgages[0].date, seizure.date),
        },
      });
    }
  }

  // 3. 채권 가속: 12개월 내 2건 이상 압류/가압류
  if (seizures.length >= 2) {
    const sortedSeizures = [...seizures].sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));
    for (let i = 0; i < sortedSeizures.length - 1; i++) {
      const span = monthsBetween(sortedSeizures[i].date, sortedSeizures[i + 1].date);
      if (span <= 12) {
        const clusterCount = sortedSeizures.filter((s) => {
          const m = dateToMonths(s.date);
          return m >= dateToMonths(sortedSeizures[i].date) &&
                 m <= dateToMonths(sortedSeizures[i].date) + 12;
        }).length;

        patterns.push({
          id: `claim_acceleration_${i}`,
          patternType: "claim_acceleration",
          severity: clusterCount >= 3 ? "critical" : "high",
          confidence: Math.min(1, clusterCount / 3),
          description: `12개월 내 ${clusterCount}건의 압류/가압류가 집중 발생. 채무자의 재정위기 상태.`,
          evidence: sortedSeizures.slice(i, i + clusterCount).map((s) => ({
            date: s.date,
            event: `${s.purpose} (${s.holder})`,
          })),
          timespan: {
            startDate: sortedSeizures[i].date,
            endDate: sortedSeizures[Math.min(i + clusterCount - 1, sortedSeizures.length - 1)].date,
            durationMonths: span,
          },
        });
        break;
      }
    }
  }

  // 4. 근저당 누적: 3개월 이내 연속 근저당 설정
  if (mortgages.length >= 2) {
    const sortedMortgages = [...mortgages].sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));
    for (let i = 0; i < sortedMortgages.length - 1; i++) {
      const gap = monthsBetween(sortedMortgages[i].date, sortedMortgages[i + 1].date);
      if (gap <= 3) {
        const cluster = sortedMortgages.filter((m) => {
          const mMonth = dateToMonths(m.date);
          return mMonth >= dateToMonths(sortedMortgages[i].date) &&
                 mMonth <= dateToMonths(sortedMortgages[i].date) + 3;
        });

        if (cluster.length >= 2) {
          patterns.push({
            id: `mortgage_stacking_${i}`,
            patternType: "mortgage_stacking",
            severity: "high",
            confidence: 0.8,
            description: `3개월 이내 근저당 ${cluster.length}건이 연속 설정. 과잉 레버리지 패턴.`,
            evidence: cluster.map((m) => ({
              date: m.date,
              event: `근저당 설정 (${m.holder}, ${(m.amount / 100_000_000).toFixed(1)}억원)`,
            })),
            timespan: {
              startDate: cluster[0].date,
              endDate: cluster[cluster.length - 1].date,
              durationMonths: monthsBetween(cluster[0].date, cluster[cluster.length - 1].date),
            },
          });
          break;
        }
      }
    }
  }

  // 5. 의심스러운 근저당 말소: 설정 후 6개월 이내 말소 (위조 의심)
  const cancelledMortgages = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && e.isCancelled && e.date);

  const activeMortgagesAll = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && e.date);

  for (const cancelled of cancelledMortgages) {
    const original = activeMortgagesAll.find(
      (m) => m.order === cancelled.order && !m.isCancelled && m.date
    );
    const setupDate = original?.date || cancelled.date;
    const cancelDate = cancelled.date;

    if (setupDate && cancelDate) {
      const gap = monthsBetween(setupDate, cancelDate);
      if (gap <= 6 && gap > 0 && cancelled.amount > 0) {
        patterns.push({
          id: `suspicious_cancel_${cancelled.order}`,
          patternType: "suspicious_cancellation",
          severity: "high",
          confidence: gap <= 3 ? 0.9 : 0.7,
          description: `근저당(${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)이 설정 후 ${gap}개월 만에 말소되었습니다. 수억원 대출을 단기간에 상환하는 것은 통계적으로 드물며, 말소 서류 위조 가능성을 배제할 수 없습니다. 해당 금융기관에 직접 연락하여 정상 상환 여부를 확인하세요.`,
          evidence: [
            { date: setupDate, event: `근저당 설정 (${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)` },
            { date: cancelDate, event: `근저당 말소 (${gap}개월 만에 해제)` },
          ],
          timespan: {
            startDate: setupDate,
            endDate: cancelDate,
            durationMonths: gap,
          },
        });
      }
    }
  }

  // 6. 근저당 말소 직후 매매 (1개월 이내): "깨끗한 등기" 조작 의심
  for (const cancelled of cancelledMortgages) {
    const cancelDate = cancelled.date;
    if (!cancelDate) continue;

    const salesAfterCancel = ownershipTransfers.filter((t) => {
      const gap = monthsBetween(cancelDate, t.date);
      return gap <= 1 && dateToMonths(t.date) >= dateToMonths(cancelDate);
    });

    if (salesAfterCancel.length > 0) {
      patterns.push({
        id: `cancel_before_sale_${cancelled.order}`,
        patternType: "cancel_before_sale",
        severity: "high",
        confidence: 0.8,
        description: `근저당 말소(${cancelDate}) 직후 1개월 이내에 소유권이 이전되었습니다. 매매를 위해 등기부를 '깨끗하게' 만든 정황이므로, 해당 금융기관에 정상 상환 여부를 반드시 확인하세요.`,
        evidence: [
          { date: cancelDate, event: `근저당 말소 (${cancelled.holder})` },
          ...salesAfterCancel.map((s) => ({ date: s.date, event: `소유권이전 → ${s.holder}` })),
        ],
        timespan: {
          startDate: cancelDate,
          endDate: salesAfterCancel[0].date,
          durationMonths: monthsBetween(cancelDate, salesAfterCancel[0].date),
        },
      });
      break;
    }
  }

  // 7. 같은 날 복수 근저당 동시 말소: 여러 은행 대출 동시 상환은 비정상
  const cancelDates = cancelledMortgages
    .filter((e) => e.date && e.amount > 0)
    .map((e) => e.date);
  const cancelDateCounts: Record<string, number> = {};
  for (const d of cancelDates) {
    cancelDateCounts[d] = (cancelDateCounts[d] || 0) + 1;
  }
  for (const [date, count] of Object.entries(cancelDateCounts)) {
    if (count >= 2) {
      const simultaneous = cancelledMortgages.filter((e) => e.date === date);
      const totalAmount = simultaneous.reduce((s, e) => s + e.amount, 0);
      patterns.push({
        id: `simultaneous_cancel_${date}`,
        patternType: "simultaneous_cancellation",
        severity: "high",
        confidence: 0.75,
        description: `같은 날(${date}) ${count}건의 근저당(합계 ${(totalAmount / 100_000_000).toFixed(1)}억원)이 동시에 말소되었습니다. 복수 금융기관 대출을 동시에 상환하는 것은 이례적이며, 말소 서류 일괄 위조 가능성이 있습니다.`,
        evidence: simultaneous.map((e) => ({
          date: e.date,
          event: `근저당 말소 (${e.holder}, ${(e.amount / 100_000_000).toFixed(1)}억원)`,
        })),
        timespan: { startDate: date, endDate: date, durationMonths: 0 },
      });
    }
  }

  // 8. 고액 근저당 말소인데 소유자 변경 없음: 자금 출처 의문
  const highValueCancelled = cancelledMortgages.filter((e) => e.amount >= 200_000_000); // 2억 이상
  for (const cancelled of highValueCancelled) {
    if (!cancelled.date) continue;
    const nearbyTransfers = ownershipTransfers.filter((t) => {
      const gap = monthsBetween(cancelled.date, t.date);
      return gap <= 6;
    });
    if (nearbyTransfers.length === 0) {
      patterns.push({
        id: `cancel_no_transfer_${cancelled.order}`,
        patternType: "cancel_without_transfer",
        severity: "medium",
        confidence: 0.6,
        description: `고액 근저당(${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)이 말소되었으나 전후 6개월 내 매매(소유권이전)가 없습니다. 매매 대금 없이 고액 대출을 상환한 자금 출처를 확인할 필요가 있습니다.`,
        evidence: [
          { date: cancelled.date, event: `근저당 말소 (${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)` },
        ],
        timespan: { startDate: cancelled.date, endDate: cancelled.date, durationMonths: 0 },
      });
    }
  }

  // 전체 시계열 위험도
  const severityWeight: Record<string, number> = { critical: 30, high: 15, medium: 5 };
  const overallTemporalRisk = Math.min(100,
    patterns.reduce((sum, p) => sum + (severityWeight[p.severity] || 0) * p.confidence, 0)
  );

  // 이상치 점수: 패턴 수 × 평균 신뢰도
  const avgConfidence = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    : 0;
  const timelineAnomalyScore = Math.min(100, patterns.length * avgConfidence * 25);

  return { patterns, overallTemporalRisk, timelineAnomalyScore };
}
