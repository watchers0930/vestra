# 배포 및 인프라 (Deployment)

[coverage: medium -- 2 sources: docs/TECHNICAL-STATUS-REPORT.md, CLAUDE.md]

---

## Purpose

VESTRA의 프로덕션 배포 환경, Cron Jobs, CI/CD 설정.

---

## Architecture

```
[GitHub watchers0930/vestra]
         │
         │ git push (main)
         ↓
[Vercel CI/CD 자동 배포]
         │
         ├─ Next.js Serverless Functions (API Routes)
         ├─ Static/SSR 페이지 (CDN)
         └─ Edge Functions (middleware.ts)
         │
         ├─ [Neon PostgreSQL] 연결 풀링 (Prisma)
         ├─ [OpenAI API] 서버사이드 호출
         └─ [공공 API] MOLIT, 건축물대장, 대법원, BOK
```

---

## Deployment Config

| 항목 | 설정 |
|------|------|
| 플랫폼 | Vercel (Hobby) |
| 런타임 | Node.js Serverless + Edge (Middleware) |
| DB 호스팅 | Neon (Connection Pooling) |
| 도메인 | vestra-plum.vercel.app |
| GitHub | watchers0930/vestra |
| CI/CD | Git Push 트리거 자동 배포 |

---

## 환경 변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 인증 | 필수 |
| `DATABASE_URL` | Neon PostgreSQL (연결 풀링) | 필수 |
| `DIRECT_URL` | Neon 직접 연결 (마이그레이션 전용) | 필수 |
| `AUTH_SECRET` | NextAuth 시크릿 (미설정 시 서버 기동 불가) | 필수 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오 지도 SDK | 필수 |
| `MOLIT_API_KEY` | 국토교통부 공공데이터 | 필수 |
| `BOK_API_KEY` | 한국은행 ECOS API | 권장 |
| `LAW_API_KEY` | 대법원 판례 API (미설정 시 빈 배열) | 선택 |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth | 선택 |
| `KAKAO_CLIENT_ID/SECRET` | Kakao OAuth | 선택 |
| `NAVER_CLIENT_ID/SECRET` | Naver OAuth | 선택 |

---

## Cron Jobs

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 등기 모니터링 | 매일 09:00 | 감시 중인 부동산 등기 변동 확인 |
| 사기 데이터 수집 | 매주 월 03:00 | 전세사기 사례 데이터 자동 수집/갱신 |

---

## Commands

```bash
npm run dev           # 개발 서버 (localhost:3000)
npm run build         # 프로덕션 빌드 (--webpack 플래그)
npm run test          # Vitest 테스트 실행
npm run lint          # ESLint
npm run seed:fraud    # 전세사기 사례 시드 데이터
npm run seed:training # ML 학습 데이터 시드
```

---

## Database

- **DB**: Neon PostgreSQL (Serverless)
- **ORM**: Prisma 6.19.2
- **모델 수**: 25개
- **마이그레이션**: `DIRECT_URL`로 직접 연결 후 `prisma migrate deploy`
- **postinstall**: `prisma generate` 자동 실행

### DB 모델 카테고리

| 카테고리 | 모델 |
|----------|------|
| 인증 | Account, Session, VerificationToken |
| 사용자/분석 | User, Analysis, Asset, RateLimit, DailyUsage |
| 구독/결제 | Subscription, Payment, NotificationSetting |
| 모니터링 | MonitoredProperty, MonitoringAlert, Announcement |
| 검증/공유 | VerificationRequest, SharedReport, AuditLog |
| 사기/ML | FraudCase, TrainingData, DomainVocabulary, SystemSetting |

---

## 배포 스크립트 (대장님 환경)

```bash
deploy vestra   # ~/scripts/deploy.sh 사용 (npx vercel 직접 실행 금지)
# 계정: watchers0930 (vestra 전용)
# alias: vestra-plum.vercel.app 자동 갱신
```

---

## Key Decisions

- `npm run build`에 `--webpack` 플래그 사용 (Turbopack 비호환 패키지 대응)
- Neon Serverless 연결 풀링 사용 (Direct URL은 마이그레이션 전용으로 분리)
- Vercel Hobby 플랜 → 함수 실행 시간 제한 주의 (AI 분석: 최대 30초 허용)
- PWA: Serwist (`@serwist/next`) 적용 (서비스 워커 `app/sw.ts`)

---

## Gotchas

- Vercel Hobby: 최대 함수 실행 시간 60초 (AI 분석 API에서 타임아웃 위험)
- Neon DB 콜드 스타트: 첫 연결 시 지연 발생 가능 (연결 풀링으로 완화)
- `prisma generate`가 postinstall에 걸려 있어 배포 시 자동 실행됨
- 카카오 OAuth는 설정 진행 중 (완료 미확인)

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/CLAUDE.md`
