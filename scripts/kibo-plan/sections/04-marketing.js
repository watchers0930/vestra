const { heading1, heading2, para, bullet, createTable, spacer, pageBreak } = require("../helpers");

function createMarketingSection() {
  return [
    pageBreak(),
    heading1("IV. 마케팅 및 영업전략"),

    heading2("1. B2B 마케팅 전략"),
    createTable(
      ["구분", "내용"],
      [
        ["핵심 타깃", "공인중개사 (51만 명), 자산관리사, 법무/회계 법인"],
        ["핵심 메시지", "\"분석부터 등기까지, 하나의 플랫폼으로 끝내세요\""],
        ["전환 방식", "데모 → 파일럿 10개사 → 구독 전환"],
        ["KPI", "유료 기관 수, 계약 전환율"],
      ],
      { boldFirstCol: true }
    ),

    heading2("2. B2C 마케팅 전략"),
    createTable(
      ["구분", "내용"],
      [
        ["핵심 타깃", "전/월세 계약 예정자, 개인 투자자"],
        ["핵심 메시지", "\"계약 전 5분, AI로 리스크를 먼저 확인하세요\""],
        ["전환 방식", "무료 체험 → 건별 과금 / 구독"],
      ],
      { boldFirstCol: true }
    ),

    heading2("3. B2B SaaS 요금 모델 — 3단계 구독"),
    createTable(
      ["플랜", "월 요금", "타깃", "주요 기능"],
      [
        ["Lite", "29,000원", "개인 투자자", "월 5회 정밀 권리 분석 + 실시간 시세 모니터링"],
        ["Professional ★", "89,000원", "활발한 투자자", "무제한 권리 분석 + 24개월 가치예측 + 심층 법률 리스크 검토"],
        ["Enterprise", "별도 문의", "기업 및 기관 투자자", "맞춤형 API 통합 + 전담 분석 매니저 + 화이트라벨링"],
      ],
      { boldFirstCol: true }
    ),

    heading2("4. 단계별 마케팅 실행 계획"),
    para("1단계 (1~3개월) — 시장 진입:", { bold: true }),
    bullet("파일럿 프로그램: 공인중개사 10개사 무료 실증"),
    bullet("전문가 실증단 구성: 법무사, 세무사, 감정평가사 피드백"),
    bullet("초기 콘텐츠 마케팅: 전세사기 예방 리포트, 사례 분석"),

    para("2단계 (4~6개월) — 본격 영업:", { bold: true }),
    bullet("부동산 협회 세미나, 박람회 참가"),
    bullet("B2B 영업팀 가동: 중개법인 직접 영업"),
    bullet("레퍼런스 확보: 성공 사례 기반 마케팅"),

    para("3단계 (7~12개월) — 확장:", { bold: true }),
    bullet("디지털 마케팅 강화 (SEO, SEM, SNS)"),
    bullet("API 파트너 프로그램 오픈"),
    bullet("화이트라벨 솔루션 제공"),

    heading2("5. 수익 배분 구조 (3사 통합)"),
    createTable(
      ["수익원", "VESTRA", "등기온", "ezREMS"],
      [
        ["구독료 (SaaS)", "33.3%", "33.3%", "33.3%"],
        ["등기 연계 수수료", "20%", "80%", "-"],
        ["데이터 라이선스", "30%", "-", "70%"],
        ["AI API 호출", "80%", "-", "20%"],
      ],
      { boldFirstCol: true }
    ),
    spacer(),
  ];
}

module.exports = { createMarketingSection };
