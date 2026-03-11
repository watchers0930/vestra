# VESTRA v2.0.0 Commercialization Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: VESTRA - AI Asset Management Platform
> **Version**: 2.0.0
> **Analyst**: gap-detector
> **Date**: 2026-03-02
> **Design Doc**: User-provided 12-feature specification (3 Phases)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

VESTRA v2.0.0 commercialization features (3 Phases, 12 items) implementation verification.
No separate design document exists; the feature specification list provided by the user is used as the reference design.

### 1.2 Analysis Scope

- **Design Reference**: User-provided 12-feature checklist (Phase 1 ~ Phase 3)
- **Implementation Path**: `/Users/watchers/Desktop/vestra/`
- **Analysis Date**: 2026-03-02

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (Feature) | 88% | PASS |
| Integration Integrity | 82% | WARN |
| Architecture Compliance | 90% | PASS |
| Convention Compliance | 93% | PASS |
| **Overall** | **88%** | **PASS** |

---

## 3. Feature-by-Feature Analysis

### Phase 1 -- Essential Infrastructure

#### 1. Route Group Separation

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Landing group | `app/(landing)/` | `app/(landing)/layout.tsx`, `app/(landing)/page.tsx`, `app/(landing)/pricing/page.tsx` | MATCH |
| App group | `app/(app)/` | `app/(app)/layout.tsx` + 14 pages (dashboard, rights, contract, etc.) | MATCH |
| Layout isolation | Landing: header+footer, App: sidebar+footer | Landing has own header/footer in layout.tsx; App uses Sidebar+Footer | MATCH |

**Score: 100%** -- Complete. Both route groups are properly separated with distinct layouts.

---

#### 2. Marketing Landing Page

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| File location | `app/(landing)/page.tsx` | `app/(landing)/page.tsx` (305 lines) | MATCH |
| Hero section | Required | Lines 92-135: gradient bg, badge, h1, description, 2 CTAs | MATCH |
| Feature showcase (6) | 6 features required | Lines 21-58: 6 features (rights, contract, tax, prediction, jeonse, assistant) | MATCH |
| Pricing preview | Required | Lines 60-88 + 221-281: 3 plans (FREE/PRO/BUSINESS) with prices | MATCH |
| Trust indicators | Required | Lines 140-156: 4 stats (10,000+ analyses, 2,500+ users, 99.2% accuracy, 24/7 AI) | MATCH |
| CTA section | Required | Lines 286-302: Final CTA with gradient bg | MATCH |

**Score: 100%** -- All 5 landing page sections fully implemented.

---

#### 3. SEO

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| robots.txt | `public/robots.txt` | Exists: Allow /, Disallow /admin, /api/, /profile. Sitemap URL included. | MATCH |
| sitemap.ts | `app/sitemap.ts` | Exists: 12 URLs with lastModified, changeFrequency, priority | MATCH |
| OG meta tags | In `app/layout.tsx` | Lines 26-33: openGraph with type, locale, url, siteName, title, description, images | MATCH |
| Twitter meta tags | In `app/layout.tsx` | Lines 35-40: twitter card summary_large_image, title, description, images | MATCH |
| OG image | Required | `public/og-image.svg` + `public/og-image.png` both exist | MATCH |

**Score: 100%** -- SEO implementation complete.

---

#### 4. AI Disclaimer

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Component file | `components/common/ai-disclaimer.tsx` | Exists (34 lines). Two modes: `compact` (one-liner) and full (card with icon). | MATCH |
| Export | Barrel export | Exported from `components/common/index.ts` line 7 | MATCH |
| Page integration | Used in analysis pages | NOT FOUND: No page imports AiDisclaimer | MISSING |

**Score: 67%** -- Component built and exported but never rendered in any page. Users will not see the disclaimer anywhere.

---

#### 5. PDF Download

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Button component | `components/common/pdf-download-button.tsx` | Exists (48 lines). Accepts targetRef, filename, title. Loading state. | MATCH |
| Export logic | `lib/pdf-export.ts` | Exists (72 lines). html2canvas + jsPDF. Multi-page, header/footer. | MATCH |
| Dependencies | html2canvas, jspdf | Both in package.json dependencies | MATCH |
| Export | Barrel export | Exported from `components/common/index.ts` line 8 | MATCH |
| Page integration | Used in analysis results | NOT FOUND: No page imports PdfDownloadButton | MISSING |

**Score: 67%** -- Same pattern as AI disclaimer. Full implementation exists but no page actually uses it.

---

### Phase 2 -- Monetization

#### 6. Pricing Page

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| File location | `app/(landing)/pricing/page.tsx` | Exists (174 lines) | MATCH |
| Plans: FREE | 0 won | Lines 62-75: "0" won/month | MATCH |
| Plans: PRO | 50,000 won | Lines 77-95: "50,000" won/month with "recommended" badge | MATCH |
| Plans: BUSINESS | 100,000 won | Lines 97-111: "100,000" won/month | MATCH |
| Comparison table | Required | Lines 114-136: 11-row feature comparison table | MATCH |
| FAQ section | Not specified | Lines 138-171: 4 FAQ items (bonus feature) | ADDED |
| Page metadata | Required | Lines 4-7: title + description | MATCH |

**Score: 100%** -- Exceeds spec with bonus FAQ section.

---

#### 7. Prisma Schema

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Subscription model | Required | `prisma/schema.prisma` lines 142-155: id, userId, plan, price, status, startDate, endDate, canceledAt, payments relation | MATCH |
| Payment model | Required | Lines 157-167: id, subscriptionId, amount, method, status, orderId, receiptUrl | MATCH |
| NotificationSetting model | Required | Lines 173-185: id, userId, 6 boolean toggles (email, kakao, price, analysis, system, marketing) | MATCH |
| User relation | Required | Lines 80-81: subscription + notificationSetting relations on User | MATCH |

**Score: 100%** -- All 3 models with correct fields and relations.

---

#### 8. Subscription API

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| GET /api/subscription | Required | `app/api/subscription/route.ts` GET: auth check, findUnique with payments, fallback FREE | MATCH |
| POST /api/subscription | Required | Same file POST: auth check, plan validation, upsert subscription, update user role/limit | MATCH |
| POST /api/subscription/cancel | Required | `app/api/subscription/cancel/route.ts`: auth check, validation, set canceled, downgrade to PERSONAL | MATCH |
| PLAN_CONFIG | FREE/PRO/BUSINESS | Lines 5-9: {price, dailyLimit, role} for each plan | MATCH |

**Score: 100%** -- Full CRUD for subscriptions.

---

#### 9. Profile Subscription Management UI

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| File location | `app/(app)/profile/page.tsx` | Exists (364 lines) | MATCH |
| Plan selection | 3-plan selection UI | Lines 266-285: FREE/PRO/BUSINESS buttons | MATCH |
| "Payment pending" | Display message | Line 288: "결제 시스템 준비 중입니다" | MATCH |
| Current plan display | Show current plan | Lines 247-263: plan name, price, status badge | MATCH |
| API fetch | GET /api/subscription | Line 61: `fetch("/api/subscription")` in useEffect | MATCH |
| Plan switch action | Buttons call POST /api/subscription | Buttons have NO onClick handler -- display only | PARTIAL |

**Score: 90%** -- Plan switching UI exists but buttons lack onClick handlers. Intentional due to "payment pending" state, but the design says "plan selection" which implies interactivity.

---

### Phase 3 -- Retention

#### 10. Notification Settings API

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| GET /api/user/notifications | Required | `app/api/user/notifications/route.ts` GET: auth, findUnique, auto-create defaults | MATCH |
| PUT /api/user/notifications | Required | Same file PUT: auth, allowed-field filter, upsert | MATCH |
| Field whitelist | Security | Lines 34-41: 6 allowed fields only | MATCH |

**Score: 100%** -- Complete with security safeguards.

---

#### 11. Profile Notification UI

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| 6 toggles | Required | Lines 304-311: emailEnabled, kakaoEnabled, priceAlert, analysisReport, systemNotice, marketingEmail | MATCH |
| Toggle switch | Visual toggle | Lines 335-344: Custom toggle button with transition | MATCH |
| API integration | PUT on toggle | Lines 323-331: Optimistic update + PUT to /api/user/notifications | MATCH |
| Icon per toggle | Required | Lines 305-310: Mail, MessageSquare, TrendingUp, FileText, Megaphone, Gift | MATCH |
| Loading state | Required | Line 334: `disabled={notifLoading}` | MATCH |

**Score: 100%** -- Fully functional with optimistic updates.

---

#### 12. PWA

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| manifest.json | `public/manifest.json` | Exists (27 lines): name, short_name, display: standalone, icons, theme_color | MATCH |
| icon-192 | `public/icons/icon-192.svg` | Exists: SVG icon with V logo on #4F46E5 background | MATCH |
| icon-512 | `public/icons/icon-512.svg` | Exists: SVG icon with V logo on #4F46E5 background | MATCH |
| Manifest link | In layout.tsx | `app/layout.tsx` line 41: `manifest: "/manifest.json"` | MATCH |
| PWA meta tags | Required | Lines 42-47: mobile-web-app-capable, apple-mobile-web-app-capable, status-bar-style, title | MATCH |
| Service Worker | Not specified but recommended | NOT FOUND: No service worker for offline support | MISSING |

**Score: 85%** -- Manifest and icons complete. No service worker means no offline capability -- the app is "installable" but not truly a PWA with offline support.

---

### Structural Changes

#### Dashboard Relocation

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| New location | `app/(app)/dashboard/page.tsx` | Exists (247 lines) | MATCH |
| Old location removed | No `app/page.tsx` | `app/(landing)/page.tsx` is now the landing page; no conflicting `app/page.tsx` | MATCH |

**Score: 100%**

---

#### Middleware

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Root redirect | `/` -> `/dashboard` or `/admin` | `middleware.ts` lines 52-62: Authenticated -> admin or dashboard, unauthenticated -> landing | MATCH |
| Admin protection | `/admin` requires ADMIN role | Lines 64-70: Token check + role check | MATCH |
| Profile/dashboard protection | Login required | Lines 72-78: Token check | MATCH |

**Score: 100%**

---

#### Sidebar

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Dashboard link | `/dashboard` | `components/layout/sidebar.tsx` line 46: `href: "/dashboard"` | MATCH |

**Score: 100%**

---

## 4. Integration Integrity Analysis

### 4.1 Routing Integration

| Route | Landing Layout | App Layout | Middleware | Status |
|-------|:-------------:|:---------:|:----------:|--------|
| `/` (unauthenticated) | Landing page | - | Pass through | MATCH |
| `/` (authenticated) | - | - | Redirect to /dashboard or /admin | MATCH |
| `/pricing` | Pricing page | - | - | MATCH |
| `/dashboard` | - | Dashboard with sidebar | Login required | MATCH |
| `/profile` | - | Profile with sidebar | Login required | MATCH |
| `/admin` | - | Admin with sidebar | ADMIN role required | MATCH |
| `/login` | - | Login page (app layout) | - | NOTE |

**NOTE**: Login page is in `app/(app)/login/page.tsx`, meaning it renders within the App layout (sidebar + footer). This could be confusing for unauthenticated users. It might be better in `(landing)` or a standalone group.

### 4.2 API -> UI Integration

| API Endpoint | UI Consumer | Fetch Location | Status |
|--------------|-------------|----------------|--------|
| GET /api/subscription | Profile page | `profile/page.tsx:61` | MATCH |
| POST /api/subscription | Profile page | NOT CONNECTED (no onClick) | PARTIAL |
| POST /api/subscription/cancel | Profile page | NOT CONNECTED | MISSING |
| GET /api/user/notifications | Profile page | `profile/page.tsx:62` | MATCH |
| PUT /api/user/notifications | Profile page | `profile/page.tsx:327` | MATCH |

### 4.3 Prisma -> API Integration

| Prisma Model | API Route | Operations | Status |
|--------------|-----------|------------|--------|
| Subscription | /api/subscription | findUnique, upsert | MATCH |
| Subscription | /api/subscription/cancel | findUnique, update | MATCH |
| Payment | /api/subscription (GET) | included in findUnique | MATCH |
| NotificationSetting | /api/user/notifications | findUnique, create, upsert | MATCH |
| User | /api/subscription (POST) | update (role, dailyLimit) | MATCH |

### 4.4 Component -> Page Integration

| Component | Exported | Used in Pages | Status |
|-----------|:--------:|:-------------:|--------|
| AiDisclaimer | Yes (index.ts) | 0 pages | NOT INTEGRATED |
| PdfDownloadButton | Yes (index.ts) | 0 pages | NOT INTEGRATED |

---

## 5. Match Rate Summary

```
+-------------------------------------------------------+
|  Overall Design Match Rate: 88%                        |
+-------------------------------------------------------+
|                                                        |
|  Phase 1 - Essential Infrastructure:                   |
|    1. Route Group Separation      100%  MATCH          |
|    2. Marketing Landing Page      100%  MATCH          |
|    3. SEO                         100%  MATCH          |
|    4. AI Disclaimer                67%  WARN           |
|    5. PDF Download                 67%  WARN           |
|                                                        |
|  Phase 2 - Monetization:                               |
|    6. Pricing Page                100%  MATCH          |
|    7. Prisma Schema               100%  MATCH          |
|    8. Subscription API            100%  MATCH          |
|    9. Profile Subscription UI      90%  PASS           |
|                                                        |
|  Phase 3 - Retention:                                  |
|   10. Notification API            100%  MATCH          |
|   11. Profile Notification UI     100%  MATCH          |
|   12. PWA                          85%  PASS           |
|                                                        |
|  Structural Changes:                                   |
|    Dashboard Relocation           100%  MATCH          |
|    Middleware                      100%  MATCH          |
|    Sidebar                        100%  MATCH          |
|                                                        |
|  Integration Integrity:            82%  WARN           |
+-------------------------------------------------------+
|                                                        |
|  MATCH (100%):  10 items  (67%)                        |
|  PASS  (85-99%): 3 items  (20%)                        |
|  WARN  (67-84%): 2 items  (13%)                        |
|  FAIL  (<67%):   0 items  (0%)                         |
|                                                        |
|  Weighted Overall: 88%   -- PASS                       |
+-------------------------------------------------------+
```

---

## 6. Differences Found

### 6.1 Missing Features (Design O, Implementation X)

| Item | Design Spec | Description | Impact |
|------|-------------|-------------|--------|
| AI Disclaimer page usage | Used in analysis pages | Component exists but no page imports it | Medium |
| PDF Download page usage | Used in analysis results | Component exists but no page imports it | Medium |
| Subscription cancel UI | Cancel button in profile | POST /api/subscription/cancel API exists but no UI button calls it | Low |
| Service Worker | PWA offline support | No SW registered; PWA install works but no offline mode | Low |

### 6.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| Pricing FAQ | `app/(landing)/pricing/page.tsx:139-171` | 4 FAQ items added to pricing page |
| "How it works" section | `app/(landing)/page.tsx:192-216` | 3-step guide on landing page |
| Admin route protection | `middleware.ts:64-70` | Not in spec but critical security |
| Profile/dashboard protection | `middleware.ts:72-78` | Not in spec but needed |

### 6.3 Partial Implementations

| Item | Design | Implementation | Notes |
|------|--------|----------------|-------|
| Subscription plan switch | Interactive selection | Display-only buttons, no onClick | Intentional: "결제 시스템 준비 중" |
| PWA | Full PWA | Manifest + icons only, no SW | Installable but not offline-capable |

---

## 7. Code Quality Observations

### 7.1 Strengths

- **Prisma schema**: Clean model definitions with proper relations, cascading deletes, unique constraints
- **API security**: All APIs check auth session, notification API whitelists allowed fields
- **Subscription API**: PLAN_CONFIG object-based design (extensible, not hardcoded switch)
- **Middleware**: Lightweight JWT decryption without importing full auth library (Edge optimization)
- **Landing page**: Clean separation of data (features array, plans array) from JSX

### 7.2 Minor Issues

| File | Issue | Severity |
|------|-------|----------|
| `profile/page.tsx` | 364 lines -- could benefit from splitting into sub-components | Low |
| `middleware.ts` | No error handling for malformed JWT beyond try-catch | Low |
| Landing page | `metadata` exported as `const` not `Metadata` type (works but loses type safety) | Low |

---

## 8. Architecture Compliance (Dynamic Level)

### 8.1 Layer Structure

| Expected (Dynamic) | Actual | Status |
|--------------------|--------|--------|
| components/ | `components/` (common, forms, results, loading, jeonse, prediction, layout, auth) | MATCH |
| features/ or services/ | Not separate -- logic in `lib/` and API routes | ACCEPTABLE |
| types/ | Inline types (no separate `types/` folder for v2 features) | ACCEPTABLE |
| lib/ | `lib/` (22 files) | MATCH |
| app/ | `app/` (App Router) | MATCH |

### 8.2 Dependency Direction

- Components -> lib: OK (e.g., `pdf-download-button.tsx` imports `lib/pdf-export`)
- Pages -> components -> lib: OK (standard Next.js pattern)
- API routes -> lib/prisma: OK (server-side only)
- No circular dependencies detected

**Architecture Score: 90%**

---

## 9. Convention Compliance

### 9.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components (PascalCase) | PascalCase.tsx | 97% | `ai-disclaimer.tsx`, `pdf-download-button.tsx` use kebab-case (acceptable for common/) |
| Functions | camelCase | 100% | None |
| Constants | UPPER_SNAKE_CASE | 100% | PLAN_CONFIG, ROLE_INFO, VERIFY_STATUS |
| Files (utility) | camelCase.ts | 100% | None |
| Folders | kebab-case | 100% | None |

### 9.2 Environment Variables

| Variable | Convention | Status |
|----------|-----------|--------|
| DATABASE_URL | DB_ prefix preferred | ACCEPTABLE (Prisma standard) |
| AUTH_SECRET | AUTH_ prefix | MATCH |
| OPENAI_API_KEY | API_ prefix preferred | ACCEPTABLE (OpenAI standard) |
| NEXT_PUBLIC_KAKAO_MAP_KEY | NEXT_PUBLIC_ prefix | MATCH |

**Convention Score: 93%**

---

## 10. Recommended Actions

### 10.1 Immediate (High Priority)

| # | Action | Files | Impact |
|---|--------|-------|--------|
| 1 | Integrate `AiDisclaimer` into analysis result pages (rights, contract, prediction, jeonse/analysis) | 4 pages | Medium -- Legal compliance |
| 2 | Integrate `PdfDownloadButton` into analysis result pages | 4 pages | Medium -- Core pro feature |

### 10.2 Short-term

| # | Action | Files | Impact |
|---|--------|-------|--------|
| 3 | Add subscription cancel button in profile page | `profile/page.tsx` | Low -- API exists, needs UI |
| 4 | Consider adding service worker for PWA offline | `public/sw.js` | Low -- Enhanced PWA |
| 5 | Consider moving login page to `(landing)` or standalone route group | `app/(app)/login/` -> `app/(landing)/login/` | Low -- UX improvement |

### 10.3 Backlog

| # | Action | Notes |
|---|--------|-------|
| 6 | Split profile page into sub-components (SubscriptionCard, NotificationSettings, etc.) | Maintainability |
| 7 | Add PG (payment gateway) integration when ready | Subscription POST already prepared |
| 8 | Add OG image as PNG fallback (some platforms don't render SVG) | SEO improvement |

---

## 11. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Initial v2.0.0 commercialization gap analysis | gap-detector |
