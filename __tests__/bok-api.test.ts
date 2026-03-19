import { describe, it, expect, vi } from "vitest";
import { fetchBaseRate } from "@/lib/bok-api";

describe("fetchBaseRate", () => {
  it("BOKResponse 인터페이스를 준수하는 결과를 반환한다", async () => {
    const result = await fetchBaseRate();
    expect(result).toHaveProperty("baseRate");
    expect(result).toHaveProperty("baseRateDate");
    expect(typeof result.baseRate).toBe("number");
    expect(typeof result.baseRateDate).toBe("string");
  });

  it("기준금리가 합리적인 범위 내에 있다 (0~15%)", async () => {
    const result = await fetchBaseRate();
    expect(result.baseRate).toBeGreaterThanOrEqual(0);
    expect(result.baseRate).toBeLessThanOrEqual(15);
  });

  it("API 실패 시 폴백 값을 반환한다", async () => {
    // fetch가 실패하도록 모킹
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    try {
      const result = await fetchBaseRate();
      // 폴백: 기본값 2.75
      expect(result.baseRate).toBe(2.75);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
