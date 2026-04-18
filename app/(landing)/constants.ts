export const FEATURES = [
  { icon: "apartment", title: "권리분석", description: "등기부등본을 AI가 종합 분석하여 권리관계, 위험요소, 안전지수를 한눈에 파악합니다." },
  { icon: "description", title: "계약서 AI 검토", description: "부동산 계약서를 업로드하면 불리한 조항, 누락 사항, 위험 요소를 자동 검출합니다." },
  { icon: "calculate", title: "세무 시뮬레이션", description: "취득세, 양도소득세, 종합부동산세를 실시간으로 계산하고 절세 전략을 제안합니다." },
  { icon: "trending_up", title: "시세 전망", description: "공공데이터와 AI 분석을 결합하여 부동산 시세 추이와 향후 전망을 제공합니다." },
  { icon: "home", title: "전세 보호", description: "전세 사기 예방을 위한 안전 분석, 전입신고, 확정일자, 전세권설정까지 원스톱 가이드." },
  { icon: "analytics", title: "사업성 분석", description: "다중 문서 기반으로 사업성을 검증하고 SCR 수준의 분석 보고서를 자동 생성합니다." },
];

export const PLANS = [
  {
    name: "Lite",
    price: "29,000",
    description: "개인 투자자를 위한 시작 플랜",
    features: ["월 5회 정밀 권리 분석", "실시간 시세 모니터링", "기본 시장 트렌드 리포트"],
    highlight: false,
  },
  {
    name: "Professional",
    price: "89,000",
    description: "활발한 투자자를 위한 전문 플랜",
    features: ["월 무제한 권리 분석", "24개월 가치 예측 AI 모델", "심층 법률 리스크 검토", "우선 순위 고객 지원"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "별도 문의",
    description: "기업 및 기관 투자자를 위한 플랜",
    features: ["맞춤형 API 통합", "전담 분석 매니저 배정", "법인용 화이트 라벨링"],
    highlight: false,
  },
];

export const TESTIMONIALS = [
  { name: "김태호", role: "공인중개사", quote: "전세 안전성 분석이 정확해서 고객 상담 시 신뢰도 높은 데이터를 제공할 수 있게 되었습니다." },
  { name: "이수진", role: "부동산 투자자", quote: "V-Score 기반 통합 위험도 평가 덕분에 투자 의사결정이 훨씬 빨라졌어요." },
  { name: "박준혁", role: "법무법인 변호사", quote: "권리분석 그래프 엔진이 복잡한 등기부등본도 직관적으로 시각화해줍니다." },
];

export const TICKER_ITEMS = [
  "전세 안전 분석", "권리분석", "시세 예측", "계약서 분석", "사기 위험 탐지", "보증보험 안내", "실거래가 분석", "임대차 보호",
];
