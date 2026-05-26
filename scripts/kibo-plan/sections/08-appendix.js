const { heading1, heading2, para, createTable, spacer } = require("../helpers");
const data = require("../data");

function createAppendixSection() {
  return [
    heading1("VIII. 첨부자료"),

    heading2("1. 첨부 서류 목록"),
    createTable(
      ["#", "서류명", "비고"],
      [
        ["1", "사업자등록증 사본", ""],
        ["2", "법인등기부등본", ""],
        ["3", "대표이사 이력서", ""],
        ["4", "재무제표 (최근 결산)", ""],
        ["5", "기술보고서", "독자 엔진 8종 상세 기술 설명"],
        ["6", "특허 출원 계획서", "발명특허 3~5건"],
        ["7", "프로덕션 서비스 URL", data.product.url],
        ["8", "3사 파트너십 확인서", "등기온, ezREMS, 법무법인 시화"],
      ]
    ),

    heading2("2. 프로덕션 서비스 현황"),
    createTable(
      ["항목", "내용"],
      [
        ["서비스 URL", data.product.url],
        ["현재 버전", data.product.version],
        ["코드 규모", `${data.product.loc} LOC`],
        ["독자 엔진", `${data.product.engines} (${data.product.engineLoc} LOC)`],
        ["API 엔드포인트", data.product.apis],
        ["DB 모델", data.product.dbModels],
        ["페이지 수", data.product.pages],
        ["개발 기간", data.product.devPeriod],
      ],
      { boldFirstCol: true }
    ),

    heading2("3. 사업추진 일정"),
    createTable(
      ["단계", "기간", "주요 추진 내용", "상태"],
      [
        ["1단계 (기획/설계)", "1~2개월", "아키텍처 설계, 고객군 설정", "✅ 완료"],
        ["2단계 (데이터 통합)", "3~4개월", "10개 공공 API 연동, 품질 검증", "✅ 완료"],
        ["3단계 (AI 모듈)", "5~7개월", "8종 독자 엔진 + 3종 AI 모듈", "✅ 완료"],
        ["4단계 (플랫폼)", "8~9개월", "UI/UX, API, 인증/보안, MVP 배포", "✅ 완료"],
        ["5단계 (실증)", "10~11개월", "PoC 파일럿, 정확도 검증", "🔄 진행 중"],
        ["6단계 (사업화)", "12개월", "v1.0 출시, B2B SaaS, 3사 통합", "⬜ 보증금 투입 시 가속"],
      ],
      { boldFirstCol: true }
    ),
    para("현재 6단계 중 4단계 완료 (67%). 보증금은 나머지 33%를 가속하여 6개월 내 정식 출시를 목표합니다."),
    spacer(),
  ];
}

module.exports = { createAppendixSection };
