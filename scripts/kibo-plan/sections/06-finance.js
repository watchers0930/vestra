const { heading1, heading2, para, bullet, createTable, quote, spacer, pageBreak } = require("../helpers");
const data = require("../data");

function createFinanceSection() {
  return [
    pageBreak(),
    heading1("VI. 재무계획"),

    heading2("1. 자금 조달 계획"),
    createTable(
      ["항목", "금액", "비중", "상세 내용"],
      [
        ["기술 고도화", "4,000만 원", "40%", "NLP 모델 학습, V-Score 고도화, 정확도 99.5%"],
        ["3사 통합 개발", "3,000만 원", "30%", "REST API, OAuth SSO, 스키마 통일"],
        ["B2B 파일럿", "1,500만 원", "15%", "중개사 10곳 + 자산관리 5곳 실증"],
        ["인프라/마케팅", "1,500만 원", "15%", "서버 확장, 보안 강화, 초기 마케팅"],
        ["합계", data.finance.fundingAmount, "100%", ""],
      ],
      { boldFirstCol: true }
    ),

    heading2("2. 연도별 매출 계획"),
    para("1차년도 (시장 진입) — 연 7.7억 원:", { bold: true }),
    createTable(
      ["구분", "단가(월)", "고객 수", "연 매출"],
      [
        ["Basic (B2B)", "99,000원", "300명", "3.6억 원"],
        ["Professional (B2B)", "299,000원", "100명", "3.6억 원"],
        ["B2C 이용권", "100,000원", "50명", "5,000만 원"],
        ["합계", "", "450명+", "7.7억 원"],
      ],
      { boldFirstCol: true }
    ),

    para("2차년도 (본격 성장) — 연 39.6억 원:", { bold: true }),
    createTable(
      ["구분", "단가(월)", "고객 수", "연 매출"],
      [
        ["Basic (B2B)", "99,000원", "1,200명", "14.3억 원"],
        ["Professional (B2B)", "299,000원", "500명", "17.9억 원"],
        ["Enterprise (B2B)", "500,000원", "50곳", "3억 원"],
        ["API/데이터 라이선스", "-", "-", "2.4억 원"],
        ["B2C 이용권", "-", "2,000명", "2억 원"],
        ["합계", "", "", "39.6억 원"],
      ],
      { boldFirstCol: true }
    ),

    para("3차년도 (폭발적 성장) — 연 120억 원:", { bold: true }),
    createTable(
      ["구분", "고객 수", "연 매출"],
      [
        ["B2B SaaS (Basic~Enterprise)", "5,000명", "120억 원"],
        ["등기 연계 수수료", "연 10만 건", "(추가 수익)"],
        ["AI API 호출", "외부 연동", "(추가 수익)"],
      ],
      { boldFirstCol: true }
    ),

    heading2("3. 매출 성장 시나리오 요약"),
    createTable(
      ["지표", "1차년도", "2차년도", "3차년도"],
      [
        ["B2B 유료 고객", "500명", "2,000명", "5,000명"],
        ["연간 매출", data.finance.year1Revenue, data.finance.year2Revenue, data.finance.year3Revenue],
        ["성장률", "-", "414%", "203%"],
        ["MAU", "5,000", "20,000", "50,000"],
        ["전환율", "3~5%", "5~8%", "8~10%"],
      ],
      { boldFirstCol: true }
    ),
    quote("보수적 가정: 공인중개사 51만 명 중 전환율 1% 미만으로 산출. 실제 시장 반응에 따라 상향 여지 큼."),

    heading2("4. 손익분기점 분석"),
    createTable(
      ["구분", "1차년도", "2차년도", "3차년도"],
      [
        ["매출", "7.7억", "39.6억", "120억"],
        ["고정비", "6억", "8억", "12억"],
        ["순손익", "1.7억", "31.6억", "108억"],
        ["BEP", "도달 ✅", "흑자 확대", "대규모 흑자"],
      ],
      { boldFirstCol: true }
    ),
    quote("자력 개발 시 BEP 4차년도 → 보증금 투입 시 1차년도 BEP 달성"),

    heading2("5. 투자 대비 효과 (ROI)"),
    createTable(
      ["항목", "수치"],
      [
        ["보증금 투입", data.finance.fundingAmount],
        ["1차년도 매출", data.finance.year1Revenue],
        ["2차년도 매출", data.finance.year2Revenue],
        ["3차년도 매출", data.finance.year3Revenue],
        ["3년 누적 매출", data.finance.cumulativeRevenue],
        ["ROI", data.finance.roi],
      ],
      { boldFirstCol: true }
    ),

    heading2("6. 핵심 성과지표 (KPI)"),
    createTable(
      ["구분", "지표", "1차년도", "2차년도", "3차년도"],
      [
        ["기술", "분석 정확도", "97% (달성)", "99%", "99.5%"],
        ["기술", "독자 엔진", "8종 (달성)", "10종", "12종"],
        ["플랫폼", "3사 통합 Phase", "Phase 2", "Phase 3", "Phase 4"],
        ["사용자", "B2B 유료 고객", "500", "2,000", "5,000"],
        ["사용자", "MAU", "5,000", "20,000", "50,000"],
        ["매출", "연간 매출", "7.7억", "39.6억", "120억"],
      ],
      { boldFirstCol: true }
    ),
    spacer(),
  ];
}

module.exports = { createFinanceSection };
