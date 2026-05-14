import { prisma } from "@/lib/prisma";

export interface PublicAnalyticsOverviewResponse {
  source: "vestra";
  provider: "first-party";
  providerLabel: string;
  rangeDays: number;
  generatedAt: string;
  overview: {
    totalPageViews: number;
    totalSessions: number;
    authenticatedSessions: number;
    anonymousSessions: number;
    knownUsers: number;
    avgPagesPerSession: number;
    avgSessionDurationSec: number;
    avgPageEngagementSec: number;
    bounceRate: number;
  };
  trend: Array<{
    date: string;
    pageViews: number;
    sessions: number;
  }>;
  topPages: Array<{
    path: string;
    pageCategory: string;
    views: number;
    avgEngagementSec: number;
  }>;
  topRegions: Array<{
    label: string;
    count: number;
  }>;
  topCities: Array<{
    label: string;
    count: number;
  }>;
  topReferrers: Array<{
    label: string;
    count: number;
  }>;
  deviceBreakdown: Array<{
    label: string;
    count: number;
  }>;
  browserBreakdown: Array<{
    label: string;
    count: number;
  }>;
  notes: string[];
}

interface PublicAnalyticsPageViewRow {
  sessionKey: string;
  userId: string | null;
  isAuthenticated: boolean;
  path: string;
  pageCategory: string | null;
  region: string | null;
  city: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  deviceCategory: string | null;
  browser: string | null;
  createdAt: Date;
}

interface PublicAnalyticsPageLeaveRow {
  sessionKey: string;
  path: string;
  durationMs: number | null;
}

function clampRangeDays(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(365, Math.max(7, Math.round(value)));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatDateKst(value: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function countByLabel(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim() || "직접 유입";
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

export async function fetchPublicAnalyticsOverview(inputDays: number): Promise<PublicAnalyticsOverviewResponse> {
  const rangeDays = clampRangeDays(inputDays);
  const since = new Date();
  since.setDate(since.getDate() - Math.max(0, rangeDays - 1));

  const [pageViews, pageLeaves] = await Promise.all([
    prisma.$queryRaw<PublicAnalyticsPageViewRow[]>`
      SELECT
        "sessionKey",
        "userId",
        "isAuthenticated",
        "path",
        "pageCategory",
        "region",
        "city",
        "referrerHost",
        "utmSource",
        "deviceCategory",
        "browser",
        "createdAt"
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'page_view'
        AND "createdAt" >= ${since}
      ORDER BY "createdAt" ASC
    `,
    prisma.$queryRaw<PublicAnalyticsPageLeaveRow[]>`
      SELECT
        "sessionKey",
        "path",
        "durationMs"
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'page_leave'
        AND "createdAt" >= ${since}
    `,
  ]);

  const sessionPageCounts = new Map<string, number>();
  const sessionAuthMap = new Map<string, boolean>();
  const knownUsers = new Set<string>();
  const trendPageViews = new Map<string, number>();
  const trendSessions = new Map<string, Set<string>>();
  const topPageCounts = new Map<string, { pageCategory: string; views: number }>();
  const sessionLeaveDuration = new Map<string, number>();
  const pageLeaveDuration = new Map<string, { totalMs: number; count: number }>();

  for (const row of pageViews) {
    sessionPageCounts.set(row.sessionKey, (sessionPageCounts.get(row.sessionKey) || 0) + 1);
    sessionAuthMap.set(row.sessionKey, (sessionAuthMap.get(row.sessionKey) || false) || row.isAuthenticated);
    if (row.userId) knownUsers.add(row.userId);

    const dateKey = formatDateKst(row.createdAt);
    trendPageViews.set(dateKey, (trendPageViews.get(dateKey) || 0) + 1);
    const daySessions = trendSessions.get(dateKey) || new Set<string>();
    daySessions.add(row.sessionKey);
    trendSessions.set(dateKey, daySessions);

    const pageKey = row.path || "/";
    const currentPage = topPageCounts.get(pageKey) || {
      pageCategory: row.pageCategory || "other",
      views: 0,
    };
    currentPage.views += 1;
    topPageCounts.set(pageKey, currentPage);
  }

  for (const row of pageLeaves) {
    const durationMs = Math.max(0, row.durationMs || 0);
    sessionLeaveDuration.set(row.sessionKey, (sessionLeaveDuration.get(row.sessionKey) || 0) + durationMs);

    const pageKey = row.path || "/";
    const current = pageLeaveDuration.get(pageKey) || { totalMs: 0, count: 0 };
    current.totalMs += durationMs;
    current.count += 1;
    pageLeaveDuration.set(pageKey, current);
  }

  const totalPageViews = pageViews.length;
  const totalSessions = sessionPageCounts.size;
  const authenticatedSessions = [...sessionAuthMap.values()].filter(Boolean).length;
  const anonymousSessions = Math.max(0, totalSessions - authenticatedSessions);
  const bounceSessions = [...sessionPageCounts.values()].filter((count) => count <= 1).length;
  const totalSessionDurationMs = [...sessionLeaveDuration.values()].reduce((sum, value) => sum + value, 0);
  const totalPageDurationMs = [...pageLeaveDuration.values()].reduce((sum, value) => sum + value.totalMs, 0);
  const totalPageDurationCount = [...pageLeaveDuration.values()].reduce((sum, value) => sum + value.count, 0);

  return {
    source: "vestra",
    provider: "first-party",
    providerLabel: "vestra 자체 수집",
    rangeDays,
    generatedAt: new Date().toISOString(),
    overview: {
      totalPageViews,
      totalSessions,
      authenticatedSessions,
      anonymousSessions,
      knownUsers: knownUsers.size,
      avgPagesPerSession: round(totalSessions > 0 ? totalPageViews / totalSessions : 0, 2),
      avgSessionDurationSec: round(totalSessions > 0 ? totalSessionDurationMs / totalSessions / 1000 : 0, 1),
      avgPageEngagementSec: round(totalPageDurationCount > 0 ? totalPageDurationMs / totalPageDurationCount / 1000 : 0, 1),
      bounceRate: round(totalSessions > 0 ? (bounceSessions / totalSessions) * 100 : 0, 1),
    },
    trend: [...trendPageViews.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        pageViews: count,
        sessions: trendSessions.get(date)?.size || 0,
      })),
    topPages: [...topPageCounts.entries()]
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 12)
      .map(([path, stats]) => {
        const leaveStats = pageLeaveDuration.get(path);
        return {
          path,
          pageCategory: stats.pageCategory,
          views: stats.views,
          avgEngagementSec: round(
            leaveStats && leaveStats.count > 0 ? leaveStats.totalMs / leaveStats.count / 1000 : 0,
            1,
          ),
        };
      }),
    topRegions: countByLabel(pageViews.map((row) => row.region)).slice(0, 10),
    topCities: countByLabel(pageViews.map((row) => row.city)).slice(0, 10),
    topReferrers: countByLabel(pageViews.map((row) => row.utmSource || row.referrerHost)).slice(0, 10),
    deviceBreakdown: countByLabel(pageViews.map((row) => row.deviceCategory)).slice(0, 10),
    browserBreakdown: countByLabel(pageViews.map((row) => row.browser)).slice(0, 10),
    notes: [
      "이 화면은 vestra 사이트가 직접 저장한 방문 이벤트 집계입니다.",
      "GA4 속성 연결 상태와 무관하게 실제 page_view/page_leave 적재값을 기준으로 계산합니다.",
    ],
  };
}
