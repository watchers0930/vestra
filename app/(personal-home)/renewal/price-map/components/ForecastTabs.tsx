"use client";

import s from "../price-map-renewal.module.css";
import type { usePredictionData } from "@/app/(app)/prediction/hooks/usePredictionData";

// 원 단위 금액 → "N.N억" (predict-value/실거래 dealAmount는 원 단위)
const toEok = (won: number) => `${(won / 100000000).toFixed(1)}억`;

type FpTab = "dashboard" | "chart" | "compare" | "backtest" | "anomaly";
type Prediction = ReturnType<typeof usePredictionData>;

interface Props {
  fpTab: FpTab;
  prediction: Prediction;
}

/** 실데이터 기반 시세전망 탭 본문 */
export default function ForecastTabs({ fpTab, prediction }: Props) {
  const { result } = prediction;

  if (!result) {
    return (
      <div className={s.fpBody}>
        <p className={s.fpSec}>시세전망 데이터를 불러오는 중입니다.</p>
      </div>
    );
  }

  return (
    <div className={s.fpBody}>
      {fpTab === "dashboard" && <DashboardTab prediction={prediction} />}
      {fpTab === "chart" && <ChartTab prediction={prediction} />}
      {fpTab === "compare" && <CompareTab prediction={prediction} />}
      {fpTab === "backtest" && <BacktestTab prediction={prediction} />}
      {fpTab === "anomaly" && <AnomalyTab prediction={prediction} />}
    </div>
  );
}

function pct(from: number, to: number): string {
  if (!from) return "0.0%";
  const v = ((to - from) / from) * 100;
  return `${v >= 0 ? "▲ +" : "▼ "}${v.toFixed(1)}%`;
}

function DashboardTab({ prediction }: { prediction: Prediction }) {
  const { result } = prediction;
  if (!result) return null;
  const cur = result.currentPrice;
  const base = result.predictions.base;

  const kpis = [
    { label: "1년 전망", val: toEok(base["1y"]), chg: pct(cur, base["1y"]), conf: result.confidence, up: base["1y"] >= cur },
    { label: "5년 전망", val: toEok(base["5y"]), chg: pct(cur, base["5y"]), conf: Math.max(30, result.confidence - 15), up: base["5y"] >= cur },
    { label: "10년 전망", val: toEok(base["10y"]), chg: pct(cur, base["10y"]), conf: Math.max(20, result.confidence - 30), up: base["10y"] >= cur },
    { label: "신뢰도", val: `${result.confidence}%`, chg: result.confidence >= 70 ? "High Confidence" : "Moderate", conf: result.confidence, neutral: true },
  ];

  return (
    <>
      <p className={s.fpSec}>AI 시세전망</p>
      <div className={s.fpKpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} className={s.fpKpiCard}>
            <div className={s.fpKpiLabel}>{k.label}</div>
            <div className={s.fpKpiVal}>{k.val}</div>
            <div className={`${s.fpKpiChg} ${k.neutral ? s.fpKpiN : k.up ? s.fpKpiUp : s.fpKpiDn}`}>{k.chg}</div>
            <div className={s.fpConfBar}><div className={s.fpConfFill} style={{ width: `${k.conf}%` }} /></div>
          </div>
        ))}
      </div>
      <div className={s.fpSectionDivider} />
      {result.aiOpinionSections ? (
        <>
          {result.aiOpinionSections.summary && (
            <div className={s.fpAiSummary}>
              <div className={s.fpAiSummaryLabel}>핵심 요약</div>
              <div className={s.fpAiSummaryText}>{result.aiOpinionSections.summary}</div>
            </div>
          )}
          <div className={s.fpAiBox}>
            <div className={s.fpAiLabel}>AI 종합 의견</div>
            {([
              { t: "서론", v: result.aiOpinionSections.intro },
              { t: "본론", v: result.aiOpinionSections.body },
              { t: "결론", v: result.aiOpinionSections.conclusion },
            ] as const).filter((x) => x.v).map((x) => (
              <div key={x.t} className={s.fpAiPara}>
                <span className={s.fpAiParaTag}>{x.t}</span>
                <p className={s.fpAiParaText}>{x.v}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={s.fpAiBox}>
          <div className={s.fpAiLabel}>AI 종합 의견</div>
          <div className={s.fpAiText}>{result.aiOpinion}</div>
        </div>
      )}
      {result.variables?.length > 0 && (
        <>
          <p className={s.fpSec}>주요 영향 변수</p>
          <div className={s.fpVarWrap}>
            {result.variables.map((v) => (
              <span key={v} className={s.fpVarTag}>{v}</span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ChartTab({ prediction }: { prediction: Prediction }) {
  const { result, getMonthlyTrendData } = prediction;
  if (!result) return null;
  const trend = getMonthlyTrendData();

  // 추이 폴리라인 좌표 계산 (실거래 월별 평균)
  const prices = trend.map((t) => t.avgPrice);
  const min = Math.min(...prices, result.currentPrice);
  const max = Math.max(...prices, result.currentPrice);
  const range = max - min || 1;
  const W = 460;
  const H = 100;
  const points = trend.length
    ? trend.map((t, i) => {
        const x = trend.length === 1 ? W : (i / (trend.length - 1)) * W;
        const y = H - ((t.avgPrice - min) / range) * (H - 10) - 5;
        return `${x.toFixed(0)},${y.toFixed(0)}`;
      })
    : [];
  const line = points.join(" ");
  const area = points.length ? `0,${H} ${line} ${W},${H}` : "";

  // 시나리오 바 (낙관/기준/비관 1년 후 상대 높이)
  const bars = (["1y", "5y", "10y"] as const).map((k) => {
    const opt = result.predictions.optimistic[k];
    const b = result.predictions.base[k];
    const pess = result.predictions.pessimistic[k];
    const maxV = Math.max(opt, b, pess) || 1;
    return {
      label: k === "1y" ? "1Y" : k === "5y" ? "5Y" : "10Y",
      opt: Math.round((opt / maxV) * 90),
      base: Math.round((b / maxV) * 90),
      pess: Math.round((pess / maxV) * 90),
    };
  });

  return (
    <>
      <p className={s.fpSec}>시세 추이</p>
      <div className={s.fpChartWrap}>
        <div className={s.fpChartTitleRow}>
          <span className={s.fpChartTitle}>실거래가 추이</span>
          <span className={s.fpChartPeriod}>최근 {trend.length}개월</span>
        </div>
        <svg width="100%" height="110" viewBox="0 0 460 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e4bd8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2e4bd8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area && <polygon points={area} fill="url(#pmGrad)" />}
          {line && <polyline points={line} fill="none" stroke="#2e4bd8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <div className={s.fpChartXLabels}>
          {trend.length > 0
            ? [trend[0], trend[Math.floor(trend.length / 2)], trend[trend.length - 1]]
                .filter(Boolean)
                .map((t, i) => <span key={i} className={s.fpChartXLabel}>{t.month}</span>)
            : <span className={s.fpChartXLabel}>데이터 없음</span>}
        </div>
      </div>
      <p className={s.fpSec}>시나리오 분석</p>
      <div className={s.fpScenarioOuter}>
        <div className={s.fpScenarioChart}>
          {bars.map((p) => (
            <div key={p.label} className={s.fpScenarioPeriod}>
              <div className={s.fpScenarioBars}>
                <div className={s.fpBar} style={{ height: `${p.opt}%`, background: "#22c55e" }} />
                <div className={s.fpBar} style={{ height: `${p.base}%`, background: "#2e4bd8" }} />
                <div className={s.fpBar} style={{ height: `${p.pess}%`, background: "#f59e0b" }} />
              </div>
              <span className={s.fpScenarioPlabel}>{p.label}</span>
            </div>
          ))}
        </div>
        <div className={s.fpScenarioLegend}>
          {[
            { color: "#22c55e", label: "낙관" },
            { color: "#2e4bd8", label: "기준" },
            { color: "#f59e0b", label: "비관" },
          ].map((l) => (
            <div key={l.label} className={s.fpLegItem}>
              <div className={s.fpLegDot} style={{ background: l.color }} />{l.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CompareTab({ prediction }: { prediction: Prediction }) {
  const { result } = prediction;
  if (!result) return null;

  // 동 전체 실거래(regionTransactions)를 단지별로 집계해 상위 5개 비교
  const colors = ["#2e4bd8", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];
  const region = result.regionTransactions ?? result.realTransactions;
  const byApt = new Map<string, { sum: number; cnt: number; dong: string }>();
  for (const t of region) {
    const e = byApt.get(t.aptName) ?? { sum: 0, cnt: 0, dong: t.dong ?? "" };
    e.sum += t.dealAmount;
    e.cnt += 1;
    byApt.set(t.aptName, e);
  }
  const aptStats = [...byApt.entries()]
    .map(([name, e]) => ({ name, avg: Math.round(e.sum / e.cnt), dong: e.dong, cnt: e.cnt }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((a, i) => ({ ...a, color: colors[i % colors.length], num: i + 1 }));
  const maxAvg = Math.max(...aptStats.map((a) => a.avg), 1);

  if (aptStats.length === 0) {
    return <p className={s.fpSec}>비교할 실거래 데이터가 없습니다.</p>;
  }

  return (
    <>
      <p className={s.fpSec}>단지 비교 (실거래 평균)</p>
      <div className={s.fpCompareRegionList}>
        {aptStats.map((r) => (
          <div key={r.name} className={s.fpCregionItem}>
            <div className={s.fpCregionNum} style={{ background: r.color }}>{r.num}</div>
            <div className={s.fpCregionInfo}>
              <div className={s.fpCregionName}>{r.name}</div>
              <div className={s.fpCregionSub}>{r.dong || `${r.cnt}건 실거래`}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={s.fpCregionPrice}>{toEok(r.avg)}</div>
            </div>
          </div>
        ))}
      </div>
      <p className={s.fpSec}>평균가 비교</p>
      <div className={s.fpCbarWrap}>
        {aptStats.map((r) => (
          <div key={r.name} className={s.fpCbarItem}>
            <span className={s.fpCbarLabel}>{r.name}</span>
            <div className={s.fpCbarTrack}>
              <div className={s.fpCbarCur} style={{ width: `${Math.round((r.avg / maxAvg) * 100)}%`, background: r.color }}>
                <span className={s.fpCbarCurText}>{toEok(r.avg)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BacktestTab({ prediction }: { prediction: Prediction }) {
  const { result, filteredTransactions } = prediction;
  const bt = result?.backtestResult;

  if (!bt) {
    return <p className={s.fpSec}>백테스트 데이터가 없습니다.</p>;
  }

  const accuracy = Math.round(bt.accuracy12m ?? 0);
  const grade = accuracy >= 80 ? "우수" : accuracy >= 60 ? "양호" : "보통";
  const metrics = [
    { label: "평균 오차율", val: `±${(bt.mape ?? 0).toFixed(1)}%`, sub: "실거래가 기준" },
    { label: "예측 오차(RMSE)", val: `±${toEok(bt.rmse ?? 0)}`, sub: "실제가 대비 평균 오차" },
    { label: "데이터 포인트", val: `${filteredTransactions.length.toLocaleString()}`, sub: "실거래 건수" },
    { label: "표본 수", val: `${(bt.sampleCount ?? 0).toLocaleString()}`, sub: bt.period || "백테스트 범위" },
  ];

  return (
    <>
      <div className={s.fpAccuracyHero}>
        <div>
          <span className={s.fpAccuracyNum}>{accuracy}</span>
          <span className={s.fpAccuracyPct}>%</span>
        </div>
        <div className={s.fpAccuracyLabel}>방향성 예측 정확도</div>
        <div className={s.fpAccuracyGrade}>{grade}</div>
      </div>
      <div className={s.fpBtMetrics}>
        {metrics.map((m) => (
          <div key={m.label} className={s.fpBtMetric}>
            <div className={s.fpBtMetricLabel}>{m.label}</div>
            <div className={s.fpBtMetricVal}>{m.val}</div>
            <div className={s.fpBtMetricSub}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div className={s.fpBtExplain}>
        <div className={s.fpBtExplainTitle}>백테스트 방법론</div>
        <div className={s.fpBtExplainText}>
          과거 실거래 데이터를 기반으로 AI 모델의 예측값과 실제값을 비교하였습니다. 금리·거래량·공시가격 등 변수를 종합적으로 반영하였습니다.
        </div>
      </div>
    </>
  );
}

function AnomalyTab({ prediction }: { prediction: Prediction }) {
  const { filteredTransactions } = prediction;

  if (filteredTransactions.length < 3) {
    return <p className={s.fpSec}>이상탐지를 위한 실거래 데이터가 부족합니다.</p>;
  }

  // Z-Score 기반 간단 이상 탐지
  const sorted = [...filteredTransactions].sort(
    (a, b) => a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay - (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay)
  );
  const amounts = sorted.map((t) => t.dealAmount);
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const std = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length) || 1;

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = max - min || 1;
  const W = 460;
  const H = 60;
  const pts = sorted.map((t, i) => {
    const x = sorted.length === 1 ? W : (i / (sorted.length - 1)) * W;
    const y = H - ((t.dealAmount - min) / range) * (H - 10) + 5;
    return { x, y, z: (t.dealAmount - mean) / std, t };
  });
  const line = pts.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ");
  const anomalies = pts.filter((p) => Math.abs(p.z) >= 2);
  const trend = mean > 0 && amounts[amounts.length - 1] >= mean ? "상승 압력" : "하락 압력";

  return (
    <>
      <div className={s.fpAnomalyBadgeRow}>
        <span className={`${s.fpAnomalyTrend} ${s.fpAtUp}`}>{trend}</span>
      </div>
      <div className={s.fpAnomalyChartWrap}>
        <svg width="100%" height="80" viewBox="0 0 460 80" preserveAspectRatio="none">
          <polyline points={line} fill="none" stroke="#2e4bd8" strokeWidth="2" strokeLinecap="round" />
          {anomalies.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="5" fill="#ef4444" />
          ))}
        </svg>
        <div className={s.fpAnomalyLegend}>
          <div className={s.fpAlegItem}><div className={s.fpAlegLine} style={{ background: "#2e4bd8" }} />실거래가</div>
          <div className={s.fpAlegItem}><div className={s.fpAlegDot} style={{ background: "#ef4444" }} />이상 감지</div>
        </div>
      </div>
      <div className={s.fpAnomalyListTitle}>감지된 이상 신호 {anomalies.length}건</div>
      {anomalies.length === 0 ? (
        <div className={s.fpAnomalyItem}>
          <div className={s.fpAnomalyDot} />
          <div className={s.fpAnomalyInfo}>
            <div className={s.fpAnomalyDetail}>통계적 이상치가 감지되지 않았습니다.</div>
          </div>
        </div>
      ) : (
        anomalies.slice(0, 4).map((p, i) => (
          <div key={i} className={s.fpAnomalyItem}>
            <div className={s.fpAnomalyDot} />
            <div className={s.fpAnomalyInfo}>
              <div className={s.fpAnomalyDate}>{p.t.dealYear}-{String(p.t.dealMonth).padStart(2, "0")}-{String(p.t.dealDay).padStart(2, "0")}</div>
              <div className={s.fpAnomalyDetail}>{p.t.aptName} {toEok(p.t.dealAmount)} (Z={p.z.toFixed(1)})</div>
            </div>
            <div className={s.fpAnomalySev}>{Math.abs(p.z) >= 3 ? "High" : "Medium"}</div>
          </div>
        ))
      )}
      <div className={s.fpMethodBox}>
        <div className={s.fpMethodTitle}>탐지 방법론</div>
        <ul className={s.fpMethodList}>
          <li>Z-Score 기반 가격 이상치 탐지</li>
          <li>실거래 시계열 편차 분석</li>
          <li>거래 추세 방향성 판정</li>
        </ul>
      </div>
    </>
  );
}
