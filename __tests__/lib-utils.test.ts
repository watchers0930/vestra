/**
 * lib/ 유틸리티 파일 통합 테스트
 * ─────────────────────────────────
 * 대상: loan-simulator, checklist-generator, rate-limit, utils, system-settings, store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Prisma mock — rate-limit, system-settings에서 사용
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimit: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    dailyUsage: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    systemSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// FSS loan API mock — loan-simulator에서 사용
vi.mock("@/lib/fss-loan-api", () => ({
  getCachedRates: vi.fn(),
  getBankRateRange: vi.fn(),
}));

// ═══════════════════════════════════════════════════════════════════════════════
// 1. lib/utils.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { cn, formatKRW, formatPercent } from "@/lib/utils";

describe("lib/utils", () => {
  // ── cn (class name merger) ──

  describe("cn", () => {
    it("단일 클래스 반환", () => {
      expect(cn("text-red-500")).toBe("text-red-500");
    });

    it("여러 클래스 병합", () => {
      const result = cn("px-4", "py-2", "text-sm");
      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
      expect(result).toContain("text-sm");
    });

    it("Tailwind 충돌 시 후자 우선", () => {
      const result = cn("text-red-500", "text-blue-500");
      expect(result).toBe("text-blue-500");
    });

    it("falsy 값 무시", () => {
      const result = cn("px-4", undefined, null, false, "py-2");
      expect(result).toContain("px-4");
      expect(result).toContain("py-2");
    });

    it("빈 입력 시 빈 문자열 반환", () => {
      expect(cn()).toBe("");
    });
  });

  // ── formatKRW ──

  describe("formatKRW", () => {
    it("0 이하일 때 기본 emptyLabel 반환", () => {
      expect(formatKRW(0)).toBe("0원");
      expect(formatKRW(-100)).toBe("0원");
    });

    it("0 이하일 때 커스텀 emptyLabel 반환", () => {
      expect(formatKRW(0, "-")).toBe("-");
    });

    it("1억 이상: 억+만원 형식", () => {
      expect(formatKRW(350_000_000)).toBe("3억 5,000만원");
    });

    it("1억 정확히: 억원 형식 (만원 부분 없음)", () => {
      expect(formatKRW(100_000_000)).toBe("1억원");
    });

    it("2억 5000만원", () => {
      expect(formatKRW(250_000_000)).toBe("2억 5,000만원");
    });

    it("1만원 이상 ~ 1억 미만: 만원 형식", () => {
      expect(formatKRW(50_000_000)).toBe("5,000만원");
      expect(formatKRW(10_000)).toBe("1만원");
    });

    it("1만원 미만: 원 형식", () => {
      expect(formatKRW(5000)).toBe("5,000원");
      expect(formatKRW(1)).toBe("1원");
    });
  });

  // ── formatPercent ──

  describe("formatPercent", () => {
    it("소수점 한 자리로 포맷", () => {
      expect(formatPercent(3.456)).toBe("3.5%");
    });

    it("정수 값도 소수점 한 자리 표시", () => {
      expect(formatPercent(10)).toBe("10.0%");
    });

    it("0%", () => {
      expect(formatPercent(0)).toBe("0.0%");
    });

    it("100%", () => {
      expect(formatPercent(100)).toBe("100.0%");
    });

    it("매우 작은 값", () => {
      expect(formatPercent(0.04)).toBe("0.0%");
      expect(formatPercent(0.05)).toBe("0.1%");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. lib/loan-simulator.ts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  simulateLoan,
  getLoanConditions,
  type LoanSimulateInput,
} from "@/lib/loan-simulator";
import { getCachedRates, getBankRateRange } from "@/lib/fss-loan-api";

const mockedGetCachedRates = vi.mocked(getCachedRates);
const mockedGetBankRateRange = vi.mocked(getBankRateRange);

describe("lib/loan-simulator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: FSS 캐시 없음 (fallback 금리 사용)
    mockedGetCachedRates.mockResolvedValue(null);
    mockedGetBankRateRange.mockReturnValue(null);
  });

  // ── getLoanConditions ──

  describe("getLoanConditions", () => {
    it("전체 상품 목록 반환", () => {
      const all = getLoanConditions();
      expect(all.length).toBeGreaterThanOrEqual(8);
    });

    it("아파트 필터링", () => {
      const apts = getLoanConditions("아파트");
      expect(apts.length).toBeGreaterThan(0);
      apts.forEach((p) => {
        expect(p.propertyTypes).toContain("아파트");
      });
    });

    it("오피스텔 필터링 — 일부 상품 제외됨", () => {
      const all = getLoanConditions();
      const offices = getLoanConditions("오피스텔");
      expect(offices.length).toBeLessThan(all.length);
      offices.forEach((p) => {
        expect(p.propertyTypes).toContain("오피스텔");
      });
    });

    it("존재하지 않는 물건유형 — 빈 배열", () => {
      expect(getLoanConditions("토지")).toHaveLength(0);
    });
  });

  // ── simulateLoan ──

  describe("simulateLoan", () => {
    const goodInput: LoanSimulateInput = {
      deposit: 300_000_000,        // 3억 전세보증금
      propertyPrice: 500_000_000,  // 5억 시세
      propertyType: "아파트",
      propertyAddress: "서울시 강남구",
      annualIncome: 60_000_000,    // 연소득 6천만
      creditScore: 750,
      existingLoans: 0,
      isFirstHome: false,
    };

    it("일반 조건 — 다수 은행 eligible", async () => {
      const res = await simulateLoan(goodInput);
      expect(res.summary.eligibleCount).toBeGreaterThan(0);
      expect(res.bestOption).not.toBeNull();
      expect(res.disclaimer).toBeTruthy();
      expect(res.results.length).toBeGreaterThanOrEqual(8);
    });

    it("eligible 상품의 maxLoanAmount > 0", async () => {
      const res = await simulateLoan(goodInput);
      const eligible = res.results.filter((r) => r.isEligible);
      eligible.forEach((r) => {
        expect(r.maxLoanAmount).toBeGreaterThan(0);
      });
    });

    it("ineligible 상품의 maxLoanAmount === 0", async () => {
      const res = await simulateLoan(goodInput);
      const ineligible = res.results.filter((r) => !r.isEligible);
      ineligible.forEach((r) => {
        expect(r.maxLoanAmount).toBe(0);
      });
    });

    it("최저 금리 상품이 bestOption으로 선정", async () => {
      const res = await simulateLoan(goodInput);
      if (res.bestOption) {
        const eligible = res.results.filter((r) => r.isEligible);
        const minRate = Math.min(...eligible.map((r) => r.estimatedRate.min));
        expect(res.summary.lowestRate).toBe(minRate);
      }
    });

    it("신용점수 낮음 — 일부 상품 ineligible", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        creditScore: 500,
      };
      const res = await simulateLoan(input);
      // 최소 신용점수 요건(600, 620, 650)이 있는 상품은 탈락
      const ineligible = res.results.filter((r) => !r.isEligible);
      const creditReasons = ineligible.filter((r) =>
        r.reasons.some((reason) => reason.includes("신용점수"))
      );
      expect(creditReasons.length).toBeGreaterThan(0);
    });

    it("생애최초 전용 상품 — isFirstHome=false면 탈락", async () => {
      const res = await simulateLoan({ ...goodInput, isFirstHome: false });
      const didimDol = res.results.find((r) => r.productName.includes("디딤돌"));
      expect(didimDol).toBeDefined();
      expect(didimDol!.isEligible).toBe(false);
      expect(didimDol!.reasons.some((r) => r.includes("생애최초"))).toBe(true);
    });

    it("생애최초 + 저소득 — 디딤돌 eligible", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        isFirstHome: true,
        annualIncome: 40_000_000,
      };
      const res = await simulateLoan(input);
      const didimDol = res.results.find((r) => r.productName.includes("디딤돌"));
      expect(didimDol).toBeDefined();
      expect(didimDol!.isEligible).toBe(true);
    });

    it("오피스텔 — 빌라/다세대 전용 상품 탈락", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        propertyType: "오피스텔",
      };
      const res = await simulateLoan(input);
      // 우리은행, 토스뱅크 등은 오피스텔 미지원
      const woori = res.results.find((r) => r.bankName === "우리");
      if (woori) {
        expect(woori.isEligible).toBe(false);
        expect(woori.reasons.some((r) => r.includes("대상 물건이 아닙니다"))).toBe(true);
      }
    });

    it("소득 초과 — 버팀목/디딤돌 탈락", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        annualIncome: 80_000_000, // 8천만 (버팀목 5천만, 디딤돌 6천만 초과)
        isFirstHome: true,
      };
      const res = await simulateLoan(input);
      const butimok = res.results.find((r) => r.productName.includes("버팀목"));
      expect(butimok).toBeDefined();
      expect(butimok!.isEligible).toBe(false);
      expect(butimok!.reasons.some((r) => r.includes("소득 상한"))).toBe(true);
    });

    it("LTV 초과 — 보증금이 시세보다 큰 경우", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        deposit: 600_000_000,       // 6억 보증금
        propertyPrice: 500_000_000, // 5억 시세 → LTV 120%
      };
      const res = await simulateLoan(input);
      // 모든 상품에서 LTV 초과
      res.results.forEach((r) => {
        expect(r.isEligible).toBe(false);
        expect(r.reasons.some((reason) => reason.includes("LTV"))).toBe(true);
      });
      expect(res.bestOption).toBeNull();
      expect(res.summary.eligibleCount).toBe(0);
    });

    it("소득 0원 — DTI 무한대로 탈락", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        annualIncome: 0,
      };
      const res = await simulateLoan(input);
      // DTI = Infinity → 모든 상품 탈락
      res.results.forEach((r) => {
        expect(r.isEligible).toBe(false);
      });
    });

    it("기존 대출이 큰 경우 — DTI 초과로 탈락", async () => {
      const input: LoanSimulateInput = {
        ...goodInput,
        annualIncome: 30_000_000,   // 연소득 3천만
        existingLoans: 500_000_000, // 기존 대출 5억
      };
      const res = await simulateLoan(input);
      const eligible = res.results.filter((r) => r.isEligible);
      // 대부분 DTI 초과로 탈락
      expect(eligible.length).toBeLessThan(res.results.length);
    });

    it("FSS 실시간 금리 적용", async () => {
      mockedGetCachedRates.mockResolvedValue({
        products: [],
        fetchedAt: new Date().toISOString(),
        dataSource: "fss",
      });
      mockedGetBankRateRange.mockImplementation((_rates, bankName) => {
        if (bankName === "KB국민") return { min: 2.8, max: 3.5 };
        return null;
      });

      const res = await simulateLoan(goodInput);
      const kb = res.results.find(
        (r) => r.bankName === "KB국민" && r.productName === "KB전세대출"
      );
      expect(kb).toBeDefined();
      // FSS 금리가 적용되었으므로 기본값(3.2~4.1)과 다를 수 있음
      expect(kb!.estimatedRate.min).toBe(2.8);
      expect(kb!.estimatedRate.max).toBe(3.5);
    });

    it("bestOption reason에 금리와 한도 포함", async () => {
      const res = await simulateLoan(goodInput);
      if (res.bestOption) {
        expect(res.bestOption.reason).toContain("최저 금리");
        expect(res.bestOption.reason).toContain("한도");
      }
    });

    it("summary.maxAvailable는 가장 큰 eligible maxLoanAmount", async () => {
      const res = await simulateLoan(goodInput);
      const eligible = res.results.filter((r) => r.isEligible);
      if (eligible.length > 0) {
        const max = Math.max(...eligible.map((r) => r.maxLoanAmount));
        expect(res.summary.maxAvailable).toBe(max);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. lib/checklist-generator.ts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  generateChecklist,
  groupChecklistByCategory,
  type ChecklistItem,
} from "@/lib/checklist-generator";
import type { RiskScore, RiskFactor } from "@/lib/risk-scoring";

function makeRiskScore(overrides: Partial<RiskScore> = {}): RiskScore {
  return {
    totalScore: 80,
    grade: "B",
    gradeLabel: "양호",
    gradeColor: "blue",
    factors: [],
    mortgageRatio: 30,
    totalDeduction: 20,
    summary: "양호한 상태입니다",
    ...overrides,
  };
}

function makeFactor(overrides: Partial<RiskFactor> = {}): RiskFactor {
  return {
    id: "test-factor",
    category: "기타",
    description: "테스트 위험요소",
    deduction: 10,
    severity: "medium",
    detail: "테스트 상세 설명",
    ...overrides,
  };
}

describe("lib/checklist-generator", () => {
  describe("generateChecklist", () => {
    it("위험 요소 없어도 기본 서류 4건 포함", () => {
      const items = generateChecklist(makeRiskScore());
      expect(items.length).toBeGreaterThanOrEqual(4);
      const names = items.map((i) => i.name);
      expect(names).toContain("등기부등본 (등기사항전부증명서)");
      expect(names).toContain("건축물대장");
      expect(names).toContain("전입세대 열람내역");
      expect(names).toContain("토지이용계획확인서");
    });

    it("기본 서류는 모두 required + triggeredBy=default", () => {
      const items = generateChecklist(makeRiskScore());
      const defaults = items.filter((i) => i.triggeredBy === "default");
      expect(defaults.length).toBe(4);
      defaults.forEach((d) => {
        expect(d.priority).toBe("required");
      });
    });

    it("근저당 위험요소 → 근저당 관련 서류 추가", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({
            id: "mort-1",
            category: "근저당",
            description: "근저당권 설정",
            detail: "채권최고액 3억",
            severity: "high",
          }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("근저당권 설정 확인서");
      expect(names).toContain("금융기관 대출 잔액 확인서");
    });

    it("압류 위험요소 → 법적 확인 서류 추가", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({
            id: "seizure-1",
            category: "압류",
            description: "압류 등기",
            detail: "국세청 압류",
            severity: "critical",
          }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("법원 사건 조회");
      expect(names).toContain("압류 해제 확인서");
      expect(names).toContain("채권자 정보 확인");
    });

    it("경매 위험요소 → 경매 관련 서류 추가", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({
            id: "auction-1",
            category: "경매",
            description: "임의경매 개시결정",
            detail: "경매 진행 중",
            severity: "critical",
          }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("경매 사건 열람");
      expect(names).toContain("배당순위 확인");
      expect(names).toContain("감정평가서 확인");
    });

    it("신탁 위험요소 → 신탁 관련 서류", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({
            id: "trust-1",
            category: "권리",
            description: "신탁 등기",
            detail: "신탁 설정됨",
            severity: "medium",
          }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("신탁원부 열람");
      expect(names).toContain("수탁자 동의서 확인");
    });

    it("가압류 위험요소 → 가압류 관련 서류", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({
            id: "provisional-1",
            category: "가압류",
            description: "가압류 등기",
            detail: "가압류 설정",
            severity: "high",
          }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("가압류 관련 법원 사건 조회");
      expect(names).toContain("가압류 해제/취소 여부 확인");
    });

    it("severity → priority 매핑 (critical/high=required, medium=recommended, low=optional)", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({ id: "f1", category: "소유권", description: "소유자 확인", detail: "소유권", severity: "critical" }),
          makeFactor({ id: "f2", category: "용도", description: "건물 용도 확인", detail: "용도", severity: "low" }),
        ],
      });
      const items = generateChecklist(score);
      const ownerItem = items.find((i) => i.name === "소유자 신분 확인");
      expect(ownerItem?.priority).toBe("required");
      const usageItem = items.find((i) => i.name === "실제 용도 현장 확인");
      expect(usageItem?.priority).toBe("optional");
    });

    it("중복 서류 제거 (같은 이름의 서류는 한 번만)", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({ id: "f1", category: "근저당", description: "근저당", detail: "근저당", severity: "high" }),
          makeFactor({ id: "f2", category: "담보", description: "담보권", detail: "채권최고액", severity: "medium" }),
        ],
      });
      const items = generateChecklist(score);
      const counts = new Map<string, number>();
      items.forEach((i) => counts.set(i.name, (counts.get(i.name) || 0) + 1));
      counts.forEach((count) => {
        expect(count).toBe(1);
      });
    });

    it("mortgageRatio > 70 → 보증금 보호 서류 추가", () => {
      const score = makeRiskScore({ mortgageRatio: 85 });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("전세보증금반환보증 가입 확인");
      expect(names).toContain("임대인 국세/지방세 체납 확인");
      const hugItem = items.find((i) => i.name === "전세보증금반환보증 가입 확인");
      expect(hugItem?.triggeredBy).toBe("mortgage_ratio_high");
      expect(hugItem?.priority).toBe("required");
    });

    it("mortgageRatio <= 70 → 보증금 보호 서류 미포함", () => {
      const score = makeRiskScore({ mortgageRatio: 50 });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).not.toContain("전세보증금반환보증 가입 확인");
    });

    it("등급 D → 법무사/변호사 자문 항목 추가", () => {
      const score = makeRiskScore({ grade: "D" });
      const items = generateChecklist(score);
      const counsel = items.find((i) => i.name === "법무사/변호사 자문 의뢰");
      expect(counsel).toBeDefined();
      expect(counsel!.priority).toBe("required");
      expect(counsel!.triggeredBy).toBe("grade_warning");
    });

    it("등급 F → 법무사/변호사 자문 항목 추가", () => {
      const score = makeRiskScore({ grade: "F" });
      const items = generateChecklist(score);
      const counsel = items.find((i) => i.name === "법무사/변호사 자문 의뢰");
      expect(counsel).toBeDefined();
    });

    it("등급 A/B/C → 법무사/변호사 자문 미포함", () => {
      for (const grade of ["A", "B", "C"] as const) {
        const items = generateChecklist(makeRiskScore({ grade }));
        const counsel = items.find((i) => i.name === "법무사/변호사 자문 의뢰");
        expect(counsel).toBeUndefined();
      }
    });

    it("결과는 우선순위순 정렬 (required → recommended → optional)", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({ id: "f1", category: "압류", description: "압류", detail: "압류", severity: "critical" }),
          makeFactor({ id: "f2", category: "용도", description: "용도", detail: "용도", severity: "low" }),
          makeFactor({ id: "f3", category: "가처분", description: "가처분", detail: "가처분", severity: "medium" }),
        ],
      });
      const items = generateChecklist(score);
      const priorities = items.map((i) => i.priority);
      const order = { required: 0, recommended: 1, optional: 2 };
      for (let i = 1; i < priorities.length; i++) {
        expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
      }
    });

    it("임차권 키워드 매칭 (전세)", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({ id: "lease-1", category: "임차", description: "전세권 설정", detail: "임차권 등기", severity: "high" }),
        ],
      });
      const items = generateChecklist(score);
      const names = items.map((i) => i.name);
      expect(names).toContain("전입세대 열람내역");
      expect(names).toContain("임차권등기명령 확인");
    });
  });

  describe("groupChecklistByCategory", () => {
    it("빈 배열 → 빈 그룹", () => {
      expect(groupChecklistByCategory([])).toEqual({});
    });

    it("같은 카테고리끼리 그룹화", () => {
      const items: ChecklistItem[] = [
        { name: "A", description: "", where: "", priority: "required", triggeredBy: "default", category: "기본 서류" },
        { name: "B", description: "", where: "", priority: "required", triggeredBy: "default", category: "기본 서류" },
        { name: "C", description: "", where: "", priority: "recommended", triggeredBy: "f1", category: "법적 확인" },
      ];
      const grouped = groupChecklistByCategory(items);
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["기본 서류"]).toHaveLength(2);
      expect(grouped["법적 확인"]).toHaveLength(1);
    });

    it("모든 항목이 하나의 카테고리", () => {
      const items: ChecklistItem[] = [
        { name: "A", description: "", where: "", priority: "required", triggeredBy: "default", category: "권리 확인" },
        { name: "B", description: "", where: "", priority: "required", triggeredBy: "f1", category: "권리 확인" },
      ];
      const grouped = groupChecklistByCategory(items);
      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped["권리 확인"]).toHaveLength(2);
    });

    it("generateChecklist 결과를 그룹화", () => {
      const score = makeRiskScore({
        factors: [
          makeFactor({ id: "f1", category: "압류", description: "압류", detail: "압류", severity: "high" }),
        ],
      });
      const items = generateChecklist(score);
      const grouped = groupChecklistByCategory(items);
      expect(grouped["기본 서류"]).toBeDefined();
      expect(grouped["기본 서류"].length).toBeGreaterThanOrEqual(4);
      expect(grouped["법적 확인"]).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. lib/rate-limit.ts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  rateLimit,
  isFreeUnlimitedType,
  guestIdentifier,
  checkDailyUsage,
  getDailyUsageCount,
  rateLimitHeaders,
  FREE_UNLIMITED_TYPES,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma, true);

describe("lib/rate-limit", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.RATE_LIMIT_BYPASS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── isFreeUnlimitedType ──

  describe("isFreeUnlimitedType", () => {
    it("무료 타입 확인", () => {
      expect(isFreeUnlimitedType("jeonse-safety")).toBe(true);
      expect(isFreeUnlimitedType("rights-basic")).toBe(true);
      expect(isFreeUnlimitedType("guarantee-check")).toBe(true);
      expect(isFreeUnlimitedType("analyze-rights")).toBe(true);
      expect(isFreeUnlimitedType("fraud-risk")).toBe(true);
      expect(isFreeUnlimitedType("loan-simulate")).toBe(true);
    });

    it("유료 타입은 false", () => {
      expect(isFreeUnlimitedType("premium-analysis")).toBe(false);
      expect(isFreeUnlimitedType("contract-review")).toBe(false);
      expect(isFreeUnlimitedType("")).toBe(false);
    });

    it("FREE_UNLIMITED_TYPES 배열과 일치", () => {
      FREE_UNLIMITED_TYPES.forEach((type) => {
        expect(isFreeUnlimitedType(type)).toBe(true);
      });
    });
  });

  // ── guestIdentifier ──

  describe("guestIdentifier", () => {
    it("UA 없으면 guest:IP 형식", () => {
      expect(guestIdentifier("1.2.3.4")).toBe("guest:1.2.3.4");
      expect(guestIdentifier("1.2.3.4", null)).toBe("guest:1.2.3.4");
      expect(guestIdentifier("1.2.3.4", "")).toBe("guest:1.2.3.4");
    });

    it("UA 있으면 해시 포함 형식", () => {
      const id = guestIdentifier("1.2.3.4", "Mozilla/5.0");
      expect(id).toMatch(/^guest:1\.2\.3\.4:.+$/);
    });

    it("같은 IP + 다른 UA → 다른 식별자", () => {
      const id1 = guestIdentifier("1.2.3.4", "Chrome");
      const id2 = guestIdentifier("1.2.3.4", "Firefox");
      expect(id1).not.toBe(id2);
    });

    it("같은 IP + 같은 UA → 같은 식별자 (결정적)", () => {
      const id1 = guestIdentifier("1.2.3.4", "Chrome/120");
      const id2 = guestIdentifier("1.2.3.4", "Chrome/120");
      expect(id1).toBe(id2);
    });

    it("다른 IP + 같은 UA → 다른 식별자", () => {
      const id1 = guestIdentifier("1.2.3.4", "Chrome");
      const id2 = guestIdentifier("5.6.7.8", "Chrome");
      expect(id1).not.toBe(id2);
    });
  });

  // ── rateLimitHeaders ──

  describe("rateLimitHeaders", () => {
    it("올바른 헤더 형식", () => {
      const result: RateLimitResult = { success: true, remaining: 25, reset: 1700000000000 };
      const headers = rateLimitHeaders(result);
      expect(headers["X-RateLimit-Remaining"]).toBe("25");
      expect(headers["X-RateLimit-Reset"]).toBe(String(Math.ceil(1700000000000 / 1000)));
    });

    it("remaining 0일 때", () => {
      const result: RateLimitResult = { success: false, remaining: 0, reset: 1700000060000 };
      const headers = rateLimitHeaders(result);
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });
  });

  // ── rateLimit (DB 기반) ──

  describe("rateLimit", () => {
    it("RATE_LIMIT_BYPASS=true → 무조건 성공", async () => {
      process.env.RATE_LIMIT_BYPASS = "true";
      const result = await rateLimit("test-id", 10, 60000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it("정상 요청 — 카운트 내에서 성공", async () => {
      mockedPrisma.rateLimit.upsert.mockResolvedValue({} as never);
      mockedPrisma.rateLimit.updateMany.mockResolvedValue({ count: 0 } as never);
      mockedPrisma.rateLimit.update.mockResolvedValue({
        id: "test-id",
        count: 5,
        resetTime: new Date(Date.now() + 60000),
      } as never);

      const result = await rateLimit("test-id", 30, 60000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(25);
    });

    it("한도 초과 — count > limit 시 실패", async () => {
      mockedPrisma.rateLimit.upsert.mockResolvedValue({} as never);
      mockedPrisma.rateLimit.updateMany.mockResolvedValue({ count: 0 } as never);
      const futureReset = new Date(Date.now() + 60000);
      mockedPrisma.rateLimit.update.mockResolvedValue({
        id: "test-id",
        count: 31,
        resetTime: futureReset,
      } as never);

      const result = await rateLimit("test-id", 30, 60000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBe(futureReset.getTime());
    });

    it("DB 오류 시 fail-closed (차단)", async () => {
      mockedPrisma.rateLimit.upsert.mockRejectedValue(new Error("DB error"));

      const result = await rateLimit("test-id", 30, 60000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("기본 파라미터 (limit=30, windowMs=60000)", async () => {
      process.env.RATE_LIMIT_BYPASS = "true";
      const result = await rateLimit("test-id");
      expect(result.remaining).toBe(30);
    });
  });

  // ── checkDailyUsage ──

  describe("checkDailyUsage", () => {
    it("FREE 무제한 타입 → 바이패스 (remaining=9999)", async () => {
      const result = await checkDailyUsage("user1", 5, "jeonse-safety");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9999);
    });

    it("RATE_LIMIT_BYPASS=true → 바이패스", async () => {
      process.env.RATE_LIMIT_BYPASS = "true";
      const result = await checkDailyUsage("user1", 5, "premium");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it("사용량 내 — 성공", async () => {
      mockedPrisma.dailyUsage.upsert.mockResolvedValue({
        id: "daily:user1:2026-05-26",
        date: "2026-05-26",
        count: 3,
      } as never);

      const result = await checkDailyUsage("user1", 5, "premium");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("일일 한도 초과 — 실패", async () => {
      mockedPrisma.dailyUsage.upsert.mockResolvedValue({
        id: "daily:user1:2026-05-26",
        date: "2026-05-26",
        count: 6,
      } as never);

      const result = await checkDailyUsage("user1", 5, "premium");
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("DB 오류 시 fail-closed", async () => {
      mockedPrisma.dailyUsage.upsert.mockRejectedValue(new Error("DB fail"));

      const result = await checkDailyUsage("user1", 5, "premium");
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("analysisType 없이 호출 시 일반 체크", async () => {
      mockedPrisma.dailyUsage.upsert.mockResolvedValue({
        id: "daily:user1:2026-05-26",
        date: "2026-05-26",
        count: 1,
      } as never);

      const result = await checkDailyUsage("user1", 10);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  // ── getDailyUsageCount ──

  describe("getDailyUsageCount", () => {
    it("사용 기록 있으면 count 반환", async () => {
      mockedPrisma.dailyUsage.findUnique.mockResolvedValue({
        id: "daily:user1:2026-05-26",
        date: "2026-05-26",
        count: 7,
      } as never);

      const count = await getDailyUsageCount("user1");
      expect(count).toBe(7);
    });

    it("사용 기록 없으면 0 반환", async () => {
      mockedPrisma.dailyUsage.findUnique.mockResolvedValue(null);
      const count = await getDailyUsageCount("user1");
      expect(count).toBe(0);
    });

    it("DB 오류 시 0 반환", async () => {
      mockedPrisma.dailyUsage.findUnique.mockRejectedValue(new Error("fail"));
      const count = await getDailyUsageCount("user1");
      expect(count).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. lib/system-settings.ts (순수 함수만)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  encrypt,
  decrypt,
  maskValue,
  invalidateOAuthCache,
  OAUTH_PROVIDERS,
  PG_PROVIDERS,
  SCHOLAR_PROVIDERS,
} from "@/lib/system-settings";

describe("lib/system-settings", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUTH_SECRET = "test-secret-for-vitest-unit-tests-2026";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── encrypt / decrypt ──

  describe("encrypt / decrypt", () => {
    it("암호화 후 복호화하면 원본 복원", () => {
      const plaintext = "my-super-secret-key-12345";
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("빈 문자열도 암복호화 가능", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe("");
    });

    it("한글 포함 문자열 암복호화", () => {
      const text = "테스트 비밀번호 123!@#";
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(text);
    });

    it("같은 평문도 매번 다른 암호문 생성 (랜덤 IV)", () => {
      const text = "same-plaintext";
      const enc1 = encrypt(text);
      const enc2 = encrypt(text);
      expect(enc1).not.toBe(enc2);
      // 둘 다 복호화 가능
      expect(decrypt(enc1)).toBe(text);
      expect(decrypt(enc2)).toBe(text);
    });

    it("잘못된 암호문 → 에러", () => {
      expect(() => decrypt("invalid-base64-ciphertext!!!")).toThrow();
    });

    it("AUTH_SECRET 없으면 에러", () => {
      delete process.env.AUTH_SECRET;
      expect(() => encrypt("test")).toThrow("AUTH_SECRET");
    });
  });

  // ── maskValue ──

  describe("maskValue", () => {
    it("8자 이하 → ****", () => {
      expect(maskValue("short")).toBe("****");
      expect(maskValue("12345678")).toBe("****");
    });

    it("9자 이상 → 앞4 + **** + 뒤4", () => {
      expect(maskValue("123456789")).toBe("1234****6789");
    });

    it("긴 문자열", () => {
      expect(maskValue("abcdefghijklmnop")).toBe("abcd****mnop");
    });
  });

  // ── invalidateOAuthCache ──

  describe("invalidateOAuthCache", () => {
    it("에러 없이 호출 가능", () => {
      expect(() => invalidateOAuthCache()).not.toThrow();
    });
  });

  // ── 상수 검증 ──

  describe("Provider 상수", () => {
    it("OAUTH_PROVIDERS에 google, naver 포함", () => {
      const providers = OAUTH_PROVIDERS.map((p) => p.provider);
      expect(providers).toContain("google");
      expect(providers).toContain("naver");
    });

    it("PG_PROVIDERS에 tosspayments, inicis, kcp 포함", () => {
      const providers = PG_PROVIDERS.map((p) => p.provider);
      expect(providers).toContain("tosspayments");
      expect(providers).toContain("inicis");
      expect(providers).toContain("kcp");
    });

    it("SCHOLAR_PROVIDERS에 semantic_scholar, riss, kci 포함", () => {
      const providers = SCHOLAR_PROVIDERS.map((p) => p.provider);
      expect(providers).toContain("semantic_scholar");
      expect(providers).toContain("riss");
      expect(providers).toContain("kci");
    });

    it("모든 OAUTH_PROVIDERS에 필수 필드 존재", () => {
      OAUTH_PROVIDERS.forEach((p) => {
        expect(p.provider).toBeTruthy();
        expect(p.label).toBeTruthy();
        expect(p.clientIdKey).toBeTruthy();
        expect(p.clientSecretKey).toBeTruthy();
        expect(p.callbackPath).toMatch(/^\/api\/auth\/callback\//);
      });
    });

    it("모든 PG_PROVIDERS에 필수 필드 존재", () => {
      PG_PROVIDERS.forEach((p) => {
        expect(p.provider).toBeTruthy();
        expect(p.label).toBeTruthy();
        expect(p.clientKeyName).toBeTruthy();
        expect(p.secretKeyName).toBeTruthy();
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. lib/store.ts (순수 유틸 함수만 — encode/decode/trimData/generateId 등은 비공개)
//    → 공개 API인 syncToServer / loadFromServer 등은 네트워크 의존이므로 일부만 테스트
// ═══════════════════════════════════════════════════════════════════════════════

// store.ts는 localStorage 기반이며 대부분 비공개 함수 (encode, decode, trimData 등).
// 공개 함수인 getAnalyses, addAnalysis 등은 localStorage + fetch 의존.
// 여기서는 import 가능한 순수 유틸만 테스트하고, 브라우저 API 의존부는 mock으로 처리.

// store.ts의 공개 함수들은 typeof window === "undefined" 체크가 있어
// Node 환경에서 빈 배열 반환 — 이 동작을 검증.

import {
  getAnalyses,
  getAssets,
  getLatestAnalysisForAddress,
} from "@/lib/store";

describe("lib/store (Node 환경, window=undefined)", () => {
  it("getAnalyses — SSR 환경에서 빈 배열 반환", () => {
    expect(getAnalyses()).toEqual([]);
  });

  it("getAssets — SSR 환경에서 빈 배열 반환", () => {
    expect(getAssets()).toEqual([]);
  });

  it("getLatestAnalysisForAddress — SSR 환경에서 null 반환", () => {
    expect(getLatestAnalysisForAddress("서울시 강남구")).toBeNull();
  });

  it("getLatestAnalysisForAddress — 빈 주소 시 null 반환", () => {
    expect(getLatestAnalysisForAddress("")).toBeNull();
  });
});
