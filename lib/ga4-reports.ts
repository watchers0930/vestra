import {
  batchRunReports,
  runRealtimeReport,
  type Ga4Report,
  type Ga4ReportRequest,
} from "./ga4-client";

/**
 * GA4 대시보드용 리포트 정의 + 정규화.
 * lib/ga4-client(인증·REST)를 조합해 관리자 통계 화면이 쓰기 쉬운 형태로 반환한다.
 */

export type Ga4Period = 7 | 28 | 90;

export interface Ga4Summary {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  averageSessionDuration: number; // 초
  bounceRate: number; // 0~1
  engagementRate: number; // 0~1
  eventCount: number;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
}

export interface Ga4Dashboard {
  period: number;
  updatedAt: string;
  realtimeActiveUsers: number;
  realtimeByCountry: NameValue[];
  summary: Ga4Summary;
  daily: DailyPoint[];
  topPages: NameValue[];
  channels: NameValue[];
  sourceMedium: NameValue[];
  devices: NameValue[];
  browsers: NameValue[];
  os: NameValue[];
  countries: NameValue[];
  cities: NameValue[];
  events: NameValue[];
}

const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// GA4 date(YYYYMMDD) → YYYY-MM-DD
const fmtDate = (d: string) =>
  d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

// dim 1개 + metric 1개 리포트를 NameValue[]로
function toNameValues(report: Ga4Report | undefined): NameValue[] {
  if (!report?.rows) return [];
  return report.rows.map((r) => ({
    name: r.dimensionValues?.[0]?.value || "(기타)",
    value: num(r.metricValues?.[0]?.value),
  }));
}

export async function fetchGa4Dashboard(period: Ga4Period): Promise<Ga4Dashboard> {
  const dateRanges = [{ startDate: `${period}daysAgo`, endDate: "today" }];
  const orderByMetricDesc = (metric: string) => [
    { metric: { metricName: metric }, desc: true },
  ];

  const requests: Ga4ReportRequest[] = [
    // 0. 요약 KPI
    {
      dateRanges,
      metrics: [
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "engagementRate" },
        { name: "eventCount" },
      ],
    },
    // 1. 일별 추이
    {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
    },
    // 2. 인기 페이지
    {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: orderByMetricDesc("screenPageViews"),
      limit: 15,
    },
    // 3. 채널 그룹
    {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: orderByMetricDesc("sessions"),
      limit: 15,
    },
    // 4. 소스/매체
    {
      dateRanges,
      dimensions: [{ name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: orderByMetricDesc("sessions"),
      limit: 12,
    },
    // 5. 기기 카테고리
    {
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: orderByMetricDesc("activeUsers"),
    },
    // 6. 브라우저
    {
      dateRanges,
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: orderByMetricDesc("activeUsers"),
      limit: 8,
    },
    // 7. OS
    {
      dateRanges,
      dimensions: [{ name: "operatingSystem" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: orderByMetricDesc("activeUsers"),
      limit: 8,
    },
    // 8. 국가
    {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: orderByMetricDesc("activeUsers"),
      limit: 10,
    },
    // 9. 도시
    {
      dateRanges,
      dimensions: [{ name: "city" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: orderByMetricDesc("activeUsers"),
      limit: 10,
    },
    // 10. 이벤트
    {
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: orderByMetricDesc("eventCount"),
      limit: 15,
    },
  ];

  const [reports, realtime] = await Promise.all([
    batchRunReports(requests),
    runRealtimeReport({
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      limit: 10,
    }).catch(() => ({ rows: [] }) as Ga4Report),
  ]);

  const summaryRow = reports[0]?.rows?.[0]?.metricValues || [];
  const summary: Ga4Summary = {
    totalUsers: num(summaryRow[0]?.value),
    newUsers: num(summaryRow[1]?.value),
    activeUsers: num(summaryRow[2]?.value),
    sessions: num(summaryRow[3]?.value),
    screenPageViews: num(summaryRow[4]?.value),
    averageSessionDuration: num(summaryRow[5]?.value),
    bounceRate: num(summaryRow[6]?.value),
    engagementRate: num(summaryRow[7]?.value),
    eventCount: num(summaryRow[8]?.value),
  };

  const daily: DailyPoint[] = (reports[1]?.rows || []).map((r) => ({
    date: fmtDate(r.dimensionValues?.[0]?.value || ""),
    activeUsers: num(r.metricValues?.[0]?.value),
    sessions: num(r.metricValues?.[1]?.value),
    screenPageViews: num(r.metricValues?.[2]?.value),
  }));

  const realtimeByCountry = toNameValues(realtime);
  const realtimeActiveUsers = realtimeByCountry.reduce((s, x) => s + x.value, 0);

  return {
    period,
    updatedAt: new Date().toISOString(),
    realtimeActiveUsers,
    realtimeByCountry,
    summary,
    daily,
    topPages: toNameValues(reports[2]),
    channels: toNameValues(reports[3]),
    sourceMedium: toNameValues(reports[4]),
    devices: toNameValues(reports[5]),
    browsers: toNameValues(reports[6]),
    os: toNameValues(reports[7]),
    countries: toNameValues(reports[8]),
    cities: toNameValues(reports[9]),
    events: toNameValues(reports[10]),
  };
}
