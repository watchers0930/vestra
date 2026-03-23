# 부동산 뉴스·정책 수집기 (News & Policy Collector) 기획서

> **Summary**: 부동산 뉴스와 정부 정책을 매일 자동 수집하여 AI 분석·상담 품질을 향상시키는 데이터 파이프라인
>
> **Project**: Vestra
> **Version**: 4.5.4
> **Author**: Watchers
> **Date**: 2026-03-23
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

부동산 관련 최신 뉴스와 정부 정책(국토부·기재부 보도자료)을 **하루 1회 자동 수집**하여 DB에 저장하고, AI 어시스턴트 답변·계약서 분석·시세전망 등에 최신 시장 컨텍스트를 반영한다.

### 1.2 Background

- 현재 AI 어시스턴트는 LLM 학습 데이터에만 의존 → 최신 정책·시장 동향 반영 불가
- 세무 시뮬레이션의 세율 파라미터가 하드코딩 → 정책 변경 시 수동 업데이트 필요
- 시세전망 분석 시 최신 규제(투기과열지구 지정/해제 등) 미반영
- 사용자가 "요즘 부동산 시장 어때?" 같은 질문에 실시간 답변 불가

### 1.3 Goals

| 목표 | 측정 기준 |
|------|----------|
| 뉴스 수집 자동화 | 매일 06:00 Cron 실행, 10~30건 수집 |
| 정책 수집 자동화 | 국토부·기재부 보도자료 신규분 감지 |
| AI 답변 품질 향상 | 최신 뉴스/정책 인용 가능 |
| 정책 변경 알림 | 세율·규제 변경 감지 시 관리자 알림 |

### 1.4 Non-Goals (하지 않을 것)

- 유튜브, SNS 등 비정형 소스 수집
- 뉴스 전문(full-text) 저장 (저작권 이슈 → 제목+요약+링크만)
- 세금 계산 파라미터 자동 변경 (감지 → 알림 → 수동 반영)
- 실시간 스트리밍 수집 (하루 1회 배치로 충분)

---

## 2. Data Sources

### 2.1 부동산 뉴스

| 소스 | 방식 | 데이터 |
|------|------|--------|
| 네이버 뉴스 RSS | `https://news.google.com/rss/search?q=부동산` 또는 네이버 뉴스 검색 API | 제목, 요약, URL, 발행일 |
| 한국경제·매경 등 경제지 RSS | RSS 피드 파싱 | 제목, 요약, URL, 발행일 |

**수집 키워드**: 부동산, 전세, 아파트, 분양, 재건축, 규제지역, 대출규제, 취득세, 양도세, 종부세, DSR, LTV

### 2.2 정부 정책

| 소스 | 방식 | 데이터 |
|------|------|--------|
| 국토교통부 보도자료 | RSS/크롤링 `molit.go.kr` | 제목, 요약, URL, 발행일 |
| 기획재정부 보도자료 | RSS/크롤링 `moef.go.kr` | 제목, 요약, URL, 발행일 |
| 국세청 공지 | RSS `nts.go.kr` | 세법 변경 관련 |

**정책 분류 태그**: `세율변경`, `규제지역`, `대출규제`, `공급정책`, `전세대책`, `기타`

---

## 3. Architecture

### 3.1 수집 파이프라인

```
[Vercel Cron] 매일 06:00
      ↓
[/api/cron/news-collector]
      ↓
  ┌───────────────────┐
  │ 1. RSS/API 호출    │
  │ 2. 중복 제거       │  ← URL 기준 dedup
  │ 3. 키워드 기반 분류 │  ← 정규식 매칭으로 태그 부여 (LLM 미사용)
  │ 4. DB 저장         │  ← Prisma → Neon PostgreSQL
  │ 5. 정책 변경 감지   │  ← 세율/규제 키워드 매칭
  │ 6. 관리자 알림      │  ← 변경 감지 시 DB 알림 레코드 생성
  └───────────────────┘
```

### 3.2 활용 경로

```
[AI 어시스턴트]
  → 시스템 프롬프트에 최근 7일 뉴스/정책 요약 주입
  → "최근 부동산 동향" 질문 시 실제 뉴스 인용

[계약서 분석]
  → 관련 정책 변경사항 참조하여 aiOpinion 보강

[시세전망]
  → 규제지역 변경, 대출규제 변경 시 예측 모델 컨텍스트 반영

[관리자 대시보드]
  → 수집 현황, 정책 변경 알림 표시
```

### 3.3 DB 스키마

```prisma
model NewsArticle {
  id          String   @id @default(cuid())
  title       String                        // 뉴스 제목
  summary     String   @db.Text             // RSS 제공 요약 (원문 그대로)
  url         String   @unique              // 원문 링크 (중복 방지)
  source      String                        // 출처 (네이버, 국토부 등)
  category    String                        // news | policy
  tags        String[]                      // 키워드 매칭 태그
  policyType  String?                       // 정책분류 (세율변경, 규제지역 등)
  publishedAt DateTime                      // 원문 발행일
  collectedAt DateTime @default(now())      // 수집일
  isAlert     Boolean  @default(false)      // 정책변경 알림 여부
  usageLogs   NewsUsageLog[]

  @@index([category, publishedAt(sort: Desc)])
  @@index([isAlert])
}
```

---

## 4. API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/cron/news-collector` | Vercel Cron 트리거 (수집 실행) |
| `GET` | `/api/news` | 최근 뉴스/정책 목록 조회 (페이지네이션) |
| `GET` | `/api/news/alerts` | 정책 변경 알림 목록 |

---

## 5. AI 연동 방식

### 5.1 AI 어시스턴트 컨텍스트 주입

```typescript
// chat/route.ts에 추가
const recentNews = await getRecentNews(7); // 최근 7일
const newsContext = recentNews.length > 0
  ? `\n\n[최근 부동산 동향 - ${new Date().toLocaleDateString('ko')} 기준]\n${
      recentNews.map(n => `- [${n.source}] ${n.title} (${n.publishedAt})`).join('\n')
    }\n위 뉴스를 참고하여 최신 동향 기반으로 답변하세요.`
  : "";

const systemPrompt = CHAT_SYSTEM_PROMPT + courtContext + newsContext;
```

### 5.2 정책 변경 감지 로직

```typescript
const POLICY_ALERT_KEYWORDS = {
  세율변경: ['취득세율', '양도세율', '종부세율', '세율 인상', '세율 인하', '세제 개편'],
  규제지역: ['투기과열지구', '조정대상지역', '규제지역 지정', '규제지역 해제'],
  대출규제: ['LTV', 'DTI', 'DSR', '대출 규제', '대출 한도'],
  전세대책: ['전세사기', '전세보증', '임대차보호법', '전세보호'],
};
```

---

## 6. 비용 분석

| 항목 | 일일 비용 | 월 비용 |
|------|----------|--------|
| RSS 파싱 | 무료 | 무료 |
| 키워드 기반 분류 | 무료 (서버사이드 정규식) | 무료 |
| Neon DB 저장 | 무시 가능 | 무시 가능 |
| Vercel Cron | Hobby 플랜 포함 | 무료 |
| **합계** | **$0** | **$0** |

---

## 7. 구현 우선순위

| 순서 | 작업 | 난이도 | 영향도 |
|------|------|--------|--------|
| 1 | Prisma 스키마 추가 + 마이그레이션 | 낮음 | 기반 |
| 2 | RSS 수집 라이브러리 (`lib/news-collector.ts`) | 중간 | 핵심 |
| 3 | Cron API Route (`/api/cron/news-collector`) | 중간 | 핵심 |
| 4 | AI 어시스턴트 컨텍스트 주입 | 낮음 | 높음 |
| 5 | 뉴스 조회 API (`/api/news`) | 낮음 | 보조 |
| 6 | 정책 변경 감지 + 관리자 알림 | 중간 | 높음 |
| 7 | vercel.json Cron 등록 | 낮음 | 핵심 |

---

## 8. 관리자 대시보드

### 8.1 뉴스·정책 관리 탭 (`/admin?tab=news`)

관리자 페이지에 "뉴스·정책" 탭을 추가하여 수집 현황과 활용 내역을 확인할 수 있도록 한다.

#### 화면 구성

```
┌─────────────────────────────────────────────────────┐
│ [수집 현황]                                          │
│  오늘 수집: 23건 (뉴스 18 / 정책 5)                   │
│  이번 주: 142건 | 전체: 1,847건                       │
│  마지막 수집: 2026-03-23 06:00:12                     │
├─────────────────────────────────────────────────────┤
│ [정책 변경 알림]  🔴 2건 미확인                        │
│  ─ 취득세율 변경 (기재부, 2026-03-22)    [확인]        │
│  ─ 조정대상지역 해제 (국토부, 2026-03-21) [확인]       │
├─────────────────────────────────────────────────────┤
│ [수집 데이터 목록]                     [필터 ▼] [검색] │
│  카테고리: [전체|뉴스|정책]  태그: [세율변경|규제|...]   │
│                                                      │
│  제목              출처    카테고리  태그     활용 현황  │
│  ─────────────────────────────────────────────────── │
│  "2026 취득세율..."  기재부  정책    세율변경  AI상담 3회│
│  "강남 재건축..."   한경    뉴스    재건축    시세전망 1회│
│  "전세사기 예방..."  국토부  정책    전세대책  계약분석 2회│
│                                      [1] [2] [3] ... │
├─────────────────────────────────────────────────────┤
│ [활용 통계]                                           │
│  AI 어시스턴트 인용: 47회/주                           │
│  계약서 분석 참조: 12회/주                             │
│  시세전망 반영: 8회/주                                 │
└─────────────────────────────────────────────────────┘
```

#### 주요 기능

| 기능 | 설명 |
|------|------|
| 수집 현황 카드 | 오늘/주간/전체 수집 건수, 마지막 수집 시간 |
| 정책 변경 알림 | 미확인 알림 표시, 관리자 확인 처리 |
| 데이터 목록 | 카테고리·태그 필터, 검색, 페이지네이션 |
| 활용 현황 | 각 뉴스가 AI 답변·분석에 몇 회 인용되었는지 추적 |
| 수동 수집 | [지금 수집] 버튼으로 즉시 Cron 트리거 |
| 삭제 | 잘못 수집된 데이터 수동 삭제 |

### 8.2 활용 추적 (Usage Tracking)

뉴스/정책 데이터가 실제로 어디에 사용되었는지 추적하기 위해 `NewsUsageLog` 테이블을 추가한다.

```prisma
model NewsUsageLog {
  id          String   @id @default(cuid())
  articleId   String                        // NewsArticle.id
  usedIn      String                        // 사용처: chat | contract | prediction
  sessionId   String?                       // 사용자 세션 (익명화)
  usedAt      DateTime @default(now())

  article     NewsArticle @relation(fields: [articleId], references: [id])

  @@index([articleId])
  @@index([usedIn, usedAt(sort: Desc)])
}
```

AI가 뉴스 데이터를 컨텍스트로 사용할 때마다 자동으로 로그를 남긴다.

### 8.3 API Endpoints (관리자)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/admin/news` | 수집 데이터 목록 (필터·페이지네이션) |
| `GET` | `/api/admin/news/stats` | 수집 현황 통계 |
| `GET` | `/api/admin/news/alerts` | 정책 변경 알림 목록 |
| `PATCH` | `/api/admin/news/alerts/[id]` | 알림 확인 처리 |
| `POST` | `/api/admin/news/collect` | 수동 수집 트리거 |
| `DELETE` | `/api/admin/news/[id]` | 데이터 삭제 |

---

## 9. 데이터 보존 정책

- **최근 90일** 데이터 유지
- 90일 초과 데이터는 월 1회 자동 삭제 (별도 Cron)
- 정책 변경 알림(`isAlert=true`)은 1년 보존

---

## 9. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| RSS 피드 구조 변경 | 파싱 실패 시 graceful fallback + 관리자 알림 |
| 뉴스 저작권 | 제목+요약(100자)+링크만 저장, 전문 미저장 |
| 수집 과다 | 일일 수집 건수 상한(50건) |
| 중복 수집 | URL unique constraint로 자동 방지 |
| 세율 자동 변경 위험 | 감지만 하고 변경은 관리자 수동 (Non-Goal 명시) |
