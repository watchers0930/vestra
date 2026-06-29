---
concept: 미검증 파라미터 문제 (Uncalibrated Parameters)
last_compiled: 2026-06-22
topics_connected: [algorithm, api, deployment]
status: active
---

# 미검증 파라미터 문제 (Uncalibrated Parameters)

## Pattern

VESTRA의 핵심 AI 판단 파라미터(위험도 점수, 가중치, 감점 수치)는 현재 **전문가 휴리스틱 초기값**으로 운영되고 있다. 구현은 완성되어 있고 논리적으로 타당한 구조이지만, 실제 전세사고 데이터로 역검증(calibration)이 완료된 상태가 아니다.

이 문제는 코드베이스 세 곳에서 독립적으로 동일한 경고 문구로 반복된다. "전문가 휴리스틱 기반 초기값이며 실제 사고 데이터로 캘리브레이션이 완료되지 않은 상태"는 algorithm, api, deployment의 Gotchas 섹션에 모두 등장한다.

## Instances

- **algorithm — V-Score 가중치**: 전세보증금비율(30점), 권리관계(25점), 임대인이력(20점) 등 가중치가 전문가 설정값. 실제 전세사고 데이터와의 상관관계 분석 미완료.
- **algorithm — 사기위험도 15-피처**: 역전세 비율, 경매이력, 근저당설정액 등 15개 피처의 가중치가 휴리스틱 초기값. 머신러닝 모델 미탑재 상태.
- **api — analyze API 응답**: API 응답에 포함되는 위험도 수치는 참고용으로 해석해야 한다는 Gotcha가 명시적으로 등록되어 있음.
- **deployment — 운영 주의사항**: Gotchas 섹션에 "파라미터 실증 미검증"이 별도 항목으로 등록됨.

## What This Means

VESTRA는 기능적으로 완성된 플랫폼이지만, **판단의 정확도는 여전히 검증 대기 상태**다. 사용자가 위험도 점수를 신뢰할수록, 잘못 캘리브레이션된 가중치로 인한 오판 리스크가 커진다.

이 문제의 해결 경로는 두 가지다: (1) 실제 전세사고 케이스 데이터 축적 후 가중치 역검증, (2) 머신러닝 기반 가중치 자동 학습(algorithm 아티클의 Phase A~D 시세전망 강화 로드맵이 이 방향을 포함한다). 현재 단계에서 UI/UX 수준에서 "위험도는 참고용" 면책 문구를 포함하는 것이 최소 대응이다.

## Sources

- [[../topics/algorithm]]
- [[../topics/api]]
- [[../topics/deployment]]
