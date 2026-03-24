import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// AI Trust Statistics API — Seed data (will be replaced with real data later)
// ---------------------------------------------------------------------------

interface ModelAccuracy {
  id: string;
  name: string;
  accuracy: number;
  totalAnalyses: number;
  expertAgreementRate: number;
  lastUpdated: string;
  description: string;
  dataSources: string[];
}

interface MonthlyTrend {
  month: string;
  jeonse: number;
  rights: number;
  prediction: number;
  contract: number;
}

function generateSeedData() {
  const models: ModelAccuracy[] = [
    {
      id: "jeonse-safety",
      name: "전세 안전도 분석",
      accuracy: 94.2,
      totalAnalyses: 12847,
      expertAgreementRate: 94.2,
      lastUpdated: "2026-03-01",
      description:
        "전세가율, 임대인 신용, 보증보험 가입 여부 등을 종합하여 전세 안전 점수를 산출합니다.",
      dataSources: [
        "국토교통부 실거래가",
        "대법원 등기정보",
        "HUG/SGI 보증보험 데이터",
        "KB부동산 시세",
      ],
    },
    {
      id: "rights-analysis",
      name: "권리분석",
      accuracy: 96.8,
      totalAnalyses: 8532,
      expertAgreementRate: 96.8,
      lastUpdated: "2026-03-01",
      description:
        "등기부등본의 갑구·을구를 파싱하여 소유권, 근저당, 가압류 등 권리관계를 분석합니다.",
      dataSources: [
        "대법원 등기정보광장",
        "법원 판례 DB",
        "부동산 등기 규칙",
      ],
    },
    {
      id: "price-prediction",
      name: "시세전망",
      accuracy: 87.5,
      totalAnalyses: 15203,
      expertAgreementRate: 87.5,
      lastUpdated: "2026-03-01",
      description:
        "과거 실거래가, 입주 물량, 금리 추이 등을 기반으로 향후 시세를 예측합니다.",
      dataSources: [
        "국토교통부 실거래가",
        "한국은행 기준금리",
        "입주 예정 물량",
        "인구이동 통계",
      ],
    },
    {
      id: "contract-review",
      name: "계약검토",
      accuracy: 92.1,
      totalAnalyses: 6391,
      expertAgreementRate: 92.1,
      lastUpdated: "2026-03-01",
      description:
        "매매·임대차 계약서의 특약사항, 위험 조항을 AI가 검토하고 개선안을 제시합니다.",
      dataSources: [
        "표준계약서 템플릿",
        "공정거래위원회 불공정 조항",
        "법원 판례 DB",
      ],
    },
  ];

  // Monthly trend — last 6 months
  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const monthLabels = ["10월", "11월", "12월", "1월", "2월", "3월"];
  const trends: MonthlyTrend[] = months.map((m, i) => ({
    month: monthLabels[i],
    jeonse: +(91.0 + i * 0.65).toFixed(1),
    rights: +(94.5 + i * 0.46).toFixed(1),
    prediction: +(84.2 + i * 0.66).toFixed(1),
    contract: +(89.5 + i * 0.52).toFixed(1),
  }));

  const totalAnalyses = models.reduce((s, m) => s + m.totalAnalyses, 0);
  const avgAccuracy =
    +(models.reduce((s, m) => s + m.accuracy, 0) / models.length).toFixed(1);
  const avgProcessingTime = 3.2; // seconds

  return {
    overview: {
      totalAnalyses,
      avgAccuracy,
      avgProcessingTime,
      lastVerificationDate: "2026-03-01",
      verificationCycle: "매월",
    },
    models,
    trends,
  };
}

export async function GET() {
  const data = generateSeedData();
  return NextResponse.json(data);
}
