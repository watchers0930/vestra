const { heading1, heading2, para, bullet, createTable, quote, spacer, pageBreak } = require("../helpers");
const data = require("../data");

function createMarketSection() {
  return [
    pageBreak(),
    heading1("III. 시장분석"),

    heading2("1. 국내 부동산 시장 현황"),
    para("국내 부동산 시장은 여전히 국내 최대 규모의 자산 시장으로, 거래 규모와 연관 산업 파급력이 매우 큽니다."),
    bullet("국내 부동산 자산 총액: 약 6,000조 원 이상"),
    bullet("연간 부동산 거래 금액: 약 1,800조 원 수준"),
    bullet("주택 거래 중 개인 간 거래 비중: 80% 이상 (부동산 중개)"),
    para("거래 규모는 거대하나, 실제 거래 판단은 여전히 개인의 경험과 제한된 정보에 의존하고 있어 정보 비대칭성이 매우 큰 시장입니다."),

    heading2("2. 부동산 거래 리스크 현황"),
    createTable(
      ["구분", "현황", "연간 증가율"],
      [
        ["전세사기 피해", "최근 3년간 4조 원 이상", "매년 확대"],
        ["분쟁 조정 건수", "연 10만 건+", "15% 이상"],
        ["세무 관련 민원", "다주택/양도세 민원 급증", "20% 이상"],
        ["부동산 민사 소송", "전체 민사 소송의 상당 비중", "지속 증가"],
      ],
      { boldFirstCol: true }
    ),

    heading2("3. 목표 시장 분석 (TAM/SAM/SOM)"),
    createTable(
      ["시장 구분", "규모", "산출 근거"],
      [
        ["TAM (전체 시장)", data.market.tam, data.market.tamDesc],
        ["SAM (유효 시장)", data.market.sam, data.market.samDesc],
        ["SOM (초기 확보)", data.market.som, data.market.somDesc],
      ],
      { boldFirstCol: true }
    ),

    heading2("4. 시장 수요 동인"),
    createTable(
      ["수요 동인", "현황", "시장 규모"],
      [
        ["전세사기 예방 수요", "3년간 4조 원 피해", "연간 300만 건 전/월세 계약"],
        ["부동산 전문가 효율화", "공인중개사 51만 명", "연 800만 건 부동산 등기"],
        ["자산관리 디지털 전환", "AMC·법무·회계 5,000곳+", "B2B SaaS 시장 연 20% 성장"],
        ["정부 AI 정책", "DX 가속, AI 육성 기조", "국내 AI 시장 연 20%+ 성장"],
      ],
      { boldFirstCol: true }
    ),

    heading2("5. 고객 분석"),
    para("B2B 타깃 고객:", { bold: true }),
    bullet("공인중개사 (51만 명): 매물 분석, 고객 리포트 생성에 활용"),
    bullet("자산관리회사 (AMC) 3,000개사: 포트폴리오 리스크 분석"),
    bullet("법무/회계 법인: 등기 전 권리관계 사전 분석"),

    para("B2C 타깃 고객:", { bold: true }),
    bullet("전/월세 계약 예정자: 전세사기 사전 검증"),
    bullet("개인 부동산 투자자: 시세전망, 세금 시뮬레이션"),
    bullet("주택 매수/매도 예정자: 권리분석, 계약서 검토"),
    spacer(),
  ];
}

module.exports = { createMarketSection };
