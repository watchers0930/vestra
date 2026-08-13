"use client";

import s from "./price-map-renewal.module.css";

type FpTab = "dashboard" | "chart" | "compare" | "backtest" | "anomaly";

interface Props { fpTab: FpTab; }

export default function PriceMapRenewalContent({ fpTab }: Props) {
  return (
    <div className={s.fpBody}>
      {fpTab === "dashboard" && <DashboardTab />}
      {fpTab === "chart" && <ChartTab />}
      {fpTab === "compare" && <CompareTab />}
      {fpTab === "backtest" && <BacktestTab />}
      {fpTab === "anomaly" && <AnomalyTab />}
    </div>
  );
}

function DashboardTab() {
  return (
    <>
      <p className={s.fpSec}>AI 시세전망</p>
      <div className={s.fpKpiGrid}>
        {[
          { label: "3개월 전망", val: "29.4억", chg: "▲ +5.0%", conf: 78 },
          { label: "6개월 전망", val: "31.2억", chg: "▲ +11.4%", conf: 62 },
          { label: "1년 전망",   val: "33.5억", chg: "▲ +19.6%", conf: 48 },
          { label: "신뢰도",     val: "78%",    chg: "High Confidence", conf: 78, neutral: true },
        ].map((k) => (
          <div key={k.label} className={s.fpKpiCard}>
            <div className={s.fpKpiLabel}>{k.label}</div>
            <div className={s.fpKpiVal}>{k.val}</div>
            <div className={`${s.fpKpiChg} ${k.neutral ? s.fpKpiN : s.fpKpiUp}`}>{k.chg}</div>
            <div className={s.fpConfBar}><div className={s.fpConfFill} style={{ width: `${k.conf}%` }} /></div>
          </div>
        ))}
      </div>
      <div className={s.fpSectionDivider} />
      <div className={s.fpAiBox}>
        <div className={s.fpAiLabel}>AI 종합 의견</div>
        <div className={s.fpAiText}>
          래미안대치팰리스는 강남 재건축 수요와 교육특구 프리미엄을 기반으로 중장기 상승세가 예상됩니다. 금리 인하 사이클 진입 시 추가 가격 상승 가능성이 높습니다.
        </div>
      </div>
      <p className={s.fpSec}>주요 영향 변수</p>
      <div className={s.fpVarWrap}>
        {["금리 인하","재건축 기대","교육 수요","공급 부족","외국인 투자"].map((v) => (
          <span key={v} className={s.fpVarTag}>{v}</span>
        ))}
      </div>
    </>
  );
}

function ChartTab() {
  return (
    <>
      <p className={s.fpSec}>시세 추이</p>
      <div className={s.fpChartWrap}>
        <div className={s.fpChartTitleRow}>
          <span className={s.fpChartTitle}>실거래가 추이</span>
          <span className={s.fpChartPeriod}>최근 24개월</span>
        </div>
        <svg width="100%" height="110" viewBox="0 0 460 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e4bd8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2e4bd8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="0,100 40,88 80,82 120,72 160,66 200,58 240,52 280,46 320,40 360,34 400,28 460,22 460,110 0,110" fill="url(#pmGrad)" />
          <polyline points="0,100 40,88 80,82 120,72 160,66 200,58 240,52 280,46 320,40 360,34 400,28 460,22" fill="none" stroke="#2e4bd8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className={s.fpChartXLabels}>
          {["24M전","18M전","12M전","6M전","현재"].map((l) => (
            <span key={l} className={s.fpChartXLabel}>{l}</span>
          ))}
        </div>
      </div>
      <p className={s.fpSec}>시나리오 분석</p>
      <div className={s.fpScenarioOuter}>
        <div className={s.fpScenarioChart}>
          {[
            { label: "3M", opt: 60, base: 45, pess: 25 },
            { label: "6M", opt: 65, base: 50, pess: 30 },
            { label: "1Y", opt: 75, base: 55, pess: 35 },
          ].map((p) => (
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

function CompareTab() {
  const regions = [
    { num: 1, color: "#2e4bd8", name: "대치동", sub: "강남구 · 45평형", price: "28억", chg: "+5.2%", up: true },
    { num: 2, color: "#22c55e", name: "반포동", sub: "서초구 · 45평형", price: "35억", chg: "+3.1%", up: true },
    { num: 3, color: "#f59e0b", name: "잠실동", sub: "송파구 · 45평형", price: "22억", chg: "-0.8%", up: false },
  ];
  return (
    <>
      <p className={s.fpSec}>지역 비교</p>
      <div className={s.fpCompareRegionList}>
        {regions.map((r) => (
          <div key={r.name} className={s.fpCregionItem}>
            <div className={s.fpCregionNum} style={{ background: r.color }}>{r.num}</div>
            <div className={s.fpCregionInfo}>
              <div className={s.fpCregionName}>{r.name}</div>
              <div className={s.fpCregionSub}>{r.sub}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={s.fpCregionPrice}>{r.price}</div>
              <div className={`${s.fpCregionChg} ${r.up ? s.fpKpiUp : s.fpKpiDn}`}>{r.chg}</div>
            </div>
          </div>
        ))}
      </div>
      <p className={s.fpSec}>평당가 비교</p>
      <div className={s.fpCbarWrap}>
        {regions.map((r) => (
          <div key={r.name} className={s.fpCbarItem}>
            <span className={s.fpCbarLabel}>{r.name}</span>
            <div className={s.fpCbarTrack}>
              <div className={s.fpCbarCur} style={{ width: `${r.num === 1 ? 60 : r.num === 2 ? 78 : 45}%`, background: r.color }}>
                <span className={s.fpCbarCurText}>{r.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function BacktestTab() {
  return (
    <>
      <div className={s.fpAccuracyHero}>
        <div>
          <span className={s.fpAccuracyNum}>84</span>
          <span className={s.fpAccuracyPct}>%</span>
        </div>
        <div className={s.fpAccuracyLabel}>방향성 예측 정확도 (24개월)</div>
        <div className={s.fpAccuracyGrade}>우수</div>
      </div>
      <div className={s.fpBtMetrics}>
        {[
          { label: "평균 오차율", val: "±3.2%", sub: "실거래가 기준" },
          { label: "샤프 지수",  val: "1.84",   sub: "리스크 조정 수익" },
          { label: "예측 기간",  val: "24M",    sub: "백테스트 범위" },
          { label: "데이터 포인트", val: "1,248", sub: "실거래 건수" },
        ].map((m) => (
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
          과거 24개월 실거래 데이터를 기반으로 AI 모델의 예측값과 실제값을 비교하였습니다. 금리·거래량·공시가격·외부 충격 변수를 종합적으로 반영하였습니다.
        </div>
      </div>
    </>
  );
}

function AnomalyTab() {
  return (
    <>
      <div className={s.fpAnomalyBadgeRow}>
        <span className={`${s.fpAnomalyTrend} ${s.fpAtUp}`}>상승 압력</span>
      </div>
      <div className={s.fpAnomalyChartWrap}>
        <svg width="100%" height="80" viewBox="0 0 460 80" preserveAspectRatio="none">
          <polyline points="0,60 60,55 120,50 180,45 220,40 240,20 260,35 320,30 380,28 460,25" fill="none" stroke="#2e4bd8" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="240" cy="20" r="5" fill="#ef4444" />
        </svg>
        <div className={s.fpAnomalyLegend}>
          <div className={s.fpAlegItem}><div className={s.fpAlegLine} style={{ background: "#2e4bd8" }} />실거래가</div>
          <div className={s.fpAlegItem}><div className={s.fpAlegDot} style={{ background: "#ef4444" }} />이상 감지</div>
        </div>
      </div>
      <div className={s.fpAnomalyListTitle}>감지된 이상 신호</div>
      {[
        { date: "2026-03-15", detail: "거래량 급등 — 전월 대비 +240%", sev: "High" },
        { date: "2026-01-08", detail: "가격 갭 — 단기 12% 급등",     sev: "Medium" },
      ].map((a) => (
        <div key={a.date} className={s.fpAnomalyItem}>
          <div className={s.fpAnomalyDot} />
          <div className={s.fpAnomalyInfo}>
            <div className={s.fpAnomalyDate}>{a.date}</div>
            <div className={s.fpAnomalyDetail}>{a.detail}</div>
          </div>
          <div className={s.fpAnomalySev}>{a.sev}</div>
        </div>
      ))}
      <div className={s.fpMethodBox}>
        <div className={s.fpMethodTitle}>탐지 방법론</div>
        <ul className={s.fpMethodList}>
          <li>Z-Score 기반 가격 이상치 탐지</li>
          <li>거래량 이동평균 이탈 감지</li>
          <li>시계열 변화점(Changepoint) 분석</li>
        </ul>
      </div>
    </>
  );
}
