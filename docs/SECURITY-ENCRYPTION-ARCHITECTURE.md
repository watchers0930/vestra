# 베스트라 민감정보 보호 아키텍처 설계서 (근본 처리)

> 상태: **설계 (구현 전, 대장 승인 대기)** | 작성 2026-09-10
> 목적: 필드별 임기응변 암호화를 끝내고, 민감정보 보호를 키·범위·표면 3축에서 근본 재설계한다.
> 우선순위 원칙(CLAUDE.md): 보안 > 검증 > 구조/성능 > 편의. 각 단계는 백필·검증·배포를 분리하고 롤백 경로를 먼저 확보한다.

---

## 0. 배경 — 왜 근본 처리인가

위협 모델링(2026-09-10) 결과 현재 구조의 근본 문제 3가지:

1. **`AUTH_SECRET` 단일 마스터키** — 세션 JWE + PII 암호화 키 + SystemSetting(OAuth/PG) 복호화 + 검색 HMAC를 전부 지탱. 하나 유출 시 전면 붕괴. **로테이션 불가**(키 바꾸면 기존 암호문 전부 복호화 불능).
2. **필드별 임기응변 암호화** — `PII_FIELDS`에 생각날 때마다 추가하는 방식이라 사각지대 반복 발생(registryText 누락 사례). nested write/include·검색 필드는 구조적으로 처리 불가(signer*, clientEmail).
3. **접근 표면 방치** — 공개 Blob(세금서류·계약PDF) bearer URL, `/api` 인가가 라우트별 수기(중앙 강제 없음 → 신규 추가 시 회귀).

현재 암호화 코어(`lib/crypto.ts`): `AES-256-GCM`, 암호문 포맷 `base64(iv[16] + tag[16] + ciphertext)`, 키 `scrypt(AUTH_SECRET, PII_SALT, 32)`. `decryptPII`는 실패 시 원본 반환(평문 하위호환). 자동 적용은 `lib/prisma.ts` 확장(최상위 data write / 최상위 result read만).

---

## 1. 축 1 — 키 아키텍처 (위협모델 1위 리스크 해소)

### 목표
- PII 암호화 키를 `AUTH_SECRET`에서 **독립**시킨다.
- 암호문에 **키 버전 태그**를 붙여 **무중단 로테이션**을 가능하게 한다.

### 설계
**암호문 포맷 변경 (하위호환 유지)**
```
현재:  base64(iv+tag+ciphertext)                 # 버전 표기 없음 = "레거시(v1)"
신규:  "v2:" + base64(iv+tag+ciphertext)         # 키 버전 프리픽스
```
- `encryptPII`: 항상 최신 키(v2)로 암호화하고 `"v2:"` prefix 부여.
- `decryptPII`: prefix 파싱 → 해당 버전 키로 복호화. **prefix 없으면 레거시(v1: `scrypt(AUTH_SECRET, PII_SALT)`)로 시도** → 기존 데이터 무중단 호환. 그래도 실패하면 원본 반환(평문 호환 유지).
- 키 소스:
  - `v1` = `scrypt(AUTH_SECRET, PII_SALT)` (기존, 폐기 예정)
  - `v2` = `PII_ENCRYPTION_KEY` (신규 env, 독립 시크릿. 32바이트 base64 권장)
- 키 레지스트리를 코드에 상수 맵으로: `{ v1: deriveLegacy(), v2: deriveFromEnv("PII_ENCRYPTION_KEY") }`. 로테이션 = v3 추가 후 재암호화 → v1/v2 폐기.

**검색 키도 분리**
- `hashForSearch`의 HMAC 키를 `AUTH_SECRET` → 전용 `SEARCH_INDEX_KEY`로 분리(축 2 blind index와 연동).

### 마이그레이션
1. 코드에 v1/v2 키 레지스트리 + prefix 파서 도입, **신규 write부터 v2**. (구 데이터는 v1로 계속 읽힘)
2. 전 암호화 필드 **재암호화 백필**(v1 복호화 → v2 재암호화). 멱등: prefix가 `v2:`면 skip.
3. 재암호화 완료 확인 후 **v1 키(AUTH_SECRET 파생) 폐기** — 이후 AUTH_SECRET 유출로도 PII 복호화 불가.

### 위험·롤백
- 🔴 최대 위험: 재암호화 중 오류로 데이터 손상. → 백필 전 **DB 스냅샷 필수**, 비확장 클라이언트, 배치 커밋, 실패 시 재개 지점 기록. v2 복호화 실패해도 v1 fallback이 남아 있어 병행 기간 중엔 안전.
- 롤백: v2 도입 단계는 코드 되돌리면 v1로 복귀(구 데이터 무손상). v1 폐기는 **재암호화 100% 검증 후에만**.

---

## 2. 축 2 — 암호화 적용의 체계화 (사각지대 제로)

### 목표
- "무엇을 암호화하는가"를 전수 인벤토리로 **한 번에 확정**(임기응변 종료).
- nested write/include·검색 필드의 구조적 한계 제거.

### 설계
**(2-1) 민감 필드 전수 인벤토리** — 구현 1단계 산출물. `prisma/schema.prisma` 전체를 훑어 아래 분류표 확정:
- **암호화 대상 (기밀)**: 이미 완료(businessNumber·주소·clientPhone·알림전화·baselineData·documentText) + 추가 확정 후보:
  - 🟢 자동확장 즉시 가능: `Listing.registryText`, `LawyerPartner.phone/officePhone/bizNo/licenseNo`, `KeepzipCase.senderName/recipientName/address`
  - 🟡 nested 수동 필요: `EContractSignature.signerName/signerPhone/signerEmail`
  - 검토: `EContract.tenantEmail/brokerEmail`, `Listing.taxDocUrl/finalPdfUrl`(→ 축3), `AuditLog.ipAddress`, `PushSubscription.*`, `RegistryIssueOrder.ownerName/rawData`
- **해시(단방향)로 충분**: 이미 bcrypt(password)·SHA256(hash류) — 유지.
- **검색 필요 → blind index**: `AgentClient.clientName/clientEmail`(현재 평문 예외) 등.
- **평문 유지 정당**: 공개 데이터(공시가·시세), 표시 필수 최소 필드 — 근거를 인벤토리에 명시.

**(2-2) nested 처리** — 두 가지 옵션 중 택1(설계 확정 시 결정):
- 옵션 A(권장): `lib/prisma.ts` 확장을 **재귀 처리**로 강화 — `data.create`/`data.update`의 중첩과 `include` 결과까지 PII_FIELDS 적용. signer* 등이 자동 커버됨. 단 Prisma 확장 복잡도↑ → 충분한 테스트 필요.
- 옵션 B: nested 필드는 **서비스 계층 헬퍼**(`encryptEContractSignature()` 등)로 명시 암호화/복호화. 단순하지만 지점 누락 위험 → 인벤토리로 지점 고정 + 테스트.

**(2-3) blind index** — 검색 필요한 암호화 필드는 `xxxHash = hashForSearch(value)` 컬럼 병행 저장, `where: { xxxHash }`로 검색. 평문 컬럼 제거. (schema에 Hash 컬럼 추가 = DB 변경 → 별도 마이그레이션)

### 위험·롤백
- 🟡 옵션 A(재귀 확장)는 전 모델에 영향 → 광범위 회귀 테스트 필수. 문제 시 옵션 B로 축소.
- blind index는 schema 컬럼 추가라 DB 마이그레이션 절차(baseline/백업) 준수.

---

## 3. 축 3 — 접근 표면 봉쇄 (회귀 차단)

### 목표
- bearer URL·수기 인가의 구조적 취약성 제거.

### 설계
**(3-1) 민감 문서 Blob private화**
- 세금서류(`listings/[id]/tax-doc`)·계약 PDF(`finalPdfUrl`)·자격증(`licenseFileUrl`) → `access: "public"` 제거, **private Blob + 인가 프록시 라우트**(요청 시 소유권/당사자 확인 후 단기 서명 URL 발급) 경유.
- DB에는 URL 대신 **참조키(blob pathname)만** 저장 → DB 유출로도 직접 접근 불가.

**(3-2) API 인가 CI 게이트**
- `app/api/**`의 POST/PUT/PATCH/DELETE 핸들러 중 `auth()`/`withAdminAuth`/토큰검증이 없는 것을 **CI에서 자동 검출**해 빌드 실패시키는 스크립트(`scripts/audit-api-auth.ts`). CLAUDE.md의 "인증 없는 변이 핸들러" 체크리스트를 자동화.
- 미들웨어(`proxy.ts`)가 3경로만 보호하는 구조적 한계를 CI로 보완.

### 위험·롤백
- 🟡 Blob private화는 프론트 다운로드 경로 변경 → 기존 URL 사용처 전수 수정 필요. 단계적 전환(신규부터 private, 기존 URL 만료).

---

## 4. 통합 실행 순서 (무중단·단계 검증)

각 단계는 독립 배포 + 검증. 앞 단계가 안정 확인돼야 다음 진행.

| 단계 | 내용 | DB쓰기 | 위험 | 롤백 |
|------|------|--------|------|------|
| **S0** | 민감 필드 전수 인벤토리 확정(문서) | 없음 | 🟢 | - |
| **S1** | 키 버전 태깅 + v1/v2 병행 복호화 도입, 신규 write=v2, `PII_ENCRYPTION_KEY` 발급 | 없음(코드) | 🟢 | 코드 되돌림 |
| **S2** | 축2 자동확장 3그룹(registryText·LawyerPartner·KeepzipCase) + 백필 | 백필 | 🟢 | v1 fallback |
| **S3** | 전 암호화 필드 v1→v2 **재암호화 백필** | 백필 | 🟡 | 스냅샷 복원 |
| **S4** | nested 필드(signer*) 암호화(옵션 A/B) + 백필 | 백필 | 🟡 | 코드+백필 |
| **S5** | blind index 도입(검색필드), 평문 컬럼 제거 | 스키마 | 🟡 | 마이그레이션 롤백 |
| **S6** | Blob private화 + 인가 프록시 | - | 🟡 | 신규만 전환 |
| **S7** | API 인가 CI 게이트 | 없음 | 🟢 | - |
| **S8** | **v1 키(AUTH_SECRET 파생) 폐기** (S3 완료·검증 후) | 없음 | 🟢 | - |

> 빠른 보안 이득 순으로 S1→S2를 먼저 하면, 오늘까지의 사각지대 대부분이 검증된 안전 패턴으로 즉시 막히고, 그 뒤 S3~S8로 근본 완성.

---

## 5. 공통 백필 원칙 (모든 백필 단계)
- **비확장 base PrismaClient** 사용(이중 암호화 방지). `scripts/backfill-*.ts` 패턴.
- **멱등 판정**: v2 prefix면 skip / 평문(`decrypt===원본`)이면 암호화 / v1이면 재암호화.
- 배치(cursor) 처리, 진행 로그에 **원문 미출력**(PII 노출 금지).
- 실행 전 **DB 스냅샷**, 기본 dry-run → `--commit`, 대장 승인 후 실행.
- 순서: **코드 운영배포 → 백필** (배포 전 백필 시 구코드가 신포맷 복호화 못 함).

## 6. 필요한 신규 환경변수
- `PII_ENCRYPTION_KEY` (32B, PII 전용) — Vercel env, 운영/프리뷰 각각.
- `SEARCH_INDEX_KEY` (blind index HMAC 전용).
- (선택) `REGISTRY_SIGNING_SEED`는 기존 유지(무결성 서명용, 기밀성과 무관).

## 7. 미결정·확정 필요 (대장 결정)
1. nested 처리 옵션 A(재귀 확장) vs B(서비스 헬퍼) — 기본 권장 A, 리스크 크면 B.
2. blind index 도입 범위 — clientEmail만 vs 검색되는 모든 PII.
3. 키 관리 최종 형태 — env 시크릿 유지 vs 외부 KMS(장기).
4. S1~S8 전부 진행 vs 핵심(S1~S3, S8)만 우선.
