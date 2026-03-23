# 부동산 뉴스·정책 수집기 (News & Policy Collector) 설계서

> **Summary**: 부동산 뉴스/정부 정책 자동 수집 → DB 저장 → AI 컨텍스트 주입 → 관리자 대시보드
>
> **Project**: Vestra
> **Version**: 4.5.4
> **Author**: Watchers
> **Date**: 2026-03-23
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/news-policy-collector.plan.md`

---

## 1. DB 스키마

### 1.1 NewsArticle

```prisma
model NewsArticle {
  id          String   @id @default(cuid())
  title       String
  summary     String   @db.Text
  url         String   @unique
  source      String                        // naver | molit | moef | nts | hankyung | mk
  category    String                        // news | policy
  tags        String[]
  policyType  String?                       // 세율변경 | 규제지역 | 대출규제 | 공급정책 | 전세대책
  publishedAt DateTime
  collectedAt DateTime @default(now())
  isAlert     Boolean  @default(false)
  alertAcked  Boolean  @default(false)      // 관리자 확인 여부
  usageLogs   NewsUsageLog[]

  @@index([category, publishedAt(sort: Desc)])
  @@index([isAlert, alertAcked])
}

model NewsUsageLog {
  id        String   @id @default(cuid())
  articleId String
  usedIn    String                          // chat | contract | prediction
  usedAt    DateTime @default(now())

  article   NewsArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@index([articleId])
  @@index([usedIn, usedAt(sort: Desc)])
}
```

---

## 2. RSS 소스 설정

### 2.1 피드 목록

```typescript
// lib/news-collector.ts

interface FeedSource {
  name: string;
  url: string;
  category: "news" | "policy";
  source: string;
}

const FEED_SOURCES: FeedSource[] = [
  // 뉴스
  {
    name: "네이버 부동산 뉴스",
    url: "https://news.google.com/rss/search?q=부동산+아파트+전세&hl=ko&gl=KR&ceid=KR:ko",
    category: "news",
    source: "google",
  },
  {
    name: "한국경제 부동산",
    url: "https://www.hankyung.com/feed/real-estate",
    category: "news",
    source: "hankyung",
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
  {
    name: "기획재정부 보도자료",
    url: "https://www.moef.go.kr/nw/nes/nesdta.do?searchBbsId1=MOSFBBS_000000000028&menuNo=4010100&rss=Y",
    category: "policy",
    source: "moef",
  },
];
```

> RSS URL은 구현 시 실제 접속 가능한 피드로 검증 필요. 접속 불가 시 graceful skip.

### 2.2 키워드 분류 규칙

```typescript
// lib/news-tagger.ts

const TAG_RULES: Record<string, RegExp> = {
  취득세: /취득세|acquisition tax/i,
  양도세: /양도세|양도소득세|capital gains/i,
  종부세: /종합부동산세|종부세/i,
  세율변경: /세율.*(인상|인하|변경|개편|조정)|세제.*개편/,
  규제지역: /투기과열|조정대상|규제지역.*(지정|해제)|비규제/,
  대출규제: /LTV|DTI|DSR|대출.*규제|대출.*한도|총부채/i,
  전세: /전세|임차|임대차|보증금/,
  재건축: /재건축|재개발|정비사업/,
  분양: /분양|청약|당첨/,
  공급정책: /공급.*대책|택지|3기.*신도시|공공분양/,
};

const POLICY_ALERT_RULES: Record<string, RegExp> = {
  세율변경: /취득세율|양도세율|종부세율|세율.*(인상|인하)|세제.*개편/,
  규제지역: /투기과열지구.*(지정|해제)|조정대상지역.*(지정|해제)/,
  대출규제: /LTV.*변경|DSR.*완화|대출.*규제.*(강화|완화)/i,
  전세대책: /전세사기.*대책|임대차보호법.*개정|전세보증.*의무/,
};
```

---

## 3. 핵심 모듈 설계

### 3.1 `lib/news-collector.ts` — 수집 엔진

```typescript
export interface CollectResult {
  total: number;
  saved: number;
  duplicates: number;
  alerts: number;
  errors: string[];
}

/**
 * RSS 피드에서 뉴스/정책 수집
 * - 각 피드 순회 → XML 파싱 → 중복 체크 → 태그 부여 → DB 저장
 * - 정책 변경 감지 시 isAlert=true
 */
export async function collectNews(): Promise<CollectResult>;

/**
 * 단일 RSS 피드 파싱
 * - XML → { title, summary, url, publishedAt } 배열
 * - 파싱 실패 시 빈 배열 반환 (graceful)
 */
async function parseFeed(source: FeedSource): Promise<RawArticle[]>;

/**
 * 키워드 매칭으로 태그 + policyType + isAlert 결정
 */
function classifyArticle(title: string, summary: string): {
  tags: string[];
  policyType: string | null;
  isAlert: boolean;
};
```

### 3.2 `lib/news-query.ts` — 조회 유틸

```typescript
/**
 * AI 컨텍스트용 최근 뉴스 조회
 * @param days 최근 N일 (기본 7)
 * @param limit 최대 건수 (기본 15)
 */
export async function getRecentNews(days?: number, limit?: number): Promise<NewsArticle[]>;

/**
 * 특정 태그의 최근 정책 조회 (시세전망/계약분석용)
 */
export async function getRecentPolicies(tags: string[], days?: number): Promise<NewsArticle[]>;

/**
 * 활용 로그 기록
 */
export async function logNewsUsage(articleIds: string[], usedIn: string): Promise<void>;

/**
 * 90일 초과 데이터 삭제 (보존 정책)
 */
export async function cleanupOldArticles(): Promise<number>;
```

---

## 4. API Route 설계

### 4.1 Cron: `/api/cron/news-collector/route.ts`

```
GET /api/cron/news-collector
Authorization: Bearer {CRON_SECRET}

Response 200:
{
  success: true,
  total: 28,
  saved: 22,
  duplicates: 6,
  alerts: 1,
  timestamp: "2026-03-23T06:00:12.000Z"
}
```

- `export const dynamic = "force-dynamic"`
- CRON_SECRET 검증 (기존 fraud-import 패턴 동일)
- `collectNews()` 호출 후 결과 반환
- 에러 시 500 + console.error

### 4.2 조회: `/api/news/route.ts`

```
GET /api/news?category=policy&tag=세율변경&page=1&limit=20

Response 200:
{
  items: NewsArticle[],
  total: 142,
  page: 1,
  totalPages: 8
}
```

### 4.3 관리자 API

| Route | Method | 기능 |
|-------|--------|------|
| `/api/admin/news` | GET | 목록 (필터·페이지네이션·활용횟수 포함) |
| `/api/admin/news/stats` | GET | `{ today, week, total, lastCollected, alertCount }` |
| `/api/admin/news/alerts` | GET | 미확인 알림 목록 |
| `/api/admin/news/alerts/[id]` | PATCH | `{ alertAcked: true }` |
| `/api/admin/news/collect` | POST | 수동 수집 트리거 (collectNews 호출) |
| `/api/admin/news/[id]` | DELETE | 단건 삭제 |

---

## 5. AI 컨텍스트 주입 설계

### 5.1 AI 어시스턴트 (`app/api/chat/route.ts`)

기존 코드 수정 위치: line 57~61

```typescript
// 기존
const systemPrompt = CHAT_SYSTEM_PROMPT + courtContext;

// 변경
import { getRecentNews, logNewsUsage } from "@/lib/news-query";

const recentNews = await getRecentNews(7, 15);
let newsContext = "";
if (recentNews.length > 0) {
  newsContext = `\n\n[최근 부동산 동향 - ${new Date().toLocaleDateString("ko-KR")} 기준]\n${recentNews
    .map((n) => `- [${n.source}] ${n.title} (${n.publishedAt.toLocaleDateString("ko-KR")})`)
    .join("\n")}\n\n위 최신 뉴스/정책을 참고하여 답변하세요. 출처와 날짜를 함께 언급하세요.`;

  // 활용 로그 기록
  await logNewsUsage(recentNews.map((n) => n.id), "chat").catch(() => {});
}

const systemPrompt = CHAT_SYSTEM_PROMPT + courtContext + newsContext;
```

### 5.2 계약서 분석 (`app/api/analyze-contract/route.ts`)

기존 코드 수정 위치: line 55~71 (courtContext 생성 이후)

```typescript
// 판례 컨텍스트 이후에 추가
import { getRecentPolicies, logNewsUsage } from "@/lib/news-query";

const policies = await getRecentPolicies(["전세", "규제지역", "대출규제"], 30);
let policyContext = "";
if (policies.length > 0) {
  policyContext = `\n\n최근 관련 정책:\n${policies
    .map((p) => `- [${p.source}] ${p.title} (${p.publishedAt.toLocaleDateString("ko-KR")})`)
    .join("\n")}`;
  await logNewsUsage(policies.map((p) => p.id), "contract").catch(() => {});
}

// LLM 호출 시 courtContext + policyContext 모두 전달
courtContext: courtContext || "관련 판례 없음",
policyContext: policyContext || "관련 정책 없음",
```

### 5.3 시세전망 (`app/api/predict-value/route.ts`)

```typescript
import { getRecentPolicies, logNewsUsage } from "@/lib/news-query";

const marketPolicies = await getRecentPolicies(["규제지역", "대출규제", "공급정책"], 30);
// LLM 의견 생성 시 정책 컨텍스트 추가
```

---

## 6. 관리자 UI 설계

### 6.1 Admin 탭 추가

**파일**: `app/(app)/admin/page.tsx`

Tab 타입에 `"news"` 추가:

```typescript
type Tab = "overview" | ... | "news";

// tabs 배열에 추가
{ key: "news", label: "뉴스·정책" },
```

### 6.2 NewsTab 컴포넌트

**파일**: `components/admin/NewsTab.tsx`

```
┌─ 수집 현황 KPI 카드 (4개) ────────────────────────────┐
│  [오늘 수집]  [이번 주]  [전체]  [마지막 수집]           │
└───────────────────────────────────────────────────────┘

┌─ 정책 변경 알림 ──────────────────────────────────────┐
│  isAlert && !alertAcked 인 항목 표시                    │
│  [확인] 버튼 → PATCH /api/admin/news/alerts/[id]       │
└───────────────────────────────────────────────────────┘

┌─ 데이터 목록 테이블 ──────────────────────────────────┐
│  필터: 카테고리 드롭다운 + 태그 드롭다운 + 검색 입력    │
│  컬럼: 제목 | 출처 | 카테고리 | 태그 | 발행일 | 활용    │
│  [지금 수집] 버튼 → POST /api/admin/news/collect       │
│  각 행 [삭제] → DELETE /api/admin/news/[id]            │
│  페이지네이션                                          │
└───────────────────────────────────────────────────────┘

┌─ 활용 통계 ───────────────────────────────────────────┐
│  주간 활용 횟수 (chat / contract / prediction)         │
│  간단한 BarChart (Recharts 재사용)                      │
└───────────────────────────────────────────────────────┘
```

---

## 7. Vercel Cron 등록

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/registry-monitor", "schedule": "0 9 * * *" },
    { "path": "/api/cron/fraud-import", "schedule": "0 3 * * 1" },
    { "path": "/api/cron/news-collector", "schedule": "0 6 * * *" }
  ]
}
```

---

## 8. 구현 순서

| 순서 | 파일 | 작업 | 의존성 |
|------|------|------|--------|
| 1 | `prisma/schema.prisma` | NewsArticle + NewsUsageLog 모델 추가 | 없음 |
| 2 | DB migration | `npx prisma migrate dev` | 1 |
| 3 | `lib/news-tagger.ts` | 키워드 분류 규칙 (태그·알림 판정) | 없음 |
| 4 | `lib/news-collector.ts` | RSS 파싱 + 수집 엔진 | 1, 3 |
| 5 | `lib/news-query.ts` | 조회 유틸 + 활용 로그 | 1 |
| 6 | `app/api/cron/news-collector/route.ts` | Cron 엔드포인트 | 4 |
| 7 | `app/api/chat/route.ts` | 뉴스 컨텍스트 주입 | 5 |
| 8 | `app/api/analyze-contract/route.ts` | 정책 컨텍스트 주입 | 5 |
| 9 | `app/api/predict-value/route.ts` | 정책 컨텍스트 주입 | 5 |
| 10 | `app/api/news/route.ts` | 뉴스 조회 API | 5 |
| 11 | `app/api/admin/news/*` | 관리자 API 6개 | 5 |
| 12 | `components/admin/NewsTab.tsx` | 관리자 UI | 11 |
| 13 | `app/(app)/admin/page.tsx` | 탭 추가 | 12 |
| 14 | `vercel.json` | Cron 등록 | 6 |

---

## 9. 에러 처리

| 상황 | 대응 |
|------|------|
| RSS 피드 접속 불가 | 해당 피드 skip, 다른 피드 계속 수집, console.warn |
| RSS XML 파싱 실패 | 해당 피드 skip, errors 배열에 기록 |
| DB 저장 실패 (unique violation) | 중복으로 카운트, skip |
| Cron 전체 실패 | 500 반환 + console.error |
| 뉴스 조회 실패 (AI 주입 시) | 빈 컨텍스트로 진행 (graceful) |

---

## 10. 테스트 체크리스트

- [ ] RSS 피드 파싱 정상 동작
- [ ] 중복 URL 저장 방지
- [ ] 키워드 태그 분류 정확도
- [ ] 정책 변경 알림 감지
- [ ] AI 어시스턴트에 뉴스 컨텍스트 포함 확인
- [ ] 관리자 탭 정상 렌더링
- [ ] 수동 수집 트리거 동작
- [ ] 알림 확인 처리
- [ ] 90일 초과 데이터 정리
