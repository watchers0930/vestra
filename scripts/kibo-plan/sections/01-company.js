const { heading1, heading2, para, createTable, bullet, spacer } = require("../helpers");
const data = require("../data");

function createCompanySection() {
  return [
    heading1("I. 기업개요"),

    heading2("1. 기업 일반현황"),
    createTable(
      ["항목", "내용"],
      [
        ["기업명", data.company.name],
        ["대표이사", data.company.ceo],
        ["사업자등록번호", data.company.bizNo],
        ["통신판매신고번호", data.company.comSalesNo],
        ["소재지", data.company.address],
        ["업종", data.company.industry],
        ["사업분야", data.company.bizType],
        ["설립년도", data.company.founded],
        ["현재 인원", data.company.employees],
        ["고객센터", data.company.phone],
        ["특허 출원", `${data.company.patent.name} (${data.company.patent.number})`],
      ],
      { boldFirstCol: true }
    ),

    heading2("2. 주요 사업내용"),
    para(`${data.product.name}(${data.product.meaning})는 LLM 기반 통합 AI 부동산 자산관리 플랫폼으로, 부동산 거래 전 과정에서 발생하는 권리분석, 계약검토, 세무 시뮬레이션, 리스크 평가 및 자산가치 예측을 통합 제공합니다.`),
    para("주요 서비스 영역:", { bold: true }),
    bullet("AI 권리분석: 등기부등본 자동 파싱 + 4단계 검증 + 리스크 스코어링"),
    bullet("AI 계약검토: 조항별 위험도 분석, 위험 조항 감지, 판례 인용"),
    bullet("세무 시뮬레이션: 취득세/양도세/종부세 자동 계산"),
    bullet("시세전망: 국토부 실거래가 연동, 3시나리오 5모델 앙상블 예측"),
    bullet("전세보호 허브: 6개 행정절차 가이드 + 법적 문서 자동생성"),
    bullet("AI 어시스턴트: 부동산 법률 Q&A 챗봇, 판례 자동 인용"),

    heading2("3. 주요 연혁"),
    createTable(
      ["시기", "내용"],
      [
        ["2024년", "BMI C&S 설립, AI 부동산 플랫폼 사업 기획"],
        ["2026년 2월", "VESTRA MVP 개발 착수 (18일 집중 개발)"],
        ["2026년 3월", "MVP v2.3.1 완료 · Vercel 운영 배포 (31,315 LOC)"],
        ["2026년 3~4월", "8종 독자 엔진 고도화, 시세지도 · 전세보호 기능 확장"],
        ["2026년 5월", `현재 ${data.product.version} 운영 중 — 기보자금 보증 신청`],
      ],
      { boldFirstCol: true }
    ),

    heading2("4. 조직 구성 및 채용 계획"),
    createTable(
      ["구분", "직위", "담당 업무", "보유 역량", "상태"],
      [
        ["1", "CTO/대표", "전체 기술 총괄, AI 엔진 개발", "AI/풀스택, MVP 단독 개발", "재직"],
        ["2", "풀스택 개발자", "프론트엔드/백엔드 개발", "React, Node.js, TypeScript", "채용 예정"],
        ["3", "AI/ML 엔지니어", "NLP 모델 고도화, 정확도 향상", "Python, NLP, ML", "채용 예정"],
        ["4", "사업개발(BD)", "B2B 영업, 파트너십 관리", "프롭테크 업계 경험", "채용 예정"],
      ]
    ),
    spacer(),
  ];
}

module.exports = { createCompanySection };
