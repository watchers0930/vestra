import { describe, it, expect } from "vitest";
import {
  parseRegistry,
  extractAmount,
  SAMPLE_REGISTRY_TEXT,
} from "@/lib/registry-parser";

describe("parseRegistry", () => {
  const result = parseRegistry(SAMPLE_REGISTRY_TEXT);

  describe("표제부 파싱", () => {
    it("소재지 주소를 추출한다", () => {
      expect(result.title.address).toContain("강남구");
      expect(result.title.address).toContain("역삼동");
    });

    it("면적을 추출한다", () => {
      expect(result.title.area).toBe("84.97㎡");
    });

    it("구조를 추출한다", () => {
      expect(result.title.structure).toContain("철근콘크리트");
    });

    it("용도를 '아파트'로 추출한다", () => {
      expect(result.title.purpose).toBe("아파트");
    });

    it("대지권비율을 추출한다", () => {
      expect(result.title.landRightRatio).toContain("52718.4");
    });
  });

  describe("갑구 파싱", () => {
    it("갑구 항목을 5개 이상 파싱한다", () => {
      expect(result.gapgu.length).toBeGreaterThanOrEqual(5);
    });

    it("1번 항목은 소유권보존이다", () => {
      const first = result.gapgu.find((e) => e.order === 1);
      expect(first?.purpose).toBe("소유권보존");
      expect(first?.riskType).toBe("safe");
    });

    it("소유권이전 항목을 감지한다", () => {
      const transfers = result.gapgu.filter(
        (e) => e.purpose === "소유권이전"
      );
      expect(transfers.length).toBeGreaterThanOrEqual(2);
    });

    it("가압류 항목을 감지한다", () => {
      const seizure = result.gapgu.find((e) => e.purpose === "가압류");
      expect(seizure).toBeDefined();
      expect(seizure?.riskType).toBe("danger");
    });

    it("말소 항목을 감지한다", () => {
      const cancelled = result.gapgu.filter((e) => e.isCancelled);
      expect(cancelled.length).toBeGreaterThan(0);
    });

    it("날짜를 YYYY.MM.DD 형식으로 추출한다", () => {
      const dated = result.gapgu.filter((e) => e.date);
      expect(dated.length).toBeGreaterThan(0);
      for (const entry of dated) {
        expect(entry.date).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
      }
    });
  });

  describe("을구 파싱", () => {
    it("을구 항목을 4개 이상 파싱한다", () => {
      expect(result.eulgu.length).toBeGreaterThanOrEqual(4);
    });

    it("근저당권설정 항목의 금액을 추출한다", () => {
      const mortgage = result.eulgu.find(
        (e) => e.purpose === "근저당권설정" && !e.isCancelled && e.amount > 0
      );
      expect(mortgage).toBeDefined();
      expect(mortgage!.amount).toBeGreaterThan(0);
    });

    it("전세권설정 금액을 추출한다 (5억5천만원)", () => {
      const jeonse = result.eulgu.find((e) => /전세권/.test(e.purpose));
      expect(jeonse).toBeDefined();
      expect(jeonse!.amount).toBe(550000000);
    });

    it("말소된 근저당을 감지한다", () => {
      const cancelled = result.eulgu.filter(
        (e) => e.isCancelled && /근저당/.test(e.purpose)
      );
      expect(cancelled.length).toBeGreaterThan(0);
    });
  });

  describe("요약 통계", () => {
    it("갑구 전체/활성 건수가 정확하다", () => {
      expect(result.summary.totalGapguEntries).toBe(result.gapgu.length);
      const activeCount = result.gapgu.filter((e) => !e.isCancelled).length;
      expect(result.summary.activeGapguEntries).toBe(activeCount);
    });

    it("을구 전체/활성 건수가 정확하다", () => {
      expect(result.summary.totalEulguEntries).toBe(result.eulgu.length);
      const activeCount = result.eulgu.filter((e) => !e.isCancelled).length;
      expect(result.summary.activeEulguEntries).toBe(activeCount);
    });

    it("총채권액 = 근저당합계 + 전세합계", () => {
      expect(result.summary.totalClaimsAmount).toBe(
        result.summary.totalMortgageAmount + result.summary.totalJeonseAmount
      );
    });

    it("소유권이전 횟수가 정확하다", () => {
      const manual = result.gapgu.filter(
        (e) => e.purpose === "소유권이전" && !e.isCancelled
      ).length;
      expect(result.summary.ownershipTransferCount).toBe(manual);
    });
  });

  describe("빈 입력 처리", () => {
    it("빈 텍스트도 에러 없이 처리한다", () => {
      const empty = parseRegistry("");
      expect(empty.gapgu).toHaveLength(0);
      expect(empty.eulgu).toHaveLength(0);
    });

    it("섹션 없는 텍스트도 처리한다", () => {
      const noSections = parseRegistry("아무 내용 없는 텍스트입니다.");
      expect(noSections.gapgu).toHaveLength(0);
      expect(noSections.eulgu).toHaveLength(0);
    });
  });
});

describe("extractAmount", () => {
  it("금 480,000,000원 → 480000000", () => {
    expect(extractAmount("채권최고액 금 480,000,000원")).toBe(480000000);
  });

  it("금3억5,000만원 → 350000000", () => {
    expect(extractAmount("금3억5,000만원")).toBe(350000000);
  });

  it("금3억원 → 300000000", () => {
    expect(extractAmount("금3억원")).toBe(300000000);
  });

  it("금5,000만원 → 50000000", () => {
    expect(extractAmount("금5,000만원")).toBe(50000000);
  });

  it("금 550,000,000원 → 550000000", () => {
    expect(extractAmount("전세금 금 550,000,000원")).toBe(550000000);
  });

  it("빈 문자열 → 0", () => {
    expect(extractAmount("")).toBe(0);
  });

  it("금액 없는 텍스트 → 0", () => {
    expect(extractAmount("소유권이전 매매")).toBe(0);
  });
});
