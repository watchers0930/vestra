# 등기변동 하이브리드 감시 설계

## 목적

등기부등본 전체를 매번 재조회하지 않고, 저비용 등기신청사건 조회로 조기 신호를 감지한 뒤 실제 등기부 반영 여부는 CODEF 등기부등본 조회로 확정한다.

## 역할 분리

| 단계 | 공급자 | 역할 | 결과 |
| --- | --- | --- | --- |
| 1차 프리체크 | Tilko | 등기신청사건 접수/처리/완료 상태 감지 | 조기 경고 |
| 2차 확정 조회 | CODEF | 최신 등기부등본 전체 조회 | 실제 변경 확정 |
| 3차 분석 | Vestra | 이전 스냅샷과 최신 등기부 비교 | 위험 유형/알림 |

## 상태 흐름

```txt
idle
  -> case_detected       Tilko에서 신청/접수/처리 중 사건 감지
  -> pending_confirm     Tilko에서 처리 완료 신호 감지, CODEF 확인 대기
  -> confirmed_changed   CODEF 조회 후 등기부 변경 확정
  -> confirmed_no_change CODEF 조회 후 변경 없음 확인
  -> dismissed           취하/각하/반려 등으로 종결
```

## 알림 정책

### 1차 알림: 등기신청 사건 감지

Tilko에서 접수/처리 중 사건이 잡히면 사용자에게 즉시 알린다.

```txt
해당 부동산에 등기 변경 신청 사건이 감지되었습니다.
아직 등기부등본 반영 여부는 확정 전입니다.
```

이 단계는 확정 판정이 아니다. 잔금, 보증금 입금, 전입 전이라면 사용자가 행동을 멈추고 확인할 수 있게 하는 조기 경보다.

### 2차 알림: 등기부 변경 확정

Tilko에서 처리 완료 신호가 감지되면 CODEF로 최신 등기부등본을 조회한다. 기존 스냅샷과 비교해 갑구/을구 변경이 확인되면 확정 알림을 발송한다.

```txt
기존 스냅샷 대비 을구에 근저당권설정이 추가되었습니다.
보증금 보호에 중대한 영향을 줄 수 있습니다.
```

## 운영 주기

| 모드 | Tilko 프리체크 | CODEF 강제 검증 |
| --- | --- | --- |
| 일반 감시 | 하루 1회 | 월 1회 |
| 계약~전입 감시 | 하루 3~6회 | 전입 전날/잔금 당일 |
| 고위험 물건 | 하루 1회 이상 | 주 1회 |

Tilko 신호가 없어도 정기 CODEF 강제 검증은 유지한다. 공급자 지연, 조회 조건 오류, 누락 가능성을 줄이기 위한 보정 장치다.

## 구현 위치

- Cron: `app/api/cron/registry-monitor/route.ts`
- Tilko 프리체크 클라이언트: `lib/tilko-api.ts`
- CODEF 등기부등본 조회: `lib/codef-api.ts`
- 스냅샷 기록/검증: `lib/registry-snapshot-recorder.ts`, `lib/registry-blockchain.ts`
- 상태 저장: `MonitoredProperty.registrySignalStatus`

## 환경변수

```txt
TILKO_API_BASE=https://api.tilko.net
TILKO_API_KEY=
TILKO_PUBLIC_KEY=
TILKO_IROS_ID=
TILKO_IROS_PASSWORD=
TILKO_REGISTRY_CASE_STATUS_PATH=/api/v2.0/Iros2IdLogin/RetrieveApplCsprCsList
```

Tilko 등기신청사건 처리현황 조회는 인터넷등기소 로그인 정보, 부동산 고유번호, 소유자명이 필요하다. Tilko 설정이 없거나 해당 물건의 고유번호/소유자명이 없으면 기존 CODEF 직접 조회 경로로 폴백한다.
