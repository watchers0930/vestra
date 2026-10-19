# PDF-only 신청 프론트엔드 교차검수

- 검토일: 2026-10-16
- 기준: `docs/02-design/features/pdf.design.md`, 사용자 제공 Platform Development Standard
- 대상: `git status --short`, `git diff HEAD`, 신규 미추적 파일 기준 프론트 변경분. `app/(personal-home)/renewal/monitoring/` 아래 TS/TSX 12개와 CSS 1개. 루트 `components/`, `hooks/`에는 변경 없음. staged 변경 없음.
- 방법: 변경 코드 및 호출부 정적 추적, 실제 서버 스키마·역할 저장·주문 실패 계약 대조, 관련 테스트·ESLint 실행. 서버 코드는 계약 확인 목적으로만 열람했다.
- 결과: **HIGH 0건 / MED 2건 / LOW 1건**. 역할 확정과 초안 교체 시 상태 처리 보완이 필요하다. 제품 코드 수정·커밋·배포는 하지 않았다.

## 지적 사항

### 1. [심각도 MED] 인증 시작 후 변경할 수 없는 역할을 화면에서는 변경 가능

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyForm.tsx:107`
- **문제**: 역할 라디오는 `busy`일 때만 비활성화된다. `owner`로 OTP를 발송한 뒤 취소하면 `ready`로 돌아오며 역할을 `tenant`로 바꿀 수 있다. 그러나 서버 `bindDraftRole`은 OTP 발송 전에 초안에 역할을 저장하고, 같은 초안의 다른 역할 요청을 `not_found`로 거부한다. 화면에서 허용한 선택으로 인증을 다시 진행하면 실패하며, `startIdentity`는 오류를 표시하고 같은 `ready` 화면으로만 돌아온다. 발송 실패도 역할 저장 이후 발생할 수 있어 동일 문제가 생긴다. 소유자 불일치 후 ‘다시 시도’로 돌아와 역할을 바꾸는 경우도 해당한다. 서버 권한 우회는 없지만 사용자가 선택한 경로로 진행할 수 없고, PDF 재분석이 필요하다는 안내도 없다.
- **근거**: 설계 §3.2·§4.4의 역할 고정/복원 계약. `hooks/useGuestApply.ts:168,173,189,261`에서 역할 전송·오류·취소 복귀, `lib/guest-monitoring/draft-role.ts:16`에서 역할 교체 거부를 확인했다.
- **수정 제안**: 초안별 ‘인증 시작에 사용한 역할’을 훅에서 관리하고, 인증 요청 이후에는 같은 역할로만 재시도하도록 잠근다. 역할 변경은 이름·전화는 유지하면서 새 초안을 만드는 ‘다시 입력’으로 안내한다. 네트워크 오류·발송 실패 시에도 이미 서버에 역할이 저장됐을 가능성을 처리한다.
- **완료 기준**: owner/tenant 각각 OTP 취소·재발송·발송 실패·소유자 불일치 복귀 후, 화면이 서버의 역할 고정 정책과 일치한다. 역할 변경 경로에서는 새 draftId를 사용한다.

### 2. [심각도 MED] 만료 초안에서 재분석하면 이전 역할이 새 초안의 기본 선택으로 남음

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyForm.tsx:50`
- **문제**: 역할은 `useState(initialRole)`로 한 번만 초기화되고, 수동 ‘다시 입력’ 이외의 초안 무효화에는 동기화되지 않는다. OTP 인증 후 주문 요청이 `draft_expired`/404로 실패하면 `useGuestOrderFlow`는 draft를 지우고 `input`으로 이동하지만 `otpRoleRef`는 남긴다. 이때 다시 마운트된 폼은 이전 역할을 초기값으로 받는다. 이후 새 PDF 분석에서 훅이 `otpRoleRef`를 비워도 폼의 로컬 `role`은 그대로여서 새 추출 결과에 이전 역할이 이미 선택되어 나타난다. 설계의 ‘새 초안은 기본 선택 없음’ 조건을 어기며, 이전 물건과 다른 역할로 신청해야 할 때 잘못된 역할로 진행할 수 있다.
- **근거**: 설계 §4.2·§4.4. `hooks/useGuestOrderFlow.ts:103`의 만료 정리에는 역할 정리가 없고, `hooks/useGuestApply.ts:100`의 재분석 정리는 ref만 초기화한다. `guest/apply/GuestApplyClient.tsx:172`는 그 값을 초기 props로 전달한다. 실제 폼 소스를 사용한 격리된 useState 모형에서도 `initialRole=owner`로 마운트 후 `initialRole=null`·새 draft를 전달하면 로컬 역할이 owner로 남았다. 이 확인은 브라우저 통합 테스트가 아니다.
- **수정 제안**: 선택 역할을 draftId에 결합해 훅에서 단일 상태로 관리한다. 만료·재분석·초안 교체 시 역할도 초기화하고, 동일 초안의 OTP 취소·재발송·재인증에서는 보존한다. `initialRole` 변경만 무조건 동기화하면 정상 선택까지 지울 수 있으므로 초안 수명주기를 기준으로 처리한다.
- **완료 기준**: owner/tenant 각각 ‘OTP 성공 → 주문에서 draft_expired/404 → 새 PDF 분석’ 후 두 라디오가 모두 미선택이다. 같은 초안의 OTP 취소·복귀에서는 기존 역할이 복원된다.

### 3. [심각도 LOW] 역할 설명과 PDF 정정 안내의 텍스트 명암비 부족

- **파일:라인**: `app/(personal-home)/renewal/monitoring/guest/guest.module.css:349` (관련: `:404`)
- **문제**: 새 `.roleDesc`와 `.panelNote`는 12px 글자에 `#8a8fa3`을 쓴다. 역할 설명은 흰 배경에서 약 **3.21:1**, 선택 배경 `#f0f2fd`에서는 약 **2.88:1**로 대비가 낮다. 역할 차이와 잘못된 PDF 정정 방법을 설명하는 문구여서 저시력 사용자가 필요한 안내를 읽기 어렵다. 수치는 CSS 색상의 상대 휘도로 계산했으며, 실브라우저 접근성 검사는 수행하지 않았다.
- **수정 제안**: 일반 텍스트 대비 목표를 최소 4.5:1로 두고 더 어두운 색을 사용한다. 기본·hover·선택 상태와 확인 패널 배경에서 모두 확인한다.
- **완료 기준**: 비활성 상태가 아닌 역할 설명·정정 안내가 실제 배경에서 4.5:1 이상이며, 기존 PDF 버튼·라디오의 키보드 조작이 유지된다.

## API·상태·성능 대조 결과

| 항목 | 확인 결과 |
|---|---|
| parse-pdf 요청 (§3.1) | `guestApi.ts`는 FormData에 `file`, `guestName`, `guestPhone`만 전송한다. 주소·동/호·추출 식별자 전송 없음. 서버 `createDraft` 허용목록과 일치한다. |
| parse-pdf 응답 (§2.2·§4.1) | 서버 응답의 `unitNumber`를 확인 패널에서 직접 읽는다. 주소·소유자·고유번호는 읽기 전용이며 소유자·고유번호는 마스킹 응답만 표시한다. 결과 표시를 최초 useState 값에 의존하지 않는다. |
| 분석 실패·빈 결과 | 비-2xx는 오류를 표시하고, `extractionOk=false`는 역할·인증 진입을 막는다. 서버의 집합건물 호수 미확정은 `extraction_incomplete`로 거부된다. |
| identity/start (§3.2) | apply는 `draftId`, `role`을 전송한다. 현황 조회의 status 요청은 역할을 보내지 않는다. 요청 모양은 서버 스키마와 일치하지만 역할 고정 UX는 지적 1 보완 필요. |
| orders·소유자 불일치 (§3.4·§4.5) | 주문 요청에 역할·소유자 덮어쓰기 없음. `owner_name_mismatch` 403을 지정 문구로 분류하고 실패 화면 `role=alert`로 표시한다. 주문 실패 시 결제 SDK 진입은 중단된다. |
| 완료·복구 (§4.4) | 완료는 기존 서버 주문 상태 판정에 위임한다. 이번 변경에서 OTP 성공이나 SDK 반환만으로 완료 처리하는 경로는 추가되지 않았다. |
| 중복 fetch·리렌더 | 변경 코드에 fetch를 반복 실행하는 새 effect나 렌더 중 API 호출은 없다. 파싱은 명시적 분석 동작에서 호출되며 기존 genRef·결제 SDK 재진입 잠금은 유지된다. 새 역할/드롭 상태 갱신에서 무거운 계산은 확인되지 않았다. 실제 요청 횟수·렌더 시간 계측은 미실시. |
| 구조 | 업로드·추출 확인·역할 UI가 라우트 하위 components로 분리됐다. 변경 TS/TSX는 모두 500줄 이하. `useGuestApply.ts`는 432줄로 설계의 400줄 관찰 기준을 넘으므로 후속 기능 추가 시 분리 검토 필요. |

## 실행한 검증

- 변경·신규 프론트 TS/TSX 12개에 ESLint 실행: **통과**.
- `git diff --check`: **통과**.
- 아래 명령으로 관련 계약·역할·OTP 테스트 실행: **5개 파일 / 120개 테스트 통과**. 서버 의존성을 모킹한 테스트를 포함하며 실제 문자 발송·결제·운영 DB 검증을 의미하지 않는다.

```sh
npx vitest run --config lib/guest-monitoring/vitest.config.ts \
  lib/guest-monitoring/tests/pdf-contract.test.ts \
  lib/guest-monitoring/tests/draft-contract.test.ts \
  lib/guest-monitoring/tests/role-gates.test.ts \
  lib/guest-monitoring/tests/role-calendar.test.ts \
  lib/guest-monitoring/tests/sms-otp.test.ts
```

- 추가 확인: 실제 폼 소스를 TypeScript로 메모리 변환한 뒤 useState 모형으로 지적 2의 초기 props/로컬 상태 불일치를 재현했다. 저장되는 테스트 파일은 추가하지 않았다.

## 누락·위험·우선순위

- **누락**: 변경된 폼/훅을 대상으로 한 브라우저 또는 React 통합 회귀 검증이 없다. 키보드 포커스·스크린리더·모바일 긴 파일명·실제 드롭은 정적 검토에 한정했다. build·전체 타입 검사·전체 테스트·실제 데이터 저장/결제 검증은 이번 리뷰에서 실행하지 않았다.
- **위험**: 통과한 서버 계약 테스트만으로 프론트 역할 복원·초안 교체의 정확성을 보장할 수 없다. 새 프론트 `guestTypes.ts`는 이미 확장된 공유 타입과 역할·동/호 타입을 중복 선언하므로 향후 계약 변경 시 불일치 여부를 함께 확인해야 한다.
- **우선순위**: **1순위** 지적 1의 역할 고정 및 변경 안내 → **2순위** 지적 2의 초안별 역할 초기화와 두 경로의 회귀 검증 → **3순위** 지적 3의 명암비 개선·실브라우저 접근성 확인.
