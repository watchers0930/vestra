/**
 * VESTRA 신용정보 조회 모듈
 * ──────────────────────────
 * KCB/NICE 신용평가기관 연동 추상화 레이어.
 * 실제 API 키가 없으면 Mock 데이터 반환.
 *
 * Strategy 패턴: 환경변수에 따라 Provider 자동 선택
 */

// ─── 타입 정의 ───

export interface CreditCheckParams {
  name: string;
  phone: string;
  birthDate?: string; // YYYYMMDD
  purpose: "landlord_check" | "tenant_check" | "self_check";
}

export interface CreditCheckResult {
  provider: "KCB" | "NICE" | "MOCK";
  score: number; // 1~1000
  grade: string; // 1~10등급
  gradeLabel: string;
  delinquencyCount: number;
  totalDebt: number; // 원
  recentInquiries: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  checkedAt: string;
  disclaimer: string;
}

interface CreditAPIProvider {
  checkCredit(params: CreditCheckParams): Promise<CreditCheckResult>;
  getProviderName(): "KCB" | "NICE" | "MOCK";
}

// ─── 간접 지표 기반 휴리스틱 신용 평가 ───

export interface CreditScoreContext {
  propertyCount?: number;      // 보유 부동산 수
  recentPriceChange?: number;  // 최근 시세 변동률 (%, 음수 = 하락)
  isHighFraudArea?: boolean;   // 사기 다발 지역 여부
}

/**
 * 간접 지표 기반 휴리스틱 신용 점수 추정
 *
 * KCB/NICE 없이도 의미 있는 변동을 제공:
 * - 다수 부동산 보유 → 자산 안정성 → 높은 점수
 * - 최근 시세 하락 → 자산 가치 감소 위험 → 낮은 점수
 * - 사기 다발 지역 → 신용 리스크 페널티
 */
export function estimateCreditScore(context: CreditScoreContext): CreditCheckResult {
  // 기본 점수 (중간 수준)
  let baseScore = 650;

  // 부동산 보유 수에 따른 보정
  if (context.propertyCount !== undefined) {
    if (context.propertyCount >= 3) {
      baseScore += 120; // 다수 부동산 = 자산 풍부
    } else if (context.propertyCount >= 1) {
      baseScore += 60;  // 부동산 보유 = 일정 자산
    } else {
      baseScore -= 30;  // 무주택 = 약간 감점
    }
  }

  // 최근 시세 변동에 따른 보정
  if (context.recentPriceChange !== undefined) {
    if (context.recentPriceChange < -10) {
      baseScore -= 100; // 급락 → 큰 감점
    } else if (context.recentPriceChange < -5) {
      baseScore -= 50;  // 하락 → 감점
    } else if (context.recentPriceChange > 10) {
      baseScore += 50;  // 급등 → 가산
    } else if (context.recentPriceChange > 5) {
      baseScore += 25;  // 상승 → 소폭 가산
    }
  }

  // 사기 다발 지역 페널티
  if (context.isHighFraudArea) {
    baseScore -= 80;
  }

  // 범위 제한 (300~999)
  const score = Math.max(300, Math.min(999, baseScore));

  const gradeNum = scoreToGradeStatic(score);
  return {
    provider: "MOCK",
    score,
    grade: `${gradeNum}등급`,
    gradeLabel: gradeLabelStatic(gradeNum),
    delinquencyCount: context.isHighFraudArea ? 1 : 0,
    totalDebt: context.recentPriceChange !== undefined && context.recentPriceChange < -5
      ? 50_000_000
      : 0,
    recentInquiries: context.propertyCount !== undefined && context.propertyCount >= 3 ? 3 : 1,
    riskLevel: gradeToRiskStatic(gradeNum),
    checkedAt: new Date().toISOString(),
    disclaimer:
      "본 신용정보는 간접 지표(부동산 보유현황, 시세변동, 지역위험도) 기반 " +
      "휴리스틱 추정치이며 실제 신용등급과 무관합니다. " +
      "실제 서비스에서는 KCB/NICE 연동이 필요합니다.",
  };
}

// 정적 헬퍼 (클래스 외부에서도 사용)
function scoreToGradeStatic(score: number): number {
  if (score >= 900) return 1;
  if (score >= 850) return 2;
  if (score >= 800) return 3;
  if (score >= 750) return 4;
  if (score >= 700) return 5;
  if (score >= 650) return 6;
  if (score >= 600) return 7;
  if (score >= 500) return 8;
  if (score >= 400) return 9;
  return 10;
}

function gradeLabelStatic(grade: number): string {
  const labels: Record<number, string> = {
    1: "최우수", 2: "우수", 3: "양호", 4: "보통 상", 5: "보통",
    6: "보통 하", 7: "주의", 8: "경계", 9: "위험", 10: "매우위험",
  };
  return labels[grade] || "알 수 없음";
}

function gradeToRiskStatic(grade: number): "low" | "medium" | "high" | "critical" {
  if (grade <= 3) return "low";
  if (grade <= 6) return "medium";
  if (grade <= 8) return "high";
  return "critical";
}

// ─── Mock Provider ───

class MockCreditProvider implements CreditAPIProvider {
  private context?: CreditScoreContext;

  getProviderName(): "MOCK" {
    return "MOCK";
  }

  setContext(ctx: CreditScoreContext) {
    this.context = ctx;
  }

  async checkCredit(params: CreditCheckParams): Promise<CreditCheckResult> {
    // 컨텍스트가 제공되면 휴리스틱 모델 사용
    if (this.context && (
      this.context.propertyCount !== undefined ||
      this.context.recentPriceChange !== undefined ||
      this.context.isHighFraudArea !== undefined
    )) {
      return estimateCreditScore(this.context);
    }

    // 기존 해시 기반 결정론적 Mock 데이터 생성 (폴백)
    const hash = this.simpleHash(params.name + (params.phone || ""));
    const score = 300 + (hash % 700); // 300~999
    const grade = this.scoreToGrade(score);

    return {
      provider: "MOCK",
      score,
      grade: `${grade}등급`,
      gradeLabel: this.gradeLabel(grade),
      delinquencyCount: hash % 5 === 0 ? Math.floor(hash / 100) % 3 : 0,
      totalDebt: (hash % 10) * 10_000_000, // 0 ~ 9천만
      recentInquiries: hash % 8,
      riskLevel: this.gradeToRisk(grade),
      checkedAt: new Date().toISOString(),
      disclaimer:
        "본 신용정보는 시뮬레이션 데이터이며 실제 신용등급과 무관합니다. " +
        "실제 서비스에서는 KCB/NICE 연동이 필요합니다.",
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit integer
    }
    return Math.abs(hash);
  }

  private scoreToGrade(score: number): number {
    if (score >= 900) return 1;
    if (score >= 850) return 2;
    if (score >= 800) return 3;
    if (score >= 750) return 4;
    if (score >= 700) return 5;
    if (score >= 650) return 6;
    if (score >= 600) return 7;
    if (score >= 500) return 8;
    if (score >= 400) return 9;
    return 10;
  }

  private gradeLabel(grade: number): string {
    const labels: Record<number, string> = {
      1: "최우수",
      2: "우수",
      3: "양호",
      4: "보통 상",
      5: "보통",
      6: "보통 하",
      7: "주의",
      8: "경계",
      9: "위험",
      10: "매우위험",
    };
    return labels[grade] || "알 수 없음";
  }

  private gradeToRisk(
    grade: number
  ): "low" | "medium" | "high" | "critical" {
    if (grade <= 3) return "low";
    if (grade <= 6) return "medium";
    if (grade <= 8) return "high";
    return "critical";
  }
}

// ─── KCB Provider (향후 구현) ───

class KCBCreditProvider implements CreditAPIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getProviderName(): "KCB" {
    return "KCB";
  }

  async checkCredit(_params: CreditCheckParams): Promise<CreditCheckResult> {
    // TODO: KCB API 연동
    // https://www.koreacb.com/product/api
    throw new Error(
      `KCB API 연동이 아직 구현되지 않았습니다. (key: ${this.apiKey.slice(0, 4)}...)`
    );
  }
}

// ─── NICE Provider (향후 구현) ───

class NICECreditProvider implements CreditAPIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getProviderName(): "NICE" {
    return "NICE";
  }

  async checkCredit(_params: CreditCheckParams): Promise<CreditCheckResult> {
    // TODO: NICE 평가정보 API 연동
    // https://www.niceinfo.co.kr
    throw new Error(
      `NICE API 연동이 아직 구현되지 않았습니다. (key: ${this.apiKey.slice(0, 4)}...)`
    );
  }
}

// ─── Provider Factory ───

export function getCreditProvider(context?: CreditScoreContext): CreditAPIProvider {
  const kcbKey = process.env.KCB_API_KEY;
  const niceKey = process.env.NICE_API_KEY;

  if (kcbKey) return new KCBCreditProvider(kcbKey);
  if (niceKey) return new NICECreditProvider(niceKey);

  const mock = new MockCreditProvider();
  if (context) mock.setContext(context);
  return mock;
}

/**
 * 신용정보 조회 (편의 함수)
 * @param context 간접 지표 컨텍스트 (부동산 보유수, 시세변동, 지역위험도)
 */
export async function checkCredit(
  params: CreditCheckParams,
  context?: CreditScoreContext,
): Promise<CreditCheckResult> {
  const provider = getCreditProvider(context);
  return provider.checkCredit(params);
}
