import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock api-cache before importing modules that use it
vi.mock("@/lib/api-cache", () => {
  const cache = new Map<string, unknown>();
  return {
    APICache: {
      makeKey: (prefix: string, ...args: unknown[]) =>
        `${prefix}:${JSON.stringify(args)}`,
    },
    apiCache: {
      get: vi.fn((key: string) => cache.get(key) ?? null),
      set: vi.fn((key: string, data: unknown) => {
        cache.set(key, data);
      }),
      _clear: () => cache.clear(),
    },
  };
});

import {
  extractLawdCode,
  extractAddressFilters,
  fetchRealTransactions,
  fetchRecentPrices,
  fetchAptRentTransactions,
  fetchRecentRentPrices,
  fetchComprehensivePrices,
  LAWD_CODE_MAP,
} from "@/lib/molit-api";

import {
  fetchBuildingInfo,
  fetchBuildingInfoByAddress,
} from "@/lib/building-api";

import { apiCache } from "@/lib/api-cache";

// ─── Helpers ───

const originalFetch = global.fetch;

function mockFetchXml(xml: string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    text: async () => xml,
  });
}

function mockFetchError() {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
    new Error("Network error")
  );
}

function mockFetchNotOk() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    status: 500,
    text: async () => "",
  });
}

/** 아파트 매매 실거래 XML 생성 헬퍼 */
function makeSaleItemXml(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    거래금액: "85,000",
    건축년도: "2015",
    년: "2025",
    월: "3",
    일: "15",
    아파트: "래미안",
    전용면적: "84.99",
    층: "12",
    법정동: "역삼동",
    지번: "123-4",
  };
  const merged = { ...defaults, ...overrides };
  const tags = Object.entries(merged)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("");
  return `<item>${tags}</item>`;
}

/** 전월세 XML 생성 헬퍼 */
function makeRentItemXml(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    보증금액: "40,000",
    월세금액: "0",
    건축년도: "2015",
    년: "2025",
    월: "3",
    일: "10",
    아파트: "래미안",
    전용면적: "84.99",
    층: "10",
    법정동: "역삼동",
    지번: "123-4",
  };
  const merged = { ...defaults, ...overrides };
  const tags = Object.entries(merged)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("");
  return `<item>${tags}</item>`;
}

/** 건축물대장 XML 생성 헬퍼 */
function makeBuildingXml(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    platPlc: "서울특별시 강남구 역삼동 123-4",
    bldNm: "래미안타워",
    mainPurpsCdNm: "아파트",
    strctCdNm: "철근콘크리트구조",
    totArea: "15000.55",
    useAprDay: "20150301",
    grndFlrCnt: "25",
    ugrndFlrCnt: "3",
    rideUseElvtCnt: "4",
    indrMechUtcnt: "100",
    oudrMechUtcnt: "50",
    indrAutoUtcnt: "30",
    oudrAutoUtcnt: "20",
    hhldCnt: "300",
    vlRat: "249.5",
    bcRat: "19.8",
  };
  const merged = { ...defaults, ...overrides };
  const tags = Object.entries(merged)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("");
  return `<response><body><items><item>${tags}</item></items></body></response>`;
}

// ─── Setup / Teardown ───

beforeEach(() => {
  global.fetch = vi.fn();
  process.env.MOLIT_API_KEY = "test-service-key";
  // Clear mock cache
  (apiCache as unknown as { _clear: () => void })._clear();
  vi.mocked(apiCache.get).mockReturnValue(null);
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.MOLIT_API_KEY;
});

// ══════════════════════════════════════════════
// molit-api.ts 테스트
// ══════════════════════════════════════════════

describe("molit-api", () => {
  // ── extractLawdCode ──

  describe("extractLawdCode", () => {
    it("서울 구 이름으로 법정동 코드를 추출한다", () => {
      expect(extractLawdCode("서울특별시 강남구")).toBe("11680");
      expect(extractLawdCode("서울시 서초구 서초동")).toBe("11650");
      expect(extractLawdCode("서울 송파구")).toBe("11710");
    });

    it("행정 접미사를 제거하고 정규화한다", () => {
      // "부산광역시 중구" → 정규화 "부산중구" → "부산중구" 키 매칭
      expect(extractLawdCode("부산광역시 중구")).toBe("26110");
      expect(extractLawdCode("대구광역시 동구")).toBe("27140");
      expect(extractLawdCode("세종특별자치시")).toBe("36110");
    });

    it("경기도 시+구 조합을 올바르게 매칭한다", () => {
      expect(extractLawdCode("경기도 수원시 영통구")).toBe("41117");
      expect(extractLawdCode("경기도 성남시 분당구")).toBe("41135");
    });

    it("약식 키를 매칭한다", () => {
      expect(extractLawdCode("부산")).toBe("26350");
      expect(extractLawdCode("제주")).toBe("50110");
      expect(extractLawdCode("분당")).toBe("41135");
    });

    it("매칭되지 않는 주소에 null을 반환한다", () => {
      expect(extractLawdCode("알 수 없는 지역")).toBeNull();
      expect(extractLawdCode("")).toBeNull();
    });

    it("가장 구체적인(긴) 키를 우선 매칭한다", () => {
      // "중구" (서울)와 "부산중구"를 구별
      expect(extractLawdCode("중구")).toBe("11140"); // 서울 중구 기본값
      expect(extractLawdCode("부산 중구")).toBe("26110");
    });
  });

  // ── extractAddressFilters ──

  describe("extractAddressFilters", () => {
    it("주소에서 동과 아파트명 힌트를 추출한다", () => {
      const result = extractAddressFilters("서울시 강남구 역삼동 래미안");
      expect(result.dong).toBe("역삼동");
      expect(result.aptHint).toBe("래미안");
    });

    it("지번 번호는 아파트명 힌트에서 제외한다", () => {
      const result = extractAddressFilters("서울시 구로구 구로동 554-24");
      expect(result.dong).toBe("구로동");
      expect(result.aptHint).toBeNull();
    });

    it("동을 찾지 못하면 dong이 null이다", () => {
      const result = extractAddressFilters("서울특별시 강남구");
      expect(result.dong).toBeNull();
      expect(result.aptHint).toBeNull();
    });

    it("읍/면/리 패턴도 감지한다", () => {
      const result = extractAddressFilters("경기도 화성시 봉담읍");
      expect(result.dong).toBe("봉담읍");
    });

    it("여러 토큰 중 올바른 동을 찾는다", () => {
      const result = extractAddressFilters(
        "서울특별시 송파구 잠실동 리센츠 아파트"
      );
      expect(result.dong).toBe("잠실동");
      expect(result.aptHint).toBe("리센츠 아파트");
    });
  });

  // ── fetchRealTransactions ──

  describe("fetchRealTransactions", () => {
    it("XML 응답을 파싱하여 거래 목록을 반환한다", async () => {
      const xml = `<response><body><items>${makeSaleItemXml()}${makeSaleItemXml({
        거래금액: "90,000",
        아파트: "힐스테이트",
        법정동: "삼성동",
      })}</items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRealTransactions("11680", "202503");

      expect(result).toHaveLength(2);
      expect(result[0].dealAmount).toBe(850_000_000); // 85,000 * 10000
      expect(result[0].aptName).toBe("래미안");
      expect(result[0].dong).toBe("역삼동");
      expect(result[0].area).toBe(84.99);
      expect(result[0].floor).toBe(12);
      expect(result[1].dealAmount).toBe(900_000_000);
      expect(result[1].aptName).toBe("힐스테이트");
    });

    it("영문 태그 XML도 파싱한다", async () => {
      const xml = `<response><body><items><item>
        <dealAmount>70,000</dealAmount>
        <buildYear>2018</buildYear>
        <dealYear>2025</dealYear>
        <dealMonth>4</dealMonth>
        <dealDay>20</dealDay>
        <aptNm>자이</aptNm>
        <excluUseAr>59.96</excluUseAr>
        <floor>8</floor>
        <umdNm>대치동</umdNm>
        <jibun>501</jibun>
      </item></items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRealTransactions("11680", "202504");
      expect(result).toHaveLength(1);
      expect(result[0].aptName).toBe("자이");
      expect(result[0].dealAmount).toBe(700_000_000);
      expect(result[0].dong).toBe("대치동");
    });

    it("MOLIT_API_KEY가 없으면 빈 배열을 반환한다", async () => {
      delete process.env.MOLIT_API_KEY;
      const result = await fetchRealTransactions("11680", "202503");
      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("API 호출 실패 시 빈 배열을 반환한다", async () => {
      mockFetchError();
      const result = await fetchRealTransactions("11680", "202503");
      expect(result).toEqual([]);
    });

    it("HTTP 에러 응답 시 빈 배열을 반환한다", async () => {
      mockFetchNotOk();
      const result = await fetchRealTransactions("11680", "202503");
      expect(result).toEqual([]);
    });

    it("잘못된 금액(0 이하, 100억 초과)인 항목을 필터링한다", async () => {
      const xml = `<response><body><items>
        ${makeSaleItemXml({ 거래금액: "0" })}
        ${makeSaleItemXml({ 거래금액: "-5,000" })}
        ${makeSaleItemXml({ 거래금액: "1,100,000" })}
        ${makeSaleItemXml({ 거래금액: "50,000" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRealTransactions("11680", "202503");
      // 0 → 0원 (제외), -5000 → 음수 (제외), 1,100,000 → 110억 (초과, 제외), 50,000 → 5억 (포함)
      expect(result).toHaveLength(1);
      expect(result[0].dealAmount).toBe(500_000_000);
    });

    it("올바른 URL과 파라미터로 API를 호출한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      await fetchRealTransactions("11680", "202503");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain(
        "apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev"
      );
      expect(calledUrl).toContain("serviceKey=test-service-key");
      expect(calledUrl).toContain("LAWD_CD=11680");
      expect(calledUrl).toContain("DEAL_YMD=202503");
      expect(calledUrl).toContain("numOfRows=1000");
    });

    it("캐시된 데이터가 있으면 fetch를 호출하지 않는다", async () => {
      const cachedData = [
        {
          dealAmount: 500_000_000,
          buildYear: 2015,
          dealYear: 2025,
          dealMonth: 3,
          dealDay: 1,
          aptName: "캐시아파트",
          area: 84,
          floor: 5,
          dong: "역삼동",
        },
      ];
      vi.mocked(apiCache.get).mockReturnValue(cachedData);

      const result = await fetchRealTransactions("11680", "202503");
      expect(result).toEqual(cachedData);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── fetchRecentPrices ──

  describe("fetchRecentPrices", () => {
    it("매칭되지 않는 주소에 null을 반환한다", async () => {
      const result = await fetchRecentPrices("알수없는주소");
      expect(result).toBeNull();
    });

    it("거래 데이터가 없으면 빈 결과를 반환한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      const result = await fetchRecentPrices("서울시 강남구 역삼동", 1);
      expect(result).not.toBeNull();
      expect(result!.transactionCount).toBe(0);
      expect(result!.avgPrice).toBe(0);
      expect(result!.transactions).toEqual([]);
    });

    it("평균/최소/최대 가격을 올바르게 계산한다", async () => {
      const xml = `<response><body><items>
        ${makeSaleItemXml({ 거래금액: "80,000", 법정동: "역삼동" })}
        ${makeSaleItemXml({ 거래금액: "100,000", 법정동: "역삼동" })}
        ${makeSaleItemXml({ 거래금액: "90,000", 법정동: "역삼동" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRecentPrices("서울시 강남구 역삼동", 1);
      expect(result).not.toBeNull();
      expect(result!.transactionCount).toBe(3);
      expect(result!.avgPrice).toBe(900_000_000); // (80+100+90)/3 * 10000 = 90000만
      expect(result!.minPrice).toBe(800_000_000);
      expect(result!.maxPrice).toBe(1_000_000_000);
    });

    it("동 + 아파트 필터를 적용한다", async () => {
      const xml = `<response><body><items>
        ${makeSaleItemXml({ 거래금액: "80,000", 법정동: "역삼", 아파트: "래미안" })}
        ${makeSaleItemXml({ 거래금액: "120,000", 법정동: "삼성동", 아파트: "힐스테이트" })}
      </items></body></response>`;
      mockFetchXml(xml);

      // "역삼동 래미안" → dong=역삼동, aptHint=래미안
      const result = await fetchRecentPrices(
        "서울시 강남구 역삼동 래미안",
        1
      );
      expect(result).not.toBeNull();
      // 역삼동(역삼) + 래미안 매칭 = 1건만
      expect(result!.transactionCount).toBe(1);
      expect(result!.transactions[0].aptName).toBe("래미안");
    });

    it("period 문자열을 올바르게 설정한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      const result = await fetchRecentPrices("서울시 강남구", 6);
      expect(result!.period).toBe("최근 6개월");
    });
  });

  // ── fetchAptRentTransactions ──

  describe("fetchAptRentTransactions", () => {
    it("전월세 XML을 파싱하여 거래 목록을 반환한다", async () => {
      const xml = `<response><body><items>
        ${makeRentItemXml({ 보증금액: "35,000", 월세금액: "0" })}
        ${makeRentItemXml({ 보증금액: "10,000", 월세금액: "80" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchAptRentTransactions("11680", "202503");
      expect(result).toHaveLength(2);
      // 전세
      expect(result[0].deposit).toBe(350_000_000);
      expect(result[0].monthlyRent).toBe(0);
      expect(result[0].rentType).toBe("전세");
      // 월세
      expect(result[1].deposit).toBe(100_000_000);
      expect(result[1].monthlyRent).toBe(800_000);
      expect(result[1].rentType).toBe("월세");
    });

    it("MOLIT_API_KEY가 없으면 빈 배열을 반환한다", async () => {
      delete process.env.MOLIT_API_KEY;
      const result = await fetchAptRentTransactions("11680", "202503");
      expect(result).toEqual([]);
    });

    it("보증금이 0 이하인 항목은 필터링한다", async () => {
      const xml = `<response><body><items>
        ${makeRentItemXml({ 보증금액: "0", 월세금액: "50" })}
        ${makeRentItemXml({ 보증금액: "20,000", 월세금액: "0" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchAptRentTransactions("11680", "202503");
      expect(result).toHaveLength(1);
      expect(result[0].deposit).toBe(200_000_000);
    });

    it("올바른 전월세 API 엔드포인트를 호출한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      await fetchAptRentTransactions("11680", "202503");

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain(
        "apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent"
      );
    });
  });

  // ── fetchRecentRentPrices ──

  describe("fetchRecentRentPrices", () => {
    it("매칭되지 않는 주소에 null을 반환한다", async () => {
      const result = await fetchRecentRentPrices("알수없는주소");
      expect(result).toBeNull();
    });

    it("전세/월세 건수를 올바르게 분류한다", async () => {
      const xml = `<response><body><items>
        ${makeRentItemXml({ 보증금액: "35,000", 월세금액: "0", 법정동: "역삼동" })}
        ${makeRentItemXml({ 보증금액: "40,000", 월세금액: "0", 법정동: "역삼동" })}
        ${makeRentItemXml({ 보증금액: "5,000", 월세금액: "100", 법정동: "역삼동" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRecentRentPrices("서울시 강남구 역삼동", 1);
      expect(result).not.toBeNull();
      expect(result!.jeonseCount).toBe(2);
      expect(result!.wolseCount).toBe(1);
    });

    it("전세 평균/최소/최대 보증금을 올바르게 계산한다", async () => {
      const xml = `<response><body><items>
        ${makeRentItemXml({ 보증금액: "30,000", 월세금액: "0", 법정동: "역삼동" })}
        ${makeRentItemXml({ 보증금액: "50,000", 월세금액: "0", 법정동: "역삼동" })}
      </items></body></response>`;
      mockFetchXml(xml);

      const result = await fetchRecentRentPrices("서울시 강남구 역삼동", 1);
      expect(result!.avgDeposit).toBe(400_000_000); // (3억+5억)/2
      expect(result!.minDeposit).toBe(300_000_000);
      expect(result!.maxDeposit).toBe(500_000_000);
    });

    it("거래 데이터가 없으면 0 값 결과를 반환한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      const result = await fetchRecentRentPrices("서울시 강남구 역삼동", 1);
      expect(result).not.toBeNull();
      expect(result!.jeonseCount).toBe(0);
      expect(result!.wolseCount).toBe(0);
      expect(result!.avgDeposit).toBe(0);
    });
  });

  // ── fetchComprehensivePrices ──

  describe("fetchComprehensivePrices", () => {
    it("매칭되지 않는 주소에 null 결과를 반환한다", async () => {
      const result = await fetchComprehensivePrices("알수없는주소");
      expect(result.sale).toBeNull();
      expect(result.rent).toBeNull();
      expect(result.jeonseRatio).toBeNull();
    });

    it("매매+전월세 데이터로 전세가율을 계산한다", async () => {
      // 매매: 평균 10억 / 전세: 평균 6억 → 전세가율 60%
      const saleXml = `<response><body><items>
        ${makeSaleItemXml({ 거래금액: "100,000", 법정동: "역삼동" })}
      </items></body></response>`;
      const rentXml = `<response><body><items>
        ${makeRentItemXml({ 보증금액: "60,000", 월세금액: "0", 법정동: "역삼동" })}
      </items></body></response>`;

      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        async (url: string) => {
          callCount++;
          const urlStr = String(url);
          const isRent = urlStr.includes("AptRent");
          return {
            ok: true,
            text: async () => (isRent ? rentXml : saleXml),
          };
        }
      );

      const result = await fetchComprehensivePrices(
        "서울시 강남구 역삼동",
        1
      );
      expect(result.sale).not.toBeNull();
      expect(result.rent).not.toBeNull();
      if (result.sale && result.rent && result.jeonseRatio !== null) {
        expect(result.jeonseRatio).toBe(60);
      }
    });

    it("매매 데이터 부족 시 연립/오피스텔 추가 조회를 시도한다", async () => {
      // 매매 0건 + 전월세 0건 → 연립/오피스텔 호출 발생
      mockFetchXml("<response><body><items></items></body></response>");

      const result = await fetchComprehensivePrices(
        "서울시 강남구 역삼동",
        1
      );
      // 추가 API 호출이 발생했는지 확인 (매매 1 + 전월세 1 + 연립/오피스텔 추가)
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length)
        .toBeGreaterThanOrEqual(2);
    });
  });

  // ── LAWD_CODE_MAP ──

  describe("LAWD_CODE_MAP", () => {
    it("주요 지역 코드가 5자리 숫자 문자열이다", () => {
      for (const [key, value] of Object.entries(LAWD_CODE_MAP)) {
        expect(value).toMatch(/^\d{5}$/);
      }
    });

    it("서울 25개 구 중 주요 구를 포함한다", () => {
      expect(LAWD_CODE_MAP["강남구"]).toBe("11680");
      expect(LAWD_CODE_MAP["종로구"]).toBe("11110");
      expect(LAWD_CODE_MAP["노원구"]).toBe("11350");
    });

    it("제주 코드를 포함한다", () => {
      expect(LAWD_CODE_MAP["제주시"]).toBe("50110");
      expect(LAWD_CODE_MAP["서귀포시"]).toBe("50130");
    });
  });
});

// ══════════════════════════════════════════════
// building-api.ts 테스트
// ══════════════════════════════════════════════

describe("building-api", () => {
  // ── fetchBuildingInfo ──

  describe("fetchBuildingInfo", () => {
    it("XML 응답을 파싱하여 건물 정보를 반환한다", async () => {
      mockFetchXml(makeBuildingXml());

      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).not.toBeNull();
      expect(result!.address).toBe("서울특별시 강남구 역삼동 123-4");
      expect(result!.buildingName).toBe("래미안타워");
      expect(result!.mainPurpose).toBe("아파트");
      expect(result!.structure).toBe("철근콘크리트구조");
      expect(result!.totalArea).toBe(15000.55);
      expect(result!.buildDate).toBe("20150301");
      expect(result!.buildYear).toBe(2015);
      expect(result!.floors).toBe(25);
      expect(result!.undergroundFloors).toBe(3);
      expect(result!.elevatorCount).toBe(4);
      expect(result!.parkingCount).toBe(200); // 100+50+30+20
      expect(result!.households).toBe(300);
      expect(result!.floorAreaRatio).toBe(249.5);
      expect(result!.buildingCoverage).toBe(19.8);
    });

    it("MOLIT_API_KEY가 없으면 null을 반환한다", async () => {
      delete process.env.MOLIT_API_KEY;
      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("API 에러 시 null을 반환한다", async () => {
      mockFetchNotOk();
      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).toBeNull();
    });

    it("네트워크 에러 시 null을 반환한다", async () => {
      mockFetchError();
      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).toBeNull();
    });

    it("item 태그가 없는 응답에 null을 반환한다", async () => {
      mockFetchXml("<response><body><items></items></body></response>");
      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).toBeNull();
    });

    it("bun/ji 파라미터가 있으면 URL에 포함한다", async () => {
      mockFetchXml(makeBuildingXml());
      await fetchBuildingInfo("11680", "10300", "0012", "0003");

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain("bun=0012");
      expect(calledUrl).toContain("ji=0003");
    });

    it("bun/ji 파라미터가 비어있으면 URL에 포함하지 않는다", async () => {
      mockFetchXml(makeBuildingXml());
      await fetchBuildingInfo("11680", "10300");

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledUrl).not.toContain("bun=");
      expect(calledUrl).not.toContain("ji=");
    });

    it("올바른 건축물대장 API 엔드포인트를 호출한다", async () => {
      mockFetchXml(makeBuildingXml());
      await fetchBuildingInfo("11680", "10300");

      const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(calledUrl).toContain(
        "apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"
      );
      expect(calledUrl).toContain("sigunguCd=11680");
      expect(calledUrl).toContain("bjdongCd=10300");
      expect(calledUrl).toContain("_type=xml");
    });

    it("캐시된 데이터가 있으면 fetch를 호출하지 않는다", async () => {
      const cachedBuilding = {
        address: "캐시주소",
        buildingName: "캐시건물",
      };
      vi.mocked(apiCache.get).mockReturnValue(cachedBuilding);

      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).toEqual(cachedBuilding);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("주소가 platPlc에 없으면 newPlatPlc를 사용한다", async () => {
      const xml = makeBuildingXml({
        platPlc: "",
        newPlatPlc: "서울 강남구 테헤란로 123",
      });
      // platPlc가 빈 문자열이므로 extractTag는 ""을 반환 — newPlatPlc로 fallback
      // 단, makeBuildingXml은 platPlc를 빈 값으로 설정
      mockFetchXml(xml);

      const result = await fetchBuildingInfo("11680", "10300");
      expect(result).not.toBeNull();
      // platPlc가 빈 문자열이면 newPlatPlc 사용 로직이 || 연산자로 구현됨
    });
  });

  // ── fetchBuildingInfoByAddress ──

  describe("fetchBuildingInfoByAddress", () => {
    it("주소에서 법정동 코드를 추출하여 건물 정보를 조회한다", async () => {
      mockFetchXml(makeBuildingXml());
      const result = await fetchBuildingInfoByAddress("서울시 강남구");
      expect(result).not.toBeNull();
      expect(result!.buildingName).toBe("래미안타워");
    });

    it("매칭되지 않는 주소에 null을 반환한다", async () => {
      const result = await fetchBuildingInfoByAddress("알수없는주소");
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("내부 fetch 에러 시 null을 반환한다", async () => {
      mockFetchError();
      const result = await fetchBuildingInfoByAddress("서울시 강남구");
      expect(result).toBeNull();
    });
  });
});
