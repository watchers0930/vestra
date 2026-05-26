import { describe, it, expect } from "vitest";
import {
  holtSmoothing,
  robustZScore,
  cusumDetection,
  detectAnomalies,
} from "@/lib/anomaly-detector";

// ============================================================
// holtSmoothing
// ============================================================

describe("holtSmoothing", () => {
  it("기본 평활: 길이가 보존되고 숫자 배열을 반환한다", () => {
    const result = holtSmoothing([10, 20, 30, 40, 50]);
    expect(result.smoothed).toHaveLength(5);
    result.smoothed.forEach((v) => {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  it("예측: forecasts(3)이 3개의 숫자를 반환한다", () => {
    const result = holtSmoothing([10, 20, 30, 40, 50]);
    const forecasts = result.forecasts(3);
    expect(forecasts).toHaveLength(3);
    forecasts.forEach((v) => {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  it("단일값: smoothed = [100], forecasts는 100으로 채워진 배열을 반환한다", () => {
    const result = holtSmoothing([100]);
    expect(result.smoothed).toEqual([100]);
    const forecasts = result.forecasts(4);
    expect(forecasts).toHaveLength(4);
    forecasts.forEach((v) => {
      expect(v).toBe(100);
    });
  });
});

// ============================================================
// robustZScore
// ============================================================

describe("robustZScore", () => {
  it("정상 분포에서 극단적 이상치의 z-score 절댓값이 3 초과이다", () => {
    const result = robustZScore([10, 11, 10, 12, 10, 11, 10, 100]);
    const outlierScore = result.scores[7]; // 100에 해당하는 score
    expect(Math.abs(outlierScore)).toBeGreaterThan(3);
    // median은 10~11 근처
    expect(result.median).toBeGreaterThanOrEqual(10);
    expect(result.median).toBeLessThanOrEqual(11);
  });

  it("빈 배열: scores=[], median=0, mad=0을 반환한다", () => {
    const result = robustZScore([]);
    expect(result).toEqual({ scores: [], median: 0, mad: 0 });
  });

  it("동일값: 모든 score가 0이고 mad가 0이다", () => {
    const result = robustZScore([5, 5, 5, 5]);
    expect(result.mad).toBe(0);
    result.scores.forEach((s) => {
      expect(s).toBe(0);
    });
  });
});

// ============================================================
// cusumDetection
// ============================================================

describe("cusumDetection", () => {
  it("레벨 시프트가 있는 시리즈에서 변화점을 1개 이상 탐지하며 increase 방향을 포함한다", () => {
    const series = [...Array(20).fill(100), ...Array(20).fill(200)];
    const changePoints = cusumDetection(series);
    expect(changePoints.length).toBeGreaterThanOrEqual(1);
    const hasIncrease = changePoints.some((cp) => cp.direction === "increase");
    expect(hasIncrease).toBe(true);
  });

  it("짧은 시리즈(5 미만): 빈 배열을 반환한다", () => {
    const result = cusumDetection([1, 2, 3]);
    expect(result).toEqual([]);
  });
});

// ============================================================
// detectAnomalies
// ============================================================

describe("detectAnomalies", () => {
  it("정상 데이터: 이상치가 없거나 매우 적고 평균이 100 근처이다", () => {
    const normal = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i * 86400000,
      value: 100 + Math.sin(i) * 5,
    }));
    const report = detectAnomalies(normal);

    expect(report.anomalies.length).toBeLessThanOrEqual(2);
    expect(report.statistics.mean).toBeGreaterThan(95);
    expect(report.statistics.mean).toBeLessThan(105);
    expect(report.smoothedSeries).toHaveLength(30);
    expect(report.upperBand).toHaveLength(30);
    expect(report.lowerBand).toHaveLength(30);
  });

  it("이상치 포함: spike 값 500을 삽입하면 anomalies가 1개 이상이다", () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i * 86400000,
      value: 100 + Math.sin(i) * 5,
    }));
    data[15] = { timestamp: 15 * 86400000, value: 500 };

    const report = detectAnomalies(data);
    expect(report.anomalies.length).toBeGreaterThanOrEqual(1);
  });

  it("짧은 데이터(2개): 유효한 리포트를 반환하며 anomalies가 비어있다", () => {
    const short = [
      { timestamp: 0, value: 100 },
      { timestamp: 86400000, value: 110 },
    ];
    const report = detectAnomalies(short);

    expect(report.anomalies).toEqual([]);
    expect(report.changePoints).toEqual([]);
    expect(report.seasonal).toBeNull();
    expect(report.statistics).toBeDefined();
    expect(report.smoothedSeries).toHaveLength(2);
    expect(report.upperBand).toHaveLength(2);
    expect(report.lowerBand).toHaveLength(2);
  });
});
