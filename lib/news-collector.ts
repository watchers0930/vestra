/**
 * 부동산 뉴스·정책 RSS 수집 엔진
 * ─────────────────────────────────
 * RSS 피드를 파싱하여 NewsArticle 테이블에 저장.
 * 매일 06:00 Vercel Cron으로 실행.
 */

import { prisma } from "./prisma";
import { classifyArticle } from "./news-tagger";

// ---------------------------------------------------------------------------
// RSS 소스 설정
// ---------------------------------------------------------------------------

interface FeedSource {
  name: string;
  url: string;
  category: "news" | "policy";
  source: string;
}

const FEED_SOURCES: FeedSource[] = [
  // 뉴스
  {
    name: "Google 부동산 뉴스",
    url: "https://news.google.com/rss/search?q=%EB%B6%80%EB%8F%99%EC%82%B0+%EC%95%84%ED%8C%8C%ED%8A%B8+%EC%A0%84%EC%84%B8&hl=ko&gl=KR&ceid=KR:ko",
    category: "news",
    source: "google",
  },
  {
    name: "매일경제 부동산",
    url: "https://www.mk.co.kr/rss/50300009/",
    category: "news",
    source: "mk",
  },
  // 정부 정책
  {
    name: "국토교통부 보도자료",
    url: "https://www.molit.go.kr/USR/RSS/m_71/lst.jsp",
    category: "policy",
    source: "molit",
  },
];

/** 일일 최대 수집 건수 */
const MAX_DAILY_ARTICLES = 50;

// ---------------------------------------------------------------------------
// RSS 파싱
// ---------------------------------------------------------------------------

interface RawArticle {
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
}

/** XML 태그 값 추출 (CDATA 지원) */
function extractXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?\\s*</${tag}>`,
    "s"
  );
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/** HTML 태그 제거 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

async function parseFeed(source: FeedSource): Promise<RawArticle[]> {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "VESTRA-NewsBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[NewsCollector] ${source.name} HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    if (xml.length > 5 * 1024 * 1024) {
      console.warn(`[NewsCollector] ${source.name} 응답 초과 (5MB)`);
      return [];
    }

    const articles: RawArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 20) {
      const item = match[1];
      const title = stripHtml(extractXmlTag(item, "title"));
      const link = extractXmlTag(item, "link");
      const description = stripHtml(extractXmlTag(item, "description")).slice(0, 300);
      const pubDate = extractXmlTag(item, "pubDate");

      if (!title || !link) continue;

      articles.push({
        title,
        summary: description || title,
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
      });
    }

    return articles;
  } catch (error) {
    console.warn(`[NewsCollector] ${source.name} 파싱 실패:`, error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 수집 실행
// ---------------------------------------------------------------------------

export interface CollectResult {
  total: number;
  saved: number;
  duplicates: number;
  alerts: number;
  errors: string[];
}

export async function collectNews(): Promise<CollectResult> {
  const result: CollectResult = { total: 0, saved: 0, duplicates: 0, alerts: 0, errors: [] };
  let totalSaved = 0;

  for (const source of FEED_SOURCES) {
    if (totalSaved >= MAX_DAILY_ARTICLES) break;

    try {
      const articles = await parseFeed(source);
      result.total += articles.length;

      for (const article of articles) {
        if (totalSaved >= MAX_DAILY_ARTICLES) break;

        // 중복 확인
        const exists = await prisma.newsArticle.findUnique({
          where: { url: article.url },
          select: { id: true },
        });
        if (exists) {
          result.duplicates++;
          continue;
        }

        // 분류
        const { tags, policyType, isAlert } = classifyArticle(article.title, article.summary);

        // 저장
        await prisma.newsArticle.create({
          data: {
            title: article.title,
            summary: article.summary,
            url: article.url,
            source: source.source,
            category: source.category,
            tags,
            policyType,
            publishedAt: article.publishedAt,
            isAlert,
          },
        });

        result.saved++;
        totalSaved++;
        if (isAlert) result.alerts++;
      }
    } catch (error) {
      const msg = `${source.name}: ${String(error)}`;
      result.errors.push(msg);
      console.error(`[NewsCollector] ${msg}`);
    }
  }

  console.info(
    `[NewsCollector] 완료: ${result.saved}건 저장, ${result.duplicates}건 중복, ${result.alerts}건 알림`
  );

  return result;
}
