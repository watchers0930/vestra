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

// ─── Mock Provider ───

class MockCreditProvider implements CreditAPIProvider {
  getProviderName(): "MOCK" {
    return "MOCK";
  }

  async checkCredit(params: CreditCheckParams): Promise<CreditCheckResult> {
    // 이름 해시 기반 결정론적 Mock 데이터 생성
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

export function getCreditProvider(): CreditAPIProvider {
  const kcbKey = process.env.KCB_API_KEY;
  const niceKey = process.env.NICE_API_KEY;

  if (kcbKey) return new KCBCreditProvider(kcbKey);
  if (niceKey) return new NICECreditProvider(niceKey);
  return new MockCreditProvider();
}

/**
 * 신용정보 조회 (편의 함수)
 */
export async function checkCredit(
  params: CreditCheckParams
): Promise<CreditCheckResult> {
  const provider = getCreditProvider();
  return provider.checkCredit(params);
}
