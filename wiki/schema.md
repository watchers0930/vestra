# VESTRA Wiki Schema

> 이 파일은 wiki 아티클의 구조 규칙을 정의합니다.

---

## Article Sections (아티클 섹션 구조)

모든 토픽 아티클은 다음 섹션 중 해당하는 것만 포함한다.

| 섹션 | 용도 |
|------|------|
| **Purpose** | 토픽의 목적과 비즈니스 의미 |
| **Architecture** | 시스템 구조, 다이어그램 |
| **Algorithm** | 알고리즘 상세 (수식, 의사코드) |
| **API Surface** | 엔드포인트, 요청/응답 형식 |
| **Data Models** | DB 모델 또는 TypeScript 타입 |
| **Security** | 보안 정책 및 구현 |
| **Features** | 기능 목록 및 상세 |
| **External Integrations** | 외부 API 연동 |
| **Deployment** | 배포 설정, 환경 변수 |
| **Key Decisions** | 설계 결정 사항 (why) |
| **Gotchas** | 주의사항, 알려진 함정 |
| **Sources** | 참조 소스 파일 경로 |

---

## Coverage 태그 규칙

모든 아티클 최상단에 coverage 태그를 포함한다.

```
[coverage: high/medium/low -- N sources: source1, source2, ...]
```

| 레벨 | 기준 |
|------|------|
| high | 3개 이상의 소스, 상세 정보 충분 |
| medium | 1~2개 소스, 주요 정보 파악 가능 |
| low | 소스 부족, 추가 조사 필요 |

---

## 작성 원칙

1. 소스 파일에서 읽은 내용만 작성 (추측 금지)
2. 한국어로 작성 (기술 용어, 코드 제외)
3. 소스 파일은 절대 수정 금지 (wiki/ 폴더에만 쓰기)
4. 아티클당 하나의 토픽에 집중
5. 코드 예시는 실제 파일 내용 기반

---

## 파일 구조

```
wiki/
├── INDEX.md              # 전체 토픽 인덱스
├── schema.md             # 이 파일 (구조 규칙)
├── CONTEXT.md            # 프로젝트 컨텍스트 요약
├── log.md                # 컴파일 로그
├── .compile-state.json   # 컴파일 상태
├── topics/               # 주제별 아티클
│   ├── platform-overview.md
│   ├── algorithm.md
│   ├── api.md
│   ├── frontend.md
│   ├── security.md
│   ├── features.md
│   └── deployment.md
└── concepts/             # 크로스커팅 패턴
    ├── two-stage-principle.md
    └── uncalibrated-parameters.md
```

---

## Topics 목록

| 슬러그 | 설명 | 키워드 |
|--------|------|--------|
| `platform-overview` | 플랫폼 전체 개요, 기술스택, 스케일 지표 | 플랫폼, 개요, 기술스택, 비즈니스, 사업계획 |
| `algorithm` | 7개 핵심 알고리즘, 외부 데이터 연동, 예측 로드맵 | 알고리즘, V-Score, 사기위험도, 시세예측, 공공API |
| `api` | 51개 API 라우트 명세, 인증, Rate Limit | API, 엔드포인트, 인증, Rate Limit |
| `frontend` | UI 컴포넌트 구조, 라우팅, 페이지 목록 | 프론트엔드, 컴포넌트, UI, 페이지 |
| `security` | 보안 아키텍처, RBAC, PII 암호화, OWASP | 보안, 인증, 암호화, OWASP, 감사로그 |
| `features` | 30+ 기능 목록, 전세분석, 권리분석, 등기감시 | 기능, 전세, 권리분석, 등기, 계약 |
| `deployment` | Vercel 배포, 환경변수, Cron Job | 배포, Vercel, 환경변수, Cron |

## Concepts 목록

| 슬러그 | 설명 | 연결 토픽 |
|--------|------|-----------|
| `two-stage-principle` | 중요 판단은 항상 2단계 구조 (알고리즘·배포·보안에서 공통 패턴) | algorithm, deployment, security |
| `uncalibrated-parameters` | 핵심 위험도 가중치가 휴리스틱 초기값이며 실사고 데이터 캘리브레이션 대기 중 | algorithm, api, deployment |

---

## Evolution Log

- 2026-06-22: 개념 아티클 디렉토리(concepts/) 초기 생성 — two-stage-principle, uncalibrated-parameters 추가
- 2026-06-22: Topics/Concepts 목록 섹션 schema.md에 추가
