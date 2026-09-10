# 베스트라 민감정보 보호 아키텍처 설계서 (근본 처리)

> 상태: **S1~S3 + A2(S4) + S5(blind index) 완료·운영반영 (v5.148.0) / 다음 S6(Blob private)** | 작성 2026-09-10, 갱신 2026-09-10
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

### 남은 단계 (다음 세션)
- **S6 Blob private화** — 세금서류(`listings/[id]/tax-doc`)·계약PDF(`finalPdfUrl`)·자격증(`licenseFileUrl`) public Blob → private + 인가 프록시 라우트. DB엔 URL 대신 참조키(pathname). 기존 URL 사용처 전수 수정 필요(단계적 전환).
- **S7 API 인가 CI 게이트** — `scripts/audit-api-auth.ts`로 무인증 변이핸들러 빌드 검출.
- **S8 v1 키 폐기** (2단계): S8a 감지로그(운영 v1 접근 0 관찰) → S8b `lib/crypto.ts`에서 v1 복호화 경로 제거 → AUTH_SECRET 유출로도 PII 복호화 불가. PII_FIELDS는 전량 v2라 진행 가능.
- (후속) **SEARCH_INDEX_KEY 실제 분리** — env 추가 + textHash·clientEmailHash 재백필(현재는 AUTH_SECRET 폴백).
- **S5 blind index**(clientName·clientEmail) → **S6 Blob private**(tax-doc·finalPdfUrl·licenseFileUrl) → **S7 API 인가 CI 게이트**.
