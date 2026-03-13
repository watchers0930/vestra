# predict-value Analysis Report

> **Analysis Type**: Gap Analysis (Design Intent vs Implementation)
>
> **Project**: VESTRA
> **Analyst**: gap-detector
> **Date**: 2026-03-12
> **Feature**: ML 학습관리 탭 + 도메인 용어 사전 시스템

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

ML 학습관리 탭과 도메인 용어 사전 시스템의 설계 의도 대비 구현 완성도를 검증한다.
별도 설계 문서 없이, 사용자 제공 설계 의도(Plan)를 기준으로 분석한다.

### 1.2 Analysis Scope

- **설계 기준**: 사용자 제공 설계 의도 (ML 학습관리 6개 항목 + 도메인 용어 사전 7개 항목)
- **구현 경로**: `app/api/admin/training-data/`, `app/api/admin/vocabulary/`, `components/admin/MlTrainingTab.tsx`, `lib/`
- **분석 파일**: 15개

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| ML 학습관리 탭 | 100% | PASS |
| 도메인 용어 사전 | 97% | PASS |
| 데이터 모델 | 100% | PASS |
| API 완성도 | 100% | PASS |
| UI 완성도 | 100% | PASS |
| **Overall** | **99%** | **PASS** |

---

## 3. ML 학습관리 탭 Gap Analysis

### 3.1 등기부등본 업로드 (PDF/TXT) -> 자동 파싱 -> 검수 -> JSONL 내보내기

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| PDF 업로드 | `training-data/route.ts:86-117` | PASS | multipart/form-data, PDF/TXT 분기 |
| TXT 업로드 | `training-data/route.ts:109-111` | PASS | file.text()로 직접 추출 |
| 자동 파싱 | `training-data/route.ts:131-147` | PASS | normalizeRegistryText + detectRegistryConfidence + parseRegistry |
| 관리자 검수 (human-in-the-loop) | `training-data/[id]/route.ts:30-78` | PASS | PUT: status/parsedData/reviewNotes 수정 |
| JSONL 내보내기 | `training-data/export/route.ts` | PASS | 승인된 데이터 -> classification/NER/structure 3형식 JSONL |
| 리뷰 패널 UI | `MlTrainingTab.tsx:615-689` | PASS | 원문(복호화) + JSON 편집 + 상태 변경 버튼 |

### 3.2 AES-256-GCM 암호화 저장

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| AES-256-GCM 알고리즘 | `lib/crypto.ts:19` | PASS | `ALGORITHM = "aes-256-gcm"` |
| 암호화 저장 | `training-data/route.ts:150` | PASS | `encryptPII(normalized)` |
| 복호화 조회 | `training-data/[id]/route.ts:24` | PASS | `decryptPII(item.rawTextEncrypted)` |
| 키 파생 | `lib/crypto.ts:34-36` | PASS | scryptSync + AUTH_SECRET + PII_SALT |
| IV/Tag 분리 저장 | `lib/crypto.ts:48-58` | PASS | iv(16) + tag(16) + ciphertext -> base64 |

### 3.3 SHA-256 중복 체크

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| SHA-256 해시 생성 | `lib/crypto.ts:93-98` | PASS | HMAC-SHA256 + AUTH_SECRET |
| 중복 검사 로직 | `training-data/route.ts:135-144` | PASS | rawTextHash unique 제약 + findUnique 검사 |
| DB unique 인덱스 | `schema.prisma:353` | PASS | `@@unique([rawTextHash])` |

### 3.4 KPI 통계

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 전체 수 | `training-data/route.ts:49` | PASS | `prisma.trainingData.count()` |
| 대기 수 | `training-data/route.ts:50` | PASS | `status: "pending"` |
| 승인 수 | `training-data/route.ts:52` | PASS | `status: "approved"` |
| 평균 신뢰도 | `training-data/route.ts:54` | PASS | `aggregate({ _avg: { confidence: true } })` |
| UI KPI 카드 | `MlTrainingTab.tsx:405-409` | PASS | 4개 KpiCard (전체/대기/승인/신뢰도) |

### 3.5 상태 필터

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| all 필터 | `training-data/route.ts:22` | PASS | `status !== "all"` 조건 |
| pending 필터 | API where 절 | PASS | |
| reviewed 필터 | API where 절 | PASS | |
| approved 필터 | API where 절 | PASS | |
| rejected 필터 | API where 절 | PASS | |
| UI 필터 버튼 | `MlTrainingTab.tsx:485-503` | PASS | 5개 상태 버튼 + 카운트 표시 |

### 3.6 리뷰 패널

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 원문 표시 (복호화) | `MlTrainingTab.tsx:632-636` | PASS | `reviewItem.rawText` pre-wrap 표시 |
| 파싱 JSON 편집 | `MlTrainingTab.tsx:640-647` | PASS | textarea + editedParsedJson 상태 |
| 상태 변경 | `MlTrainingTab.tsx:662-687` | PASS | 거부/검토완료/승인 3개 버튼 |
| 리뷰 노트 | `MlTrainingTab.tsx:651-658` | PASS | textarea + reviewNotes 저장 |

---

## 4. 도메인 용어 사전 Gap Analysis

### 4.1 DomainVocabulary DB 모델

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| term unique | `schema.prisma:372` | PASS | `@@unique([term])` |
| 4 카테고리 | `schema.prisma:365` | PASS | `registry_right`, `legal_action`, `structure`, `finance_tax` |
| source 필드 | `schema.prisma:366` | PASS | `@default("manual")` -- manual / auto_extracted |
| frequency 필드 | `schema.prisma:367` | PASS | `Int @default(1)` |
| definition 필드 | `schema.prisma:368` | PASS | `String? @db.Text` |
| category 인덱스 | `schema.prisma:373` | PASS | `@@index([category])` |

### 4.2 초기 시드 데이터

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 시드 건수 | `lib/domain-vocabulary.ts:34-98` | WARN | 설계 56건 vs 구현 54건 (2건 부족) |
| 카테고리 분포 | `lib/domain-vocabulary.ts` | PASS | 4개 카테고리 골고루 분포 |
| registry-parser 기반 | `lib/domain-vocabulary.ts` | PASS | GAPGU_RISK_MAP + EULGU_RISK_MAP 키워드 포함 |
| 시드 API | `vocabulary/seed/route.ts` | PASS | POST upsert 방식 일괄 등록 |
| 시드 UI 버튼 | `MlTrainingTab.tsx:700-706` | PASS | "초기 시드" 버튼 + 로딩 상태 |

### 4.3 자동 용어 추출

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| extractVocabularyFromParsed 함수 | `lib/domain-vocabulary.ts:103-167` | PASS | ParsedRegistry + rawText 입력 |
| 갑구/을구 purpose 추출 | `lib/domain-vocabulary.ts:119-124` | PASS | registry_right 카테고리 자동 분류 |
| 금융/세무 패턴 매칭 | `lib/domain-vocabulary.ts:127-138` | PASS | 18개 패턴 |
| 부동산 구조 패턴 매칭 | `lib/domain-vocabulary.ts:141-151` | PASS | 13개 패턴 |
| 법률 행위 패턴 매칭 | `lib/domain-vocabulary.ts:154-164` | PASS | 18개 패턴 |
| 업로드 시 자동 호출 | `training-data/route.ts:152-160` | PASS | upsert + frequency increment |

### 4.4 수동 추가/수정/삭제

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 수동 추가 (POST) | `vocabulary/route.ts:58-90` | PASS | term+category 필수, upsert |
| 수정 (PUT) | `vocabulary/[id]/route.ts:6-33` | PASS | category, definition 수정 |
| 삭제 (DELETE) | `vocabulary/[id]/route.ts:37-54` | PASS | 존재 확인 후 삭제 |
| 추가 UI 폼 | `MlTrainingTab.tsx:748-780` | PASS | 용어/카테고리/설명 입력 |
| 인라인 수정 UI | `MlTrainingTab.tsx:841-857` | PASS | 편집 모드 토글 |
| 삭제 UI 버튼 | `MlTrainingTab.tsx:897` | PASS | Trash2 아이콘 |

### 4.5 카테고리별 진행 바

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 등기권리 target 200+ | `lib/domain-vocabulary.ts:20` | PASS | `target: 200` |
| 법률행위 target 150+ | `lib/domain-vocabulary.ts:21` | PASS | `target: 150` |
| 부동산구조 target 100+ | `lib/domain-vocabulary.ts:22` | PASS | `target: 100` |
| 금융세무 target 100+ | `lib/domain-vocabulary.ts:23` | PASS | `target: 100` |
| 진행 바 UI | `MlTrainingTab.tsx:719-744` | PASS | 4개 카테고리 + pct% + 색상 분기 |
| 카테고리별 카운트 API | `vocabulary/route.ts:34-41` | PASS | 4개 카테고리 count 쿼리 |

### 4.6 vocab.txt 내보내기

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| vocab.txt 생성 | `vocabulary/export/route.ts` | PASS | term만 줄바꿈 구분 |
| Content-Disposition | `vocabulary/export/route.ts:28` | PASS | `vestra-vocab-{date}.txt` |
| KR-BERT 토크나이저 호환 | `vocabulary/export/route.ts:23` | PASS | 용어 목록 plain text |
| UI 다운로드 버튼 | `MlTrainingTab.tsx:707-714` | PASS | blob 다운로드 |

### 4.7 카테고리 필터 + 검색

| 요구사항 | 구현 위치 | Status | 상세 |
|----------|-----------|:------:|------|
| 카테고리 필터 API | `vocabulary/route.ts:20` | PASS | `category` 파라미터 |
| 검색 API | `vocabulary/route.ts:21` | PASS | `term contains search` |
| 필터 UI | `MlTrainingTab.tsx:783-814` | PASS | 5개 필터 버튼(전체+4카테고리) + 카운트 |
| 검색 UI | `MlTrainingTab.tsx:807-813` | PASS | 검색 input |

---

## 5. 데이터 모델 검증

### 5.1 TrainingData 모델

| 필드 | 설계 의도 | 구현 | Status |
|------|-----------|------|:------:|
| id | PK | `@id @default(cuid())` | PASS |
| rawTextEncrypted | AES-256-GCM 암호화 | `String @db.Text` | PASS |
| rawTextHash | SHA-256 중복 체크 | `String @@unique` | PASS |
| parsedData | ParsedRegistry JSON | `Json?` | PASS |
| status | pending/reviewed/approved/rejected | `String @default("pending")` | PASS |
| reviewNotes | 검수 메모 | `String? @db.Text` | PASS |
| sourceFileName | 파일명 | `String` | PASS |
| sourceType | pdf/text/image | `String` | PASS |
| confidence | 신뢰도 0-100 | `Int @default(0)` | PASS |
| charCount | 글자 수 | `Int @default(0)` | PASS |
| gapguCount | 갑구 항목 수 | `Int @default(0)` | PASS |
| eulguCount | 을구 항목 수 | `Int @default(0)` | PASS |
| status 인덱스 | 필터 성능 | `@@index([status])` | PASS |
| createdAt 인덱스 | 정렬 성능 | `@@index([createdAt])` | PASS |

### 5.2 DomainVocabulary 모델

| 필드 | 설계 의도 | 구현 | Status |
|------|-----------|------|:------:|
| id | PK | `@id @default(cuid())` | PASS |
| term | unique 용어 | `String @@unique([term])` | PASS |
| category | 4 카테고리 enum | `String` | PASS |
| source | manual/auto_extracted | `String @default("manual")` | PASS |
| frequency | 등장 빈도 | `Int @default(1)` | PASS |
| definition | 용어 설명 | `String? @db.Text` | PASS |
| category 인덱스 | 필터 성능 | `@@index([category])` | PASS |

---

## 6. API 엔드포인트 검증

| Endpoint | Method | 설계 | 구현 | Status |
|----------|--------|:----:|:----:|:------:|
| `/api/admin/training-data` | GET | O | O | PASS |
| `/api/admin/training-data` | POST | O | O | PASS |
| `/api/admin/training-data/[id]` | GET | O | O | PASS |
| `/api/admin/training-data/[id]` | PUT | O | O | PASS |
| `/api/admin/training-data/[id]` | DELETE | O | O | PASS |
| `/api/admin/training-data/export` | GET | O | O | PASS |
| `/api/admin/vocabulary` | GET | O | O | PASS |
| `/api/admin/vocabulary` | POST | O | O | PASS |
| `/api/admin/vocabulary/[id]` | PUT | O | O | PASS |
| `/api/admin/vocabulary/[id]` | DELETE | O | O | PASS |
| `/api/admin/vocabulary/export` | GET | O | O | PASS |
| `/api/admin/vocabulary/seed` | POST | O | O | PASS |

전체 12개 엔드포인트 중 12개 구현 완료 (100%).

---

## 7. UI 컴포넌트 검증

| 구성 요소 | 설계 | 구현 | Status |
|-----------|:----:|:----:|:------:|
| KPI 통계 카드 (4개) | O | `MlTrainingTab.tsx:405-409` | PASS |
| 파일 드래그앤드롭 업로드 | O | `MlTrainingTab.tsx:421-451` | PASS |
| 텍스트 직접 입력 | O | `MlTrainingTab.tsx:454-469` | PASS |
| 상태 필터 버튼 그룹 | O | `MlTrainingTab.tsx:485-503` | PASS |
| 데이터 테이블 (8컬럼) | O | `MlTrainingTab.tsx:520-589` | PASS |
| 페이지네이션 | O | `MlTrainingTab.tsx:593-611` | PASS |
| 리뷰 패널 (원문+JSON) | O | `MlTrainingTab.tsx:615-689` | PASS |
| JSONL 내보내기 버튼 | O | `MlTrainingTab.tsx:505-508` | PASS |
| 도메인 용어 사전 헤더 | O | `MlTrainingTab.tsx:692-716` | PASS |
| 카테고리 진행 바 (4개) | O | `MlTrainingTab.tsx:719-744` | PASS |
| 수동 추가 폼 | O | `MlTrainingTab.tsx:748-780` | PASS |
| 카테고리 필터 + 검색 | O | `MlTrainingTab.tsx:783-814` | PASS |
| 용어 테이블 (인라인 편집) | O | `MlTrainingTab.tsx:824-907` | PASS |
| vocab.txt 내보내기 버튼 | O | `MlTrainingTab.tsx:707-714` | PASS |
| 초기 시드 버튼 | O | `MlTrainingTab.tsx:700-706` | PASS |
| 탭 등록 (admin page) | O | `admin/page.tsx:563,1488` | PASS |

전체 16개 UI 구성 요소 중 16개 구현 완료 (100%).

---

## 8. Differences Found

### WARN: 시드 데이터 건수 차이 (Minor)

| 항목 | 설계 | 구현 | 영향도 |
|------|------|------|:------:|
| 초기 시드 건수 | 56건 | 54건 | Low |

**상세**: `SEED_VOCABULARY` 배열에 54개 항목이 정의되어 있으나 설계 의도는 56건이다. 2건 부족하나, 시드 데이터는 운영 과정에서 수동 추가 가능하므로 영향도는 낮다.

**카테고리별 시드 분포**:
- registry_right: 14건
- legal_action: 16건
- structure: 12건
- finance_tax: 12건
- 합계: 54건

---

## 9. 추가 구현 사항 (설계 X, 구현 O)

| 항목 | 구현 위치 | 설명 |
|------|-----------|------|
| JSONL 3형식 분류 | `lib/training-data-export.ts` | classification + NER + structure 3형식 동시 생성 |
| NER 엔티티 추출 | `lib/training-data-export.ts:75-126` | offset 기반 NER 라벨 자동 생성 |
| 텍스트 직접 입력 모드 | `training-data/route.ts:118-124` | JSON body 방식 직접 텍스트 등록 |
| 파일 크기 제한 | `training-data/route.ts:95-97` | 10MB 제한 |
| 스캔 PDF 감지 | `lib/pdf-parser.ts:115-138` | 텍스트 품질 평가로 스캔 PDF 구분 |
| PII 마스킹 유틸 | `lib/crypto.ts:106-119` | 사업자등록번호/이메일 마스킹 함수 |
| 정의(definition) 필드 | `schema.prisma:368` | 용어 설명 필드 (설계에 명시 없었으나 유용) |

---

## 10. Match Rate Summary

```
+-----------------------------------------------+
|  Overall Match Rate: 99%                       |
+-----------------------------------------------+
|                                                |
|  ML 학습관리 탭 (6개 요구사항)                 |
|    PASS: 6/6  ......................... 100%    |
|                                                |
|  도메인 용어 사전 (7개 요구사항)               |
|    PASS: 6/7, WARN: 1/7  .............. 97%   |
|    (시드 54건/56건 -- 2건 미달)                |
|                                                |
|  데이터 모델 (2개 모델, 19개 필드)             |
|    PASS: 19/19  ....................... 100%    |
|                                                |
|  API 엔드포인트 (12개)                         |
|    PASS: 12/12  ....................... 100%    |
|                                                |
|  UI 컴포넌트 (16개)                            |
|    PASS: 16/16  ....................... 100%    |
|                                                |
+-----------------------------------------------+
```

---

## 11. 결론

설계 의도 대비 구현 매치율 **99% (PASS)**.

13개 설계 요구사항 중 12개 완벽 구현, 1개 경미한 차이(시드 54건/56건).
API 12개 엔드포인트, UI 16개 구성 요소, DB 모델 19개 필드 모두 정확히 구현되었다.

추가로 설계에 명시되지 않은 유용한 기능(JSONL 3형식, NER 라벨링, 스캔 PDF 감지, PII 마스킹 등)이 구현되어 설계 의도를 초과 달성하였다.

### 권장 사항

| 우선순위 | 항목 | 설명 |
|:--------:|------|------|
| Low | 시드 2건 추가 | 56건 목표 달성을 위해 2개 용어 추가 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-12 | 초기 분석 | gap-detector |
