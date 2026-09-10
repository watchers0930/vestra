# 베스트라 민감정보 보호 아키텍처 설계서 (근본 처리)

> 상태: **S1~S8 완료 + 자기검증 하드닝 (v5.150.1) — 보안 아키텍처 개편 완결·견고화** | 작성 2026-09-10, 갱신 2026-09-10
> 잔여 후속(선택): SEARCH_INDEX_KEY 실제 분리(현재 AUTH_SECRET 폴백).
> ⏩ 다음 세션 착수점: 아래 **§8 진행 현황** 참조. 트리거 예: "베스트라 보안 아키텍처 S5(blind index)부터 이어서 하자"
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
- 🔴 **[필수] 백필 전 키 일치 검증**: 로컬 `PII_ENCRYPTION_KEY` == 운영·preview(`vercel env pull` 후) sha256 비교. **다르면 백필 금지**(로컬키로 암호화하면 운영이 복호화 못 함). 2026-09-10 이 검증 누락으로 전 PII 암호문 노출 장애 발생(§8 인시던트).
- 🔴 **[필수] 백필·배포 후 운영 실화면 검증**: 로컬 라운드트립 통과는 검증이 아님. 반드시 운영 앱에서 사람이 읽을 수 있게 복호화되는지 확인(로그인 필요 시 대장에게 요청).

## 6. 필요한 신규 환경변수
- `PII_ENCRYPTION_KEY` (32B, PII 전용) — Vercel env, 운영/프리뷰 각각.
- `SEARCH_INDEX_KEY` (blind index HMAC 전용).
- (선택) `REGISTRY_SIGNING_SEED`는 기존 유지(무결성 서명용, 기밀성과 무관).

## 7. 결정 완료 (2026-09-10 대장 확정)
1. **nested 처리 = 옵션 A(재귀 확장) 확정.** 옵션 B(서비스 헬퍼)는 "지점별 수동 = 임기응변 재발"이라 근본책 아님으로 철회.
   - read 재귀의 모델추론 문제는 **선언적 관계매핑**으로 해결: `RELATION_MODEL = { signatures: "EContractSignature", ... }`를 PII_FIELDS 옆에 단일 소스로 두고, include 결과의 nested 객체를 관계명→모델로 매핑해 재귀 복호화. (PII_FIELDS와 동급 체계)
2. blind index 범위 = **검색되는 PII만**(현재 clientName·clientEmail).
3. 키 관리 = **env 시크릿 유지**(외부 KMS는 장기 과제).
4. 범위 = **S1~S8 전부**, 단계적.

## 8. 진행 현황 (2026-09-10 세션)

### 완료 ✅
- **S1 키 버전 태깅** (v5.146.0 운영반영): `lib/crypto.ts`에 v1(레거시, prefix 없음, AUTH_SECRET 파생)/v2(`v2:` prefix, `PII_ENCRYPTION_KEY` 파생). `PII_ENCRYPTION_KEY` 있으면 신규 v2, 없으면 v1 폴백. 복호화는 prefix로 키 판별. **무중단 검증 완료**(v2 활성 중 v1·평문 모두 정상). `PII_ENCRYPTION_KEY`는 **Vercel Production/Preview + 로컬 .env.local에 설정 완료**(동일 값, 로컬=운영 키 확인됨).
- **S2 자동확장 3그룹** (v5.146.0): `PII_FIELDS`에 `Listing.registryText`, `LawyerPartner.[phone,officePhone,bizNo,licenseNo]`, `KeepzipCase.[senderName,recipientName,address]` 추가. `PII_FIELDS` export → 백필 단일 소스화.
- **S3 v1→v2 재암호화 백필**: `scripts/backfill-pii-encryption.ts`(PII_FIELDS 순회, 평문→v2·v1→v2·v2 skip 멱등, 비확장 클라, dry-run/`--commit`). **운영 58건 v2 정규화 완료·검증**(재실행 시 전량 v2 skip).

### 중요 발견 — orphaned 데이터 (방치 결정) ⚠️
- `RegistrySnapshot.encryptedData`(12건)·`TrainingData.rawTextEncrypted`(102건)는 `encryptPII`로 수동 암호화되지만 **PII_FIELDS 밖**이라 백필 대상 아니었음.
- 진단 결과 **로컬·운영 키 둘 다로 복호화 불가** = 과거 `AUTH_SECRET`/`PII_SALT` 로테이션으로 손상된 **복구 불능 orphaned**(기존부터 손상, 운영 앱도 이미 못 읽는 중). **재암호화 불가 → 방치 결정**. RegistrySnapshot 무결성 메타(머클·서명·섹션해시)는 유효, 신규 스냅샷은 v2로 정상.
- ⚠️ 교훈: S8(v1 폐기) 전 "encryptPII로 저장되는 모든 것이 v2인지" 확인 필요했고, 이 두 필드가 그 사각지대였음. 단 orphaned라 S8과 무관(이미 못 읽음).

### A2 (S4) 완료 ✅ — 전자계약 서명정보 nested 암호화 (v5.147.0 운영반영·백필완료 2026-09-10)
- **운영 반영·백필 완료**: v5.147.0 운영 승격 후 백필 `--commit` 실행 → `EContractSignature` 평문 **signerName 5 + signerEmail 5 = 10건 v2 정규화**(signerPhone·signerRrnPrefix는 기존 데이터 0건). 재실행 dry-run 전량 v2 skip·평문 0 확인(멱등 검증). 기존 58건은 그대로 v2 유지.

- **옵션 A(재귀 확장) 구현.** 순수 변환 로직을 `lib/pii-crypto-tree.ts`로 분리(PrismaClient 비의존 → 단위테스트 용이). `lib/prisma.ts`는 이걸 import해 확장에 배선하고 `PII_FIELDS`/`MODEL_RELATIONS` 재-export(백필 import 경로 유지).
  - `PII_FIELDS.EContractSignature = [signerName, signerPhone, signerEmail, signerRrnPrefix]` 추가. **signerRrnPrefix는 생년월일 포함이라 PII로 확정·포함**.
  - `MODEL_RELATIONS = { EContract:{signatures:"EContractSignature"}, EContractSignature:{contract:"EContract"} }` — 선언적 관계매핑(§7-1). PII 모델 도달 경로만 등록(정밀).
  - `encryptWriteTree(data, model)`: 스칼라 + nested write(create/createMany/update/updateMany/upsert/connectOrCreate) 재귀 암호화. `decryptReadTree(node, model, depth)`: 스칼라 + nested include 재귀 복호화(MAX_DEPTH=8 안전장치).
  - 확장 가드: `PII_FIELDS[model] || MODEL_RELATIONS[model]` — EContract는 PII 스칼라 없어도 관계 때문에 처리 대상.
- **커버된 지점**: nested write = `e-contracts/route.ts`(signatures.create 배열). 직접 top-level write(`sign/[token]/complete` update/create, `e-contracts/sign/[token]` updateMany)는 EContractSignature가 PII_FIELDS에 들어가며 기존 최상위 로직으로 자동 커버. nested read = pdf/keepzip cases·my-contracts/e-contracts sign(GET·PATCH)/sign complete — 전부 재귀 복호화로 커버. 교차의존 `KeepzipCase.recipientName ← signerName`은 복호화된 signerName→recipientName 재암호화로 라운드트립 정상.
- **검증**: `__tests__/pii-crypto-tree.test.ts` 17개(스칼라/nested create 배열·단일/update·upsert·createMany/nested include/깊은 include/라운드트립/교차의존/null안전) + 기존 전체 **1023 통과**. `tsc --noEmit` 클린(기존 api-sync-data 무관 에러 제외), lint 클린, `npm run build` 성공.
- **⚠️ 배포·백필 순서**: ①코드 test배포→대장 확인→운영 승격, ②운영 배포 **후** 백필 `scripts/backfill-pii-encryption.ts --commit`(PII_FIELDS 순회라 EContractSignature 4필드 자동 포함, 기존 평문 서명행 v2 정규화). 배포 전 백필 금지(구코드가 v2 복호화 못함). DB 스냅샷+대장 승인 후.

### S5 완료 ✅ — AgentClient 고객명·이메일 암호화 + 이메일 blind index (v5.148.0 운영반영·백필완료 2026-09-10)
- **하이브리드 방식 확정·구현**(대장 결정): clientName·clientEmail을 암호화하되, ①통합검색(부분매칭)은 **앱레벨 복호화 필터**, ②이메일 정확일치·중복체크·unique는 **blind index(clientEmailHash, HMAC)** 로 처리. 순수 blind index는 부분검색(contains) UX를 잃어서 부적합했음(통합 검색창이 name·email·address를 contains).
- **DB 스키마 변경**(db push, 운영반영): `AgentClient.clientEmailHash String?` 컬럼 추가 + `@@unique([agentId, clientEmail])` → `@@unique([agentId, clientEmailHash])` 이전 + `@@index([clientEmailHash])`. 암호문은 IV 랜덤이라 평문 email unique 불가 → hash로 이전 필수. migrate diff로 SQL 사전확인(컬럼추가+인덱스교체, 데이터 무손실), --accept-data-loss는 unique 추가 관용문구.
- **코드**: `lib/crypto.ts` `hashForSearch`에 `SEARCH_INDEX_KEY` 폴백(미설정 시 AUTH_SECRET → 기존 textHash 등 완전 호환, 실제 키분리는 재백필과 함께 후속). `PII_FIELDS.AgentClient`에 clientName·clientEmail 추가. `agent/clients/route.ts` GET=검색어 있으면 앱레벨 필터(agentId 스코프 로드→자동복호화→name·email·address 부분매칭→앱레벨 페이지네이션)·없으면 기존 DB 페이지네이션 / POST 중복체크·재활성화·create를 clientEmailHash 기반. `[id]/route.ts` PATCH 이메일수정 시 hash 동기화·소프트삭제 시 hash null.
- **백필**(운영, 6건): ①`backfill-agentclient-emailhash.ts --commit`(hash 채우기, decryptPII 기반이라 순서무관·멱등) → ②`backfill-pii-encryption.ts --commit`(clientName·clientEmail 암호화, PII_FIELDS 자동포함). 안전순서=hash먼저(실패해도 중복체크 정상). 검증: 재실행 전량 skip, **운영 6행 hash 전부 일치**(hashForSearch(decryptPII(email))===clientEmailHash) 확인 → 검색·중복체크 실동작 보장.
- 데이터 규모: AgentClient 6건·중개사 2명·중개사당 최대 5건 → 앱레벨 필터 성능 안전. 향후 규모 커지면 재검토.

### 🔴 인시던트 — PII_ENCRYPTION_KEY 로컬≠운영 (2026-09-10 발견·복구완료)
- **증상**: 운영 중개관리(agent/clients) 목록에서 고객명·이메일이 `v2:...` 암호문 그대로 노출. 실제로는 값 있는 **모든 v2 PII**(주소·서명자·사업자번호·전문가·내용증명 등)가 운영에서 복호화 실패 상태였음.
- **근본원인**: S1에서 "로컬=운영 키 동일 확인"이라 잘못 기록. 실제로는 로컬(`771b93…`)≠운영·preview(`c33d0f…`, 둘은 동일)로 처음부터 달랐다. 모든 백필을 로컬키로 실행 → 운영 앱은 운영키라 복호화 실패. AUTH_SECRET·PII_SALT는 일치해서 hash·세션·v1은 정상 → 로컬 스크립트 검증만으로는 안 드러났고, 운영 실화면을 안 봐서 A2·S5 3회 배포 내내 놓침.
- **전수진단**: PII_FIELDS 전량 + orphaned 확인 → 값 있는 v2는 전부 로컬키, 운영키 암호화 데이터 0건, 손상 0건, v1 데이터 0건. (orphaned 114건은 기존 손상, 무관)
- **복구**: 운영키 데이터가 0건이라 **무손실**. 운영·preview `PII_ENCRYPTION_KEY`를 로컬값으로 교체(`vercel env rm/add`) + 재배포. 데이터 무변경으로 전 PII 동시 복구. 운영 실화면에서 복호화·부분검색 실증.
- **재발방지**: §5에 "백필 전 키 sha 일치 검증" + "배포 후 운영 실화면 검증" 필수 원칙 추가.

### S6 완료 ✅ — 민감문서 private Blob + 인가 프록시 (v5.149.0~5.149.1 운영반영·실화면검증완료 2026-09-10)
- **범위 정정(규칙 0-2)**: 설계서가 지목한 3개 중 실제 public Blob 민감문서는 **재산세납부확인서뿐**. `finalPdfUrl`=온디맨드 라우트(`/api/e-contracts/[id]/pdf`, 이미 auth+당사자체크)·`licenseFileUrl`=dataURL(Blob아님)·`documentUrl`=미구현 → **대상 아님**. 조사 중 `safetyDocuments[].url`(등록시 temp-doc)도 public Blob이었고, 상세 GET(`/api/listings/[id]`)이 인증없이 전체필드 노출하던 취약점도 발견 → 함께 차단.
- **코드**(v5.149.0): `tax-doc`·`temp-doc` `put(access:"private")`, DB엔 공개URL 대신 pathname. 신규 `GET /api/listings/[id]/tax-doc` 인가 프록시(소유자만 `get(pathname,{access:"private"})` 스트리밍·no-store). 목록/상세 API에서 taxDocUrl·safetyDocuments url 제거(hasTaxDoc boolean+메타만). CertificationSection은 프록시 경로. 전체 1025 테스트 통과.
- 🔴 **인프라 발견(실화면검증)**: 업로드가 500 → 로그 확인 결과 **운영에 Vercel Blob store 자체가 미연결**(BLOB_READ_WRITE_TOKEN 없음). 즉 재산세·매물사진 등 **모든 Blob 업로드가 원래부터 불가**(사진 9건도 non-blob 외부 시드 URL, blob 실사용 0). 로컬만 믿었으면 또 놓칠 뻔(규칙 0-1이 잡음).
- **Blob store 2개 구성**(Vercel은 store 단위 access, private/public 혼용 불가):
  - `vestra-blob` (**Private**, Seoul) — 재산세. 런타임 OIDC+`BLOB_STORE_ID`로 인증(토큰 명시 안 함).
  - `vestra-photos` (**Public**, Seoul, env prefix `PHOTOS`) — 매물사진. `photos`·`temp-photo`가 `put({access:"public", token: process.env.PHOTOS_READ_WRITE_TOKEN})`로 이 store 지정.
  - 두 store 프로젝트 연결(대시보드 Connect) → `BLOB_*`(private)·`PHOTOS_*`(public) env 자동 주입. ⚠️ store 생성만으론 연결 안 됨(CLI는 미연결 store link 불가) → **대시보드 Connect Project 필수**.
- **실화면 검증 완료**: 재산세 업로드→소유자 프록시 다운로드(이미지 표시)→비인증 401 ✅. 매물사진 업로드→`*.public.blob.vercel-storage.com`(public store) 저장 확인 ✅. 테스트 데이터 정리 완료.

### S7 완료 ✅ — API 인가 CI 게이트 (v5.149.2 운영반영 2026-09-10)
- **전수 조사**: app/api route 139개 중 변이핸들러(POST/PUT/PATCH/DELETE) 보유 98개. 인증 래퍼 분포 auth 75·withAdminAuth 24·withAgentAuth 9. **인증신호 없는 변이핸들러 11건 전수 확인 → 전부 정당**(진짜 취약점 0): token 인증 2(sign/[token]·sign complete), CRON_SECRET 1(price-map DELETE), NextAuth 1, 의도적 공개+rate limit 7(chat·neighborhood·fraud-risk·jeonse/parse-registry·monitoring/parse-pdf·extract-pdf·landlord/report).
- **스크립트** `scripts/audit-api-auth.mjs`(순수 JS, node 실행 — tsx 의존 없이 Vercel 빌드에서도 안정): 변이핸들러 검출 → 인증신호(`auth()`/`withAdminAuth`/`withAgentAuth`/`CRON_SECRET`/`signToken`) 없고 ALLOWLIST에도 없으면 exit 1. 의도적 공개 8건만 사유와 함께 allowlist. stale allowlist(파일없음/이제 인증됨) 경고도 출력.
- **빌드 게이트**: `package.json` `prebuild`에 연결 → `npm run build`(로컬·Vercel 모두) 시 자동 실행. 미인증 변이핸들러 신규 추가 시 빌드 실패 → 회귀 차단. (`npm run audit:api`로 단독 실행도)
- **검증**: 현재 위반 0(139 route 통과), negative test(임시 미인증 POST → 검출·exit 1) 확인, 전체 1025 테스트 통과. 테스트 배포 시 Vercel 빌드 prebuild 게이트 실전 통과.

### S8 완료 ✅ — v1 키(AUTH_SECRET 파생) 폐기 (v5.150.0 운영반영 2026-09-10) · 위협모델 1위 해소
- **S8a 재확인**: PII_FIELDS 전량 + orphaned 재스캔 → **v1 암호문 0건**(전부 v2 또는 평문). 제거 안전 확인.
- **S8b 제거**: `lib/crypto.ts`에서 v1 경로 삭제. `encryptPII`는 항상 v2(`PII_ENCRYPTION_KEY` 필수), `decryptPII`는 `v2:` prefix만 복호화·없으면 평문 원본 반환(v1 AUTH_SECRET 복호화 시도 제거). `deriveKey`/`activeKeyVersion`에서 AUTH_SECRET 기반 제거. → **AUTH_SECRET이 유출돼도 PII 복호화 불가**(PII_ENCRYPTION_KEY 별도 필요).
- **검증**: 테스트 4파일 v2 키 설정 갱신(crypto·pii-crypto-tree·registry-blockchain beforeAll에 PII_ENCRYPTION_KEY, "PII_ENCRYPTION_KEY 없으면 에러"·"v2 prefix 없으면 평문 원본" 테스트 추가) → 전체 **1026 통과**. tsc/lint/build 클린. 새 crypto(v1제거판)로 **운영 v2 데이터 12건 복호화 성공** 확인. t-vestra 스모크 통과.
- ⚠️ 이후 `encryptPII`는 PII_ENCRYPTION_KEY 필수 — 운영·preview·로컬 모두 설정됨(누락 시 신규 PII 저장 에러). AUTH_SECRET은 세션(JWE)·hashForSearch 폴백에만 잔존.

### 자기검증 하드닝 ✅ — 병렬 코드리뷰 후속 수정 11건 (v5.150.1 운영반영 2026-09-10)
> S1~S8 완료 후 대장 지시로 오늘 작업 전체를 4개 병렬 리뷰어(적대적)로 자기검증 → 대충/땜빵 결함 다수 발견 → 수정 → 2개 병렬 재리뷰(회귀 없음 확인). 근본원인·재발방지는 글로벌 CLAUDE.md 규칙 0-5(견고성 4문: 규모·수명주기·비정상경로·적대적자문)로 명문화.

- **성능(규모)**: `lib/crypto.ts` `deriveKey`를 env 기준 메모이즈. scrypt는 무거운 KDF인데 목록 API가 행×PII필드마다 복호화→매번 재파생하면 요청당 수백~수천 회 scrypt. 캐시 식별자 `${k.length}:${k}\x00${salt}`(NUL 구분자로 경계 모호성 제거), env 변경 시 재파생(테스트·로테이션 안전).
- **견고성**: `pii-crypto-tree.ts` `encryptScalars`에 `!startsWith("v2:")` 가드(객체 재사용·재시도 이중암호화 차단), `encryptWriteTree` depth 가드+초과 시 경고(silent 누락→평문저장 방지).
- **파일검증(비정상경로)**: tax-doc·temp-doc·photos·temp-photo에 `validateMagicBytes`(MIME 위조 차단, 기존 표준 미적용분). `put`에 buffer+contentType.
- **수명주기**: `photos` DELETE가 DB만 지우던 것→실제 blob `del`(public URL 영구노출 방지). 매물 DELETE 시 연결 blob(재산세 private·사진 public·안전서류) 정리(고아 방지, best-effort).
- **store 오배치 방지**: photos/temp-photo에 `PHOTOS_READ_WRITE_TOKEN` 가드(누락 시 throw — private store 오유입 차단).
- **S5 정합**: `agent/clients/[id]` PUT 이메일 변경 시 중복체크(409)+저장 이메일 정규화(소문자·trim, hash 기준 일치), P2002→409(POST와 일관). POST 저장도 소문자.
- **관측성**: `decryptPII` catch에 실패 로그(프로세스당 상한 5회+error.name, 값·키 미출력 — hot path 폭주 방지).
- **CI 게이트 정밀화**: `audit-api-auth.mjs`에서 `signToken`(Prisma 컬럼명 substring 오탐) 신호 제거→sign 라우트 2개 ALLOWLIST 명시(현 allowlist 10건), route 확장자 `route.(ts|tsx|js|mjs)`.
- **테스트**: v2 prefix·GCM 변조 원본반환·이중암호화 가드·registry 실암호화(평문 아님) 검증 추가 → 전체 **1029 통과**. tsc/lint/build/audit 클린.
- ⚠️ 잔존 저심각(반영 보류): 레거시 공개 URL taxDocUrl(운영 0건이라 무관), webp 매직바이트 RIFF만 검사(기존 한계), "v2:"로 시작하는 사용자 평문 미암호화(현실성 극미). SEARCH_INDEX_KEY AUTH_SECRET 폴백은 아래 후속.

### 개편 완결 — 잔여 후속(선택)
- **SEARCH_INDEX_KEY 실제 분리** — 현재 blind index(clientEmailHash)·training textHash는 AUTH_SECRET 폴백. 전용 키로 분리하려면 env 추가 + 해당 hash 재백필 필요. AUTH_SECRET 유출 시에도 hash는 단방향이라 평문 복원 불가(우선순위 낮음).
