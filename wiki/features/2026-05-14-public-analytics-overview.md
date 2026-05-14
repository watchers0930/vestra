# 공개 방문 집계 API

## 목적

- GA4 속성 수집과 별개로 `vestra`의 실제 방문 이벤트 적재값을 외부 대시보드에서 조회할 수 있게 한다.

## 구현

- `GET /api/public/analytics/overview`
- 집계 원본
  - `AnalyticsEvent.page_view`
  - `AnalyticsEvent.page_leave`
- 반환 범위
  - 페이지뷰
  - 세션 수
  - 인증/비인증 세션
  - 상위 페이지
  - 지역/도시
  - 유입 출처
  - 디바이스/브라우저

## 보안

- 사용자 식별값, 원시 이벤트, 개별 세션 정보는 반환하지 않는다.
- 외부 대시보드 연동용 집계값만 공개한다.

## 사용처

- `m-master`에서 `vestra` GA4가 `0`일 때 폴백 데이터 소스로 사용
