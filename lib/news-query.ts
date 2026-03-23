/**
 * 뉴스·정책 조회 유틸리티
 * ─────────────────────────
 * AI 컨텍스트 주입, 활용 로그, 데이터 정리용 함수 제공.
 */

import { prisma } from "./prisma";

/**
 * AI 컨텍스트용 최근 뉴스/정책 조회
 * @param days 최근 N일 (기본 7)
 * @param limit 최대 건수 (기본 15)
 */
export async function getRecentNews(days = 7, limit = 15) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.newsArticle.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      source: true,
      category: true,
      tags: true,
      policyType: true,
      publishedAt: true,
    },
  });
}

/**
 * 특정 태그의 최근 정책 조회 (계약분석/시세전망용)
 */
export async function getRecentPolicies(tags: string[], days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: since },
      tags: { hasSome: tags },
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      source: true,
      category: true,
      tags: true,
      policyType: true,
      publishedAt: true,
    },
  });
}

/**
 * 활용 로그 기록
 */
export async function logNewsUsage(articleIds: string[], usedIn: string) {
  if (articleIds.length === 0) return;

  await prisma.newsUsageLog.createMany({
    data: articleIds.map((articleId) => ({ articleId, usedIn })),
    skipDuplicates: true,
  });
}

/**
 * 90일 초과 데이터 삭제 (보존 정책)
 * 알림 데이터는 1년 보존
 */
export async function cleanupOldArticles(): Promise<number> {
  const cutoff90 = new Date();
  cutoff90.setDate(cutoff90.getDate() - 90);

  const cutoff365 = new Date();
  cutoff365.setDate(cutoff365.getDate() - 365);

  // 일반 기사: 90일
  const normal = await prisma.newsArticle.deleteMany({
    where: {
      isAlert: false,
      collectedAt: { lt: cutoff90 },
    },
  });

  // 알림 기사: 1년
  const alerts = await prisma.newsArticle.deleteMany({
    where: {
      isAlert: true,
      collectedAt: { lt: cutoff365 },
    },
  });

  return normal.count + alerts.count;
}

/**
 * AI 어시스턴트용 뉴스 컨텍스트 문자열 생성
 */
export async function buildNewsContext(): Promise<{ context: string; articleIds: string[] }> {
  const articles = await getRecentNews(7, 15);
  if (articles.length === 0) return { context: "", articleIds: [] };

  const context = `\n\n[최근 부동산 동향 - ${new Date().toLocaleDateString("ko-KR")} 기준]\n${articles
    .map(
      (n) =>
        `- [${n.source}] ${n.title} (${n.publishedAt.toLocaleDateString("ko-KR")})`
    )
    .join("\n")}\n\n위 최신 뉴스/정책을 참고하여 답변하세요. 출처와 날짜를 함께 언급하세요.`;

  return { context, articleIds: articles.map((n) => n.id) };
}

/**
 * 계약분석/시세전망용 정책 컨텍스트 문자열 생성
 */
export async function buildPolicyContext(
  tags: string[]
): Promise<{ context: string; articleIds: string[] }> {
  const policies = await getRecentPolicies(tags, 30);
  if (policies.length === 0) return { context: "", articleIds: [] };

  const context = `\n\n최근 관련 정책:\n${policies
    .map(
      (p) =>
        `- [${p.source}] ${p.title} (${p.publishedAt.toLocaleDateString("ko-KR")})`
    )
    .join("\n")}`;

  return { context, articleIds: policies.map((p) => p.id) };
}
