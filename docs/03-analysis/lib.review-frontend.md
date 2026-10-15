# 비회원 등기감시 프론트엔드 교차검수

- 검토일: 2026-10-15
- 기준: 미커밋 변경분(`git status --short`, `git diff`, `git diff --cached`, untracked 파일 포함), `docs/02-design/features/lib.design.md`, 플랫폼 개발 표준 요약 및 제공 규칙.
- 범위: `app/(personal-home)/renewal/monitoring/`의 수정 TSX 2개와 신규 프론트 파일 18개. `components/`, 루트 `hooks/`에는 이번 미커밋 변경이 없다. API·공유 타입·서버 서비스는 프론트 계약과 동작을 확인하는 범위에서 읽었다.
- 판정: **수정 후 재검수 필요 — HIGH 3건 / MED 9건 / LOW 2건.** 구현 코드는 수정하지 않았다.

## 지적 사항

### 1. [심각도 HIGH] 본인인증 복귀 계약과 신청 재개 조건이 연결되지 않음

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestApply.ts:175` (관련: 191, `app/api/guest-monitoring/identity/callback/route.ts:9`)
- **문제**: 주문 생성 재개는 URL에 `verified=1` 또는 `ok=1`이 있어야 실행된다. 하지만 현재 인증 콜백은 `{ ok:true, redirect:"/renewal/monitoring/guest/apply" }`를 반환하고, 프론트에는 이 JSON을 받아 이동시키는 코드도 없다. 반환된 bare redirect 경로로 이동시켜도 저장된 draft만 있는 경우 `input`에 머물러 주문을 생성하지 않는다. 리다이렉트로 소실된 이름·전화·draft 응답도 복원되지 않는다. 또한 현재 mock의 launch는 `{provider,state}`로 세션 발급 완료가 아닌데, 실행 URL이 없다는 이유만으로 `startOrder`를 호출하여 인증되지 않은 주문 요청을 만든다.
- **수정 제안**: §3.2에서 허용한 콜백 방식 중 실제 사용할 방식을 양측이 고정한다. 서버가 쿠키 발급 후 브라우저 반환 화면으로 이동시키거나, 반환 화면이 콜백 JSON을 소비하도록 연결한다. 반환 화면은 서버 세션 검증을 거쳐 보관한 draft로 주문을 재개하고, URL 부재를 인증 완료로 취급하지 않는다. mock 검증에서도 서명된 인증 콜백을 거친다.
- **확인**: 저장된 draft + 쿼리 없는 반환 경로를 격리 실행했을 때 `phase=input`, 주문 요청 0회. 실 다날 인증은 검증하지 않았다.

### 2. [심각도 HIGH] PDF 분석 후 입력을 바꿔도 이전 초안으로 결제

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyForm.tsx:103` (관련: 55, 67, 81, 130, `hooks/useGuestApply.ts:144`)
- **문제**: `parsed`는 draft의 추출 성공 여부만 본다. 분석 후 주소나 PDF를 A에서 B로 바꿔도 draft를 무효화하지 않으며, 분석 버튼은 사라진 상태다. 이후 본인인증·결제는 여전히 A의 draftId로 진행되어 화면에 선택한 PDF/주소와 실제 결제 대상이 달라진다. 이름·전화 변경도 기존 초안과 불일치하여 서버 인증 검증에서 실패한다.
- **수정 제안**: 분석 완료 후 입력을 잠그고 명시적인 ‘수정/다시 분석’ 동작을 제공하거나, 입력 변경 시 draft·동의 상태·복귀 참조를 무효화한다. 현재 입력의 분석 결과일 때만 결제 버튼을 활성화한다.
- **재현**: A PDF 분석 성공 → B PDF 선택 또는 주소 수정 → 동의 후 결제. `onProceed`는 변경된 파일/주소를 전달하지 않으며 훅은 기존 draftId를 사용한다.

### 3. [심각도 HIGH] 달력 응답 경합으로 표시 물건과 연장 결제 대상이 달라짐

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestStatus.ts:54` (관련: 59–70, `guest/status/GuestStatusClient.tsx:66`)
- **문제**: 달력 요청에 취소·요청 식별·현재 선택 확인이 없다. A 조회 중 목록으로 돌아가 B를 선택한 뒤 A 응답이 늦게 도착하면 `selectedId=B`, `calendar.property=A`가 된다. 화면은 calendar의 A 주소·기록을 우선 표시하지만 연장 주문은 selectedId인 B로 전송한다. 월을 빠르게 이동해도 제목 월과 응답 월이 섞인다. 이전 요청 하나가 끝나면 다른 요청 진행 중에도 `busy=false`가 되어 연장 버튼이 풀린다.
- **수정 제안**: 물건 ID+월을 요청 키로 관리하고 최신 요청만 상태에 반영한다. AbortController 또는 요청 세대 번호를 적용하고, 선택 변경 시 이전 데이터를 초기화한다. 표시 대상과 연장 대상이 일치할 때만 연장할 수 있게 한다.
- **확인**: A/B 요청을 역순 완료시키는 격리 실행에서 `selectedId=B`, `calendar.property.id=A` 재현.

### 4. [심각도 MED] 목록 API 실패 시 최초 로딩이 끝나지 않음

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestStatus.ts:77`
- **문제**: `refreshProperties`는 401만 미인증으로 전환한다. 네트워크 오류·404(기능 OFF 또는 잘못된 세션 용도)·429·503·500이면 오류 메시지 없이 빈 배열만 반환하여 최초 `authState=checking`이 유지된다. `GuestStatusClient`는 로딩 화면만 보여주므로 재시도나 인증 진입이 불가능하다.
- **수정 제안**: 로딩·미인증·인증됨·일시 오류·이용 불가 상태를 구분하고 모든 응답에서 checking을 종료한다. 서버 오류와 빈 물건 목록을 구분하고 재시도 버튼을 제공한다.
- **확인**: `/properties` 503을 반환하는 격리 실행 후에도 `authState=checking` 유지.

### 5. [심각도 MED] 조회 중 세션 만료 및 달력/연장 오류가 화면에서 사라짐

- **파일:라인**: `app/(personal-home)/renewal/monitoring/guest/status/GuestStatusClient.tsx:64` (관련: 79, `hooks/useGuestStatus.ts:49`, 149)
- **문제**: 오류 메시지는 물건 목록 분기에만 있고 달력 패널에는 전달되지 않는다. 물건 선택 후 달력 조회나 연장 주문이 실패하면 error를 설정해도 화면에는 나타나지 않는다. 달력/주문 API의 401에서도 authenticated 상태와 기존 물건 목록을 유지하여 §5 step 6의 ‘세션 만료 재인증’으로 복귀하지 않는다. 달력 조회 실패가 빈 로그처럼 보일 수도 있다.
- **수정 제안**: 선택 분기 밖에서 공통 오류를 표시한다. 401은 공통 처리로 조회 데이터를 비우고 재인증 화면으로 전환한다. 일반 오류는 실패한 동작의 재시도를 제공하며, 실패와 정상 빈 달력을 구분한다.
- **재현**: 인증·물건 선택 후 세션 만료 → 월 이동 또는 연장 → API 401 → 재인증 폼과 오류 안내 모두 미노출.

### 6. [심각도 MED] 로그아웃 API 실패를 성공으로 처리

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestStatus.ts:173`
- **문제**: `deleteSession()` 결과를 확인하지 않고 UI를 미인증으로 전환한다. 네트워크 오류나 서버 실패로 쿠키와 서버 세션이 살아 있어도 사용자는 조회를 종료했다고 생각한다. 새로고침하면 이전 세션으로 물건이 다시 노출될 수 있다.
- **수정 제안**: 서버 폐기 성공 또는 이미 만료된 세션임을 확인한 후 종료 완료를 표시한다. 실패하면 민감한 화면을 가리되 종료 미완료 안내와 재시도 수단을 제공한다.
- **확인**: DELETE가 네트워크 실패 결과를 반환해도 격리 실행에서 `authState=unauthenticated`로 전환.

### 7. [심각도 MED] 하나의 멱등키를 서로 다른 물건의 연장에 재사용

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestStatus.ts:143` (관련: `guest/guestProvider.ts:92`)
- **문제**: sessionStorage에 멱등키 하나만 보관하며 물건·신규/연장 구분이 없다. A의 연장 주문이 미완료인 동안 다른 물건 B로 돌아가 연장하면 A의 키로 B의 주문을 요청한다. 실제 `lib/guest-monitoring/order.ts`는 같은 키의 대상이 다르면 404로 거부하므로 B의 연장이 막힌다. 이전 신청 흐름의 키가 남은 경우도 동일하다.
- **수정 제안**: purpose+draftId/guestMonitoringId에 결합된 주문 시도 상태를 보관한다. 같은 주문 재시도에는 기존 키를 유지하고 다른 물건에는 별도 키를 쓴다. 미완료 주문의 orderId와 대상도 함께 보존한다.
- **계약**: §3.3의 멱등성은 같은 주문 재시도에 적용되어야 한다. 물건을 바꿀 때 전역 키를 무조건 삭제하는 방식은 기존 미완료 주문 복구를 잃으므로 피한다.

### 8. [심각도 MED] 결제 상태별 복구가 불완전하여 재시도 루프·잘못된 실패 안내 발생

- **파일:라인**: `app/(personal-home)/renewal/monitoring/hooks/useGuestApply.ts:98` (관련: 197–202, `hooks/useGuestStatus.ts:100`, 165)
- **문제**: `paid && applied=false`는 §4.1의 복구 대기 상태인데 ‘결제가 완료되지 않았습니다’로 처리한다. `failed/canceled/refunded` 확정 상태도 주문 ID를 유지하고, ‘다시 시도’는 같은 주문 GET만 반복하므로 결제 재진입이 되지 않는다. 조회 흐름은 pending을 제외한 paid-but-unapplied도 저장 상태를 지우며, 결제창 없는 연장 경로에서는 pending도 실패로 안내한다. 서버 승인 대기·적용 대기와 확정 실패가 섞여 있다.
- **수정 제안**: pending/paid-but-unapplied는 주문 참조를 보존하고 상태 재조회로 복구한다. 실패·취소가 확정된 주문은 이전 결과를 보존하되 명시적인 새 결제 시도에 새 키를 발급한다. 401은 재인증 후 동일 주문 확인으로 이어간다. 미확정 주문에는 신규 결제를 유도하지 않는다.
- **확인**: paid/applied=false 응답을 격리 실행했을 때 `phase=failed`, ‘결제가 완료되지 않았습니다’ 재현. 확정 취소 주문의 retry는 코드상 같은 orderId 조회만 반복한다.

### 9. [심각도 MED] 공통 달력이 여전히 브라우저 로컬시간으로 날짜·회차를 계산

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/MonitoringActivityCalendar.tsx:46` (관련: 63, 86–87, 94)
- **문제**: §4.5가 명시한 공통 KST 변환이 구현되지 않았다. 서버는 KST 월 범위로 로그를 보내지만 공통 달력은 로컬 날짜와 시각으로 그룹화한다. 예를 들어 `2026-10-01T03:00:00Z`는 KST 10월 1일 12시지만 LA에서는 9월 30일 20시다. 해외 사용자는 10월 달력에서 로그를 보지 못하거나 회차가 합쳐질 수 있다. 이번 신규 비회원 화면이 이 공통 컴포넌트를 사용하므로 요구사항 누락이며, 기존 회원 화면도 함께 보완해야 한다.
- **수정 제안**: 날짜 키·현재월/오늘·정오/오후 슬롯·표시 시각을 공통 KST 유틸리티로 통일한다. `GuestApplyResult`, `GuestCalendarPanel`, `GuestPropertyPicker`의 이용기간도 기준 시간대를 명시한다. 회원/비회원 모두 월 경계와 해외 시간대 회귀를 확인한다.
- **확인**: 동일 ISO 시각을 서울/LA로 포맷하여 날짜와 회차 차이 확인. 달력 컴포넌트의 로컬 처리 코드는 기존부터 있었으나 설계에서 이번 보완을 명시했다.

### 10. [심각도 MED] 기능 플래그 OFF에도 신청·조회 UI가 노출됨

- **파일:라인**: `app/(personal-home)/renewal/monitoring/MonitoringRenewalClient.tsx:112` (관련: `guest/apply/page.tsx:15`, `guest/status/page.tsx:15`)
- **문제**: 비로그인 여부만으로 신청 섹션을 보여주며 신규 페이지도 서버 기능 플래그를 확인하지 않는다. 설계 §0·§3.0은 기본 OFF 및 기능 미노출을 요구하고 실제 API는 OFF에서 404다. 따라서 운영 기본 설정에서도 상품·PDF/이름/전화 입력 화면은 열리지만 처리할 수 없다. 조회 화면은 4번 문제로 무한 로딩까지 발생한다.
- **수정 제안**: 서버 페이지에서 `GUEST_MONITORING_ENABLED`를 확인해 신청 섹션 렌더링을 제어하고 전용 라우트도 비활성 처리한다. 서버 플래그를 클라이언트 권한 판정으로 대체하지 않는다. ON/OFF별 진입·직접 URL 접근을 검증한다.

### 11. [심각도 MED] 인증/결제 실행 헬퍼가 반환 URL을 실행 URL로 오인

- **파일:라인**: `app/(personal-home)/renewal/monitoring/guest/guestProvider.ts:19` (관련: 29–39)
- **문제**: URL_KEYS에 `returnUrl`이 있고 폼 action보다 먼저 검사한다. `{action:인증/결제 URL, returnUrl:앱 복귀 URL, ...필드}` 형태를 받으면 provider에 POST하지 않고 복귀 URL로 바로 이동한다. 주석상 지원하는 폼 실행 형태에서도 필요한 서명/거래 필드를 보내지 못한다. 현재 mock에는 이 필드가 없으므로 현재 mock 응답에서 발생하는 문제는 아니며, 실 다날 포맷은 설계 §8상 미확정이다.
- **수정 제안**: 추측한 필드명 목록 대신 서버 어댑터가 실행 방식(`redirect`/`form_post`), 목적지와 전달 필드를 구분해 반환하도록 계약을 확정한다. 반환 URL을 실행 목적지로 사용하지 않는다.
- **확인**: 헬퍼에 action+returnUrl을 함께 전달하는 격리 실행에서 폼 생성 없이 returnUrl로 이동함을 확인.

### 12. [심각도 MED] 키보드만으로 신청 PDF를 선택할 수 없음

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyForm.tsx:89`
- **문제**: 파일 선택 트리거가 onClick만 있는 div이고 실제 file input은 `display:none`이다. 트리거에 키보드 포커스나 Enter/Space 동작이 없어 키보드 사용자는 필수 PDF를 업로드할 수 없다.
- **수정 제안**: 파일 선택용 네이티브 button과 접근 가능한 file input을 사용하거나, 키보드로 접근 가능한 input/label 구성을 적용한다. 이름·선택 상태·busy 상태를 보조기기에도 제공한다.
- **검증 기준**: 마우스 없이 Tab → 파일 선택 → 분석 → 동의 → 본인인증까지 진행 가능해야 한다.

### 13. [심각도 LOW] 신청·인증 입력에 연결된 레이블과 오류 알림이 없음

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestStatusAuthForm.tsx:37` (관련: 49, 63, `components/guest/GuestApplyForm.tsx:50`, 62, 76, 128)
- **문제**: 필드 제목이 div이며 input의 id/label 연결이나 aria-label이 없다. placeholder에만 의존해 값 입력 후에도 안정적인 접근 가능한 이름이 제공되지 않는다. 비동기 오류 문구도 role/aria-live 연결이 없어 포커스가 버튼에 남으면 오류가 전달되지 않을 수 있다.
- **수정 제안**: `label htmlFor`와 input id를 연결하고 오류는 `aria-describedby`, 필요 시 `aria-invalid`와 오류 알림 영역으로 전달한다. 두 폼의 로딩·성공 안내에도 적절한 상태 알림을 제공한다.

### 14. [심각도 LOW] 완료 화면에서 구현하지 않은 만료 전 안내를 약속

- **파일:라인**: `app/(personal-home)/renewal/monitoring/components/guest/GuestApplyResult.tsx:34`
- **문제**: 완료 화면은 ‘만료 전 연장 안내 문자’를 약속하지만 설계 §3.5는 만료 후 안내이며, §2의 pre_expiry는 MVP 범위 밖이다. 현재 만료 서비스도 만료된 건의 expiry_notice만 예약한다. 같은 기능의 진입 공지는 ‘만료 시’여서 사용자 안내도 서로 다르다.
- **수정 제안**: 현재 계약인 만료 후 안내에 맞춰 문구를 통일한다. 만료 전 안내가 필요하면 기획·설계·서버 작업 범위를 먼저 일치시킨다.

## API 계약 대조

| 항목 | 결과 |
|---|---|
| parse-pdf | 경로·POST·multipart의 file/guestName/guestPhone/address 일치. 고유번호/소유자 원문을 클라이언트가 보내지 않음. |
| identity/start | 경로·POST·purpose/apply draftId·이름/전화 DTO 일치. 인증 완료와 복귀 소비 연결은 1번 지적. |
| orders | 경로·POST·initial/renewal 대상 필드 일치. 가격·기간을 결정용 요청 필드로 보내지 않음. 멱등키 범위·복구는 7~8번 지적. |
| orders/[orderId] | GET·orderId URL 인코딩·응답 타입 일치. paid-but-unapplied 처리 누락은 8번. |
| properties / calendar | GET·month=YYYY-MM·공유 DTO 일치. 응답 경합·세션 만료·KST는 3~5·9번. |
| session | DELETE·same-origin 쿠키 사용 일치. 폐기 실패 무시는 6번. |
| 캐시·개인정보 | 신규 API 클라이언트는 cache:no-store 및 same-origin 사용. 신규 프론트에서 이름·전화·토큰을 URL/sessionStorage/console로 보내는 코드는 발견하지 못함. 서버 권한 보장의 실데이터 검증을 의미하지 않음. |

## 검증 결과: 누락·위험·우선순위

- **누락**: 인증 반환 처리, 입력 변경 시 초안 무효화, 최신 요청만 반영하는 달력 상태 관리, 일시 오류 UI, 세션 만료 재인증, KST 보완, 기능 플래그에 따른 UI 차단, 키보드 업로드.
- **위험**: 화면과 다른 물건 결제/연장, 승인된 결제의 오안내, 로그아웃 오인, 일시 장애 시 복구 불가. 서버의 금액·권한 검증이 프론트 표시 대상 불일치까지 막아주지는 않는다.
- **우선순위**: 1~3번을 먼저 해결하고, 4~12번을 기능 개방 전에 수정한다. 13~14번은 같은 검수 주기에서 보완한다.

### 실행한 검사와 한계

1. `git status --short`, unstaged/staged diff, untracked 목록으로 리뷰 범위를 확정했다. staged 변경은 없었다.
2. `npx tsc --noEmit --incremental false`: **통과**.
3. 대상 프론트 파일/디렉터리에 `npx eslint` 실행: **실패(오류 2건)**. `MonitoringRenewalClient.tsx:32`, `:55`의 `react-hooks/set-state-in-effect`. HEAD와 대조하면 해당 setState 패턴은 기존에도 있으므로 신규 결함 개수에는 포함하지 않았다. 나머지 검사 대상에서는 오류가 출력되지 않았다.
4. 저장하지 않은 Node 격리 하네스로 실제 TS를 transpile하여 훅·헬퍼를 실행했다. React 훅 저장소/API/브라우저를 대체하고 수동으로 상태를 재읽는 방식으로 목록 503, A/B 응답 역전, 달력 401, 로그아웃 네트워크 오류, bare 인증 반환, paid-but-unapplied, action+returnUrl 분기를 확인했다. **실 React 렌더링·브라우저 E2E를 대체하지 않으며** DOM/포커스/쿠키는 실브라우저에서 추가 검증해야 한다.
5. 신규 page.tsx는 각각 33줄, 변경된 페이지 클라이언트는 142줄이다. 페이지 500줄 제한 위반은 없다. 신규 UI/훅/API 클라이언트의 책임 분리는 대체로 구조에 반영되어 있다.
6. 달력은 렌더마다 그룹화/정렬하지만 월 단위 응답이라는 범위에서 독립적인 성능 병목으로 단정하지 않았다. 불필요한 useMemo 추가보다 3번의 요청 경합과 7~8번의 반복 실패 요청을 먼저 해결해야 한다. 목록 재조회는 연장 반영 목적이 있어 그 자체를 중복 fetch 결함으로 세지 않았다.
7. 브라우저 실행, 실결제/본인인증, DB 생성·저장·수정·삭제, 실제 권한별 데이터 접근, 운영 플래그 변경, 전체 build는 수행하지 않았다. 기존 회원의 등록/결제 권한·달력·세션과 비회원 정상/빈 목록/실패 경로의 통합 회귀는 출시 전 남은 검증이다. 이 리뷰만으로 실연동 또는 데이터 검증 완료를 주장하지 않는다.
