/**
 * VESTRA Feasibility API Client Tests
 * ────────────────────────────────────
 * api-utils, region-codes, kosis-api, mois-api 의
 * 전체 exported 함수를 커버하는 통합 테스트.
 *
 * 외부 API 호출은 global.fetch 모킹으로 격리.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── cache flush를 위해 apiCache 직접 import ───
import { apiCache } from "@/lib/api-cache";

// ─── api-utils ───
import { fetchWithTimeout } from "@/lib/feasibility/api/api-utils";

// ─── region-codes ───
import {
  REGION_CODE_MAP,
  ADMIN_CODE_MAP,
  extractRegionFromAddress,
} from "@/lib/feasibility/api/region-codes";

// ─── kosis-api ───
import {
  fetchPopulationTrends,
  fetchAgeGroupPopulation,
  fetchIndustryData,
  fetchHousingSupply,
} from "@/lib/feasibility/api/kosis-api";

// ─── mois-api ───
import {
  fetchMOISPopulation,
  fetchMOISAgePopulation,
  extractAdminCode,
} from "@/lib/feasibility/api/mois-api";

// ─── barrel re-export 확인 ───
import * as barrel from "@/lib/feasibility/api/index";

// ─── 테스트 헬퍼 ───

/** JSON 응답을 반환하는 가짜 Response 생성 */
function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    statusText: status === 200 ? "OK" : "Error",
    type: "basic" as ResponseType,
    url: "",
    clone: () => mockJsonResponse(body, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ─── 공통 셋업 ───

const originalEnv = { ...process.env };

beforeEach(() => {
  global.fetch = vi.fn();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  // apiCache 내부 Map을 강제 flush하여 테스트 격리 보장
  (apiCache as any).cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

// ════════════════════════════════════════════════════════════════
// 1. api-utils -- fetchWithTimeout
// ════════════════════════════════════════════════════════════════

describe("fetchWithTimeout", () => {
  it("정상 응답 시 JSON 파싱 결과를 반환한다", async () => {
    const payload = { value: 42 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse(payload)
    );

    const result = await fetchWithTimeout<{ value: number }>("https://example.com/api");
    expect(result).toEqual({ value: 42 });
  });

  it("res.ok가 false이면 null을 반환한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse({ error: "Not Found" }, 404)
    );

    const result = await fetchWithTimeout("https://example.com/missing");
    expect(result).toBeNull();
  });

  it("네트워크 에러 발생 시 null을 반환하고 콘솔 경고를 출력한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network failure")
    );

    const result = await fetchWithTimeout("https://example.com/fail");
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      "API 호출 실패:",
      expect.any(Error)
    );
  });

  it("AbortError(타임아웃) 시 null을 반환한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const err = new DOMException("The operation was aborted.", "AbortError");
      return Promise.reject(err);
    });

    const result = await fetchWithTimeout("https://example.com/slow", {
      timeout: 1,
    });
    expect(result).toBeNull();
  });

  it("커스텀 헤더가 fetch 호출에 포함된다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockJsonResponse({ ok: true })
    );

    await fetchWithTimeout("https://example.com", {
      headers: { "X-Custom": "test-value" },
    });

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers).toMatchObject({
      "User-Agent": "VESTRA/1.0",
      "X-Custom": "test-value",
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 2. region-codes
// ════════════════════════════════════════════════════════════════

describe("region-codes", () => {
  describe("REGION_CODE_MAP", () => {
    it("서울에 대해 올바른 코드를 가진다", () => {
      expect(REGION_CODE_MAP["서울"]).toBe("1100000000");
      expect(REGION_CODE_MAP["서울특별시"]).toBe("1100000000");
    });

    it("강남구에 대해 올바른 코드를 가진다", () => {
      expect(REGION_CODE_MAP["강남구"]).toBe("1168000000");
    });

    it("경기도에 대해 올바른 코드를 가진다", () => {
      expect(REGION_CODE_MAP["경기"]).toBe("4100000000");
      expect(REGION_CODE_MAP["경기도"]).toBe("4100000000");
    });

    it("전국에 대해 올바른 코드를 가진다", () => {
      expect(REGION_CODE_MAP["전국"]).toBe("0000000000");
    });

    it("존재하지 않는 키는 undefined를 반환한다", () => {
      expect(REGION_CODE_MAP["뉴욕"]).toBeUndefined();
    });
  });

  describe("ADMIN_CODE_MAP", () => {
    it("광역시 정식 명칭과 약칭 모두 매핑된다", () => {
      expect(ADMIN_CODE_MAP["부산"]).toBe("2600000000");
      expect(ADMIN_CODE_MAP["부산광역시"]).toBe("2600000000");
    });

    it("시군구 단위가 매핑된다", () => {
      expect(ADMIN_CODE_MAP["분당구"]).toBe("4113500000");
      expect(ADMIN_CODE_MAP["수원시"]).toBe("4111000000");
    });

    it("REGION_CODE_MAP보다 더 넓은 범위를 커버한다", () => {
      expect(ADMIN_CODE_MAP["강원"]).toBe("4200000000");
      expect(REGION_CODE_MAP["강원"]).toBeUndefined();
    });
  });

  describe("extractRegionFromAddress", () => {
    it("서울특별시 강남구 주소에서 유효한 지역명을 추출한다", () => {
      const result = extractRegionFromAddress("서울특별시 강남구 역삼동 123");
      expect(result).not.toBeNull();
      expect(ADMIN_CODE_MAP[result!]).toBeDefined();
    });

    it("경기도 성남시 분당구에서 유효한 지역코드를 가진 지역명을 추출한다", () => {
      const result = extractRegionFromAddress("경기도 성남시 분당구 서현동");
      // 길이 정렬 후 매칭하므로 "성남시" 또는 "분당구" 중 하나 (길이 동일)
      expect(result).not.toBeNull();
      expect(ADMIN_CODE_MAP[result!]).toBeDefined();
    });

    it("제주특별자치도를 정규화하여 지역명을 추출한다", () => {
      const result = extractRegionFromAddress("제주특별자치도 제주시");
      expect(result).not.toBeNull();
    });

    it("매칭되지 않는 주소에 대해 null을 반환한다", () => {
      const result = extractRegionFromAddress("미국 뉴욕");
      expect(result).toBeNull();
    });

    it("빈 문자열에 대해 null을 반환한다", () => {
      const result = extractRegionFromAddress("");
      expect(result).toBeNull();
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 3. kosis-api
// ════════════════════════════════════════════════════════════════

describe("kosis-api", () => {
  describe("fetchPopulationTrends", () => {
    it("KOSIS_API_KEY 미설정 시 폴백 데이터를 반환한다", async () => {
      delete process.env.KOSIS_API_KEY;

      const result = await fetchPopulationTrends("서울특별시");
      expect(result.dataSource).toBe("fallback");
      expect(result.region).toBe("서울특별시");
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.ageGroups.length).toBeGreaterThan(0);
      expect(result.trends[0]).toHaveProperty("year");
      expect(result.trends[0]).toHaveProperty("population");
      expect(result.trends[0]).toHaveProperty("households");
    });

    it("API 성공 시 live 데이터를 반환한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const kosisResponse = [
        { C1_NM: "테스트시", PRD_DE: "2023", ITM_NM: "총인구수", DT: "9,386,755" },
        { C1_NM: "테스트시", PRD_DE: "2023", ITM_NM: "세대수", DT: "4,387,521" },
        { C1_NM: "테스트시", PRD_DE: "2024", ITM_NM: "총인구수", DT: "9,352,480" },
        { C1_NM: "테스트시", PRD_DE: "2024", ITM_NM: "세대수", DT: "4,425,108" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(kosisResponse)
      );

      const result = await fetchPopulationTrends("테스트시");
      expect(result.dataSource).toBe("live");
      expect(result.trends.length).toBe(2);
      expect(result.trends[0].year).toBe(2023);
      expect(result.trends[0].population).toBe(9386755);
      expect(result.trends[0].households).toBe(4387521);
      expect(result.trends[1].year).toBe(2024);
    });

    it("API가 빈 배열을 반환하면 폴백을 사용한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse([])
      );

      const result = await fetchPopulationTrends("빈배열테스트시");
      expect(result.dataSource).toBe("fallback");
    });

    it("API가 지역 불일치 데이터를 반환하면 폴백을 사용한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse([
          { C1_NM: "부산광역시", PRD_DE: "2023", ITM_NM: "총인구수", DT: "3,300,000" },
        ])
      );

      const result = await fetchPopulationTrends("불일치테스트시");
      expect(result.dataSource).toBe("fallback");
    });

    it("fetch 실패 시 폴백 데이터를 반환한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await fetchPopulationTrends("에러테스트시");
      expect(result.dataSource).toBe("fallback");
      expect(result.trends.length).toBeGreaterThan(0);
    });

    it("요청 URL에 올바른 파라미터가 포함된다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(null)
      );

      await fetchPopulationTrends("URL테스트시");

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain("kosis.kr/openapi");
      expect(callUrl).toContain("apiKey=test-kosis-key");
      expect(callUrl).toContain("tblId=DT_1B040A3");
      expect(callUrl).toContain("method=getList");
      expect(callUrl).toContain("format=json");
    });
  });

  describe("fetchAgeGroupPopulation", () => {
    it("KOSIS_API_KEY 미설정 시 폴백 연령대 데이터를 반환한다", async () => {
      delete process.env.KOSIS_API_KEY;

      const result = await fetchAgeGroupPopulation("연령폴백시");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("ageGroup");
      expect(result[0]).toHaveProperty("male");
      expect(result[0]).toHaveProperty("female");
      expect(result[0]).toHaveProperty("total");
    });

    it("API 성공 시 파싱된 연령대 데이터를 반환한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const response = [
        { C1_NM: "연령성공시", C2_NM: "20~24세", ITM_NM: "남자인구수", DT: "185,000", PRD_DE: "2024" },
        { C1_NM: "연령성공시", C2_NM: "20~24세", ITM_NM: "여자인구수", DT: "178,000", PRD_DE: "2024" },
        { C1_NM: "연령성공시", C2_NM: "20~24세", ITM_NM: "계", DT: "363,000", PRD_DE: "2024" },
        { C1_NM: "연령성공시", C2_NM: "30~34세", ITM_NM: "남자인구수", DT: "205,000", PRD_DE: "2024" },
        { C1_NM: "연령성공시", C2_NM: "30~34세", ITM_NM: "여자인구수", DT: "198,000", PRD_DE: "2024" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      const result = await fetchAgeGroupPopulation("연령성공시");
      expect(result.length).toBe(2);
      expect(result[0].ageGroup).toBe("20~24세");
      expect(result[0].male).toBe(185000);
      expect(result[0].female).toBe(178000);
      expect(result[0].total).toBe(363000);
    });

    it("C2_NM이 '계'인 행은 무시된다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const response = [
        { C1_NM: "계필터시", C2_NM: "계", ITM_NM: "계", DT: "9,386,755", PRD_DE: "2024" },
        { C1_NM: "계필터시", C2_NM: "10~14세", ITM_NM: "계", DT: "217,000", PRD_DE: "2024" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      const result = await fetchAgeGroupPopulation("계필터시");
      expect(result.length).toBe(1);
      expect(result[0].ageGroup).toBe("10~14세");
    });

    it("fetch 실패 시 폴백 데이터를 반환한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("timeout")
      );

      const result = await fetchAgeGroupPopulation("연령에러시");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].ageGroup).toContain("세");
    });
  });

  describe("fetchIndustryData", () => {
    it("KOSIS_API_KEY 미설정 시 폴백 산업 데이터를 반환한다", async () => {
      delete process.env.KOSIS_API_KEY;

      const result = await fetchIndustryData("산업폴백시");
      expect(result.dataSource).toBe("fallback");
      expect(result.industries.length).toBeGreaterThan(0);
      expect(result.totalEstablishments).toBeGreaterThan(0);
      expect(result.totalEmployees).toBeGreaterThan(0);
    });

    it("API 성공 시 산업별 데이터를 파싱한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const response = [
        { C1_NM: "산업성공시", C2_NM: "도매 및 소매업", ITM_NM: "사업체수", DT: "185,420", PRD_DE: "2023" },
        { C1_NM: "산업성공시", C2_NM: "도매 및 소매업", ITM_NM: "종사자수", DT: "523,100", PRD_DE: "2023" },
        { C1_NM: "산업성공시", C2_NM: "제조업", ITM_NM: "사업체수", DT: "38,500", PRD_DE: "2023" },
        { C1_NM: "산업성공시", C2_NM: "제조업", ITM_NM: "종사자수", DT: "312,800", PRD_DE: "2023" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      const result = await fetchIndustryData("산업성공시");
      expect(result.dataSource).toBe("live");
      expect(result.industries.length).toBe(2);
      // 종사자수 내림차순 정렬 확인
      expect(result.industries[0].industry).toBe("도매 및 소매업");
      expect(result.industries[0].employees).toBe(523100);
      expect(result.industries[1].industry).toBe("제조업");
      expect(result.totalEstablishments).toBe(185420 + 38500);
      expect(result.totalEmployees).toBe(523100 + 312800);
    });

    it("C2_NM이 '전산업'인 행은 무시된다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const response = [
        { C1_NM: "전산업필터시", C2_NM: "전산업", ITM_NM: "사업체수", DT: "999,999", PRD_DE: "2023" },
        { C1_NM: "전산업필터시", C2_NM: "건설업", ITM_NM: "사업체수", DT: "28,900", PRD_DE: "2023" },
        { C1_NM: "전산업필터시", C2_NM: "건설업", ITM_NM: "종사자수", DT: "198,500", PRD_DE: "2023" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      const result = await fetchIndustryData("전산업필터시");
      expect(result.industries.length).toBe(1);
      expect(result.industries[0].industry).toBe("건설업");
    });

    it("API가 non-array를 반환하면 폴백을 사용한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse({ error: "invalid request" })
      );

      const result = await fetchIndustryData("논배열시");
      expect(result.dataSource).toBe("fallback");
    });
  });

  describe("fetchHousingSupply", () => {
    it("KOSIS_API_KEY 미설정 시 폴백 주택 데이터를 반환한다", async () => {
      delete process.env.KOSIS_API_KEY;

      const result = await fetchHousingSupply("주택폴백시");
      expect(result.dataSource).toBe("fallback");
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.trends[0]).toHaveProperty("supplyRate");
      expect(result.trends[0]).toHaveProperty("apt");
    });

    it("API 성공 시 주택보급률 데이터를 파싱한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";

      const response = [
        { C1_NM: "주택성공시", PRD_DE: "2023", ITM_NM: "주택보급률", DT: "98.9" },
        { C1_NM: "주택성공시", PRD_DE: "2023", ITM_NM: "아파트", DT: "2,858,000" },
        { C1_NM: "주택성공시", PRD_DE: "2023", ITM_NM: "단독주택", DT: "492,000" },
        { C1_NM: "주택성공시", PRD_DE: "2023", ITM_NM: "연립다세대", DT: "898,000" },
        { C1_NM: "주택성공시", PRD_DE: "2023", ITM_NM: "총주택수", DT: "4,248,000" },
        { C1_NM: "주택성공시", PRD_DE: "2024", ITM_NM: "주택보급률", DT: "99.2" },
        { C1_NM: "주택성공시", PRD_DE: "2024", ITM_NM: "아파트", DT: "2,908,000" },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      const result = await fetchHousingSupply("주택성공시");
      expect(result.dataSource).toBe("live");
      expect(result.trends.length).toBe(2);
      expect(result.trends[0].year).toBe(2023);
      expect(result.trends[0].supplyRate).toBe(98.9);
      expect(result.trends[0].apt).toBe(2858000);
      expect(result.trends[0].detached).toBe(492000);
      expect(result.trends[0].totalHousing).toBe(4248000);
      expect(result.trends[1].year).toBe(2024);
      expect(result.trends[1].supplyRate).toBe(99.2);
    });

    it("fetch 실패 시 폴백 데이터를 반환한다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("timeout")
      );

      const result = await fetchHousingSupply("주택에러시");
      expect(result.dataSource).toBe("fallback");
    });

    it("요청 URL에 orgId=116, tblId=DT_1YL20631이 포함된다", async () => {
      process.env.KOSIS_API_KEY = "test-kosis-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(null)
      );

      await fetchHousingSupply("주택URL시");

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain("orgId=116");
      expect(callUrl).toContain("tblId=DT_1YL20631");
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 5. mois-api
// ════════════════════════════════════════════════════════════════

describe("mois-api", () => {
  describe("extractAdminCode", () => {
    it("서울특별시에서 행정코드를 추출한다", () => {
      const code = extractAdminCode("서울특별시 강남구");
      expect(code).not.toBeNull();
      expect(code).toBe("1168000000");
    });

    it("정규화 후 매칭한다 (특별자치시 제거)", () => {
      const code = extractAdminCode("세종특별자치시");
      expect(code).not.toBeNull();
    });

    it("매칭되지 않는 주소는 null을 반환한다", () => {
      const code = extractAdminCode("미상의 주소");
      expect(code).toBeNull();
    });

    it("긴 키가 짧은 키보다 우선한다", () => {
      const code = extractAdminCode("서울특별시 강남구 역삼동");
      expect(code).toBe("1168000000");
    });
  });

  describe("fetchMOISPopulation", () => {
    it("MOIS_API_KEY 미설정 시 폴백 데이터를 반환한다", async () => {
      delete process.env.MOIS_API_KEY;

      const result = await fetchMOISPopulation("인구폴백시");
      expect(result.dataSource).toBe("fallback");
      expect(result.region).toBe("인구폴백시");
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.trends[0]).toHaveProperty("population");
      expect(result.trends[0]).toHaveProperty("households");
    });

    it("지역코드 매핑 실패 시 폴백을 반환한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const result = await fetchMOISPopulation("알수없는지역");
      expect(result.dataSource).toBe("fallback");
    });

    it("API 성공 시 live 데이터를 반환한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const populationData = {
        data: {
          population: 9386755,
          male: 4568930,
          female: 4817825,
          households: 4387521,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(populationData)
      );

      const result = await fetchMOISPopulation("서울");
      expect(result.dataSource).toBe("live");
      expect(result.trends.length).toBeGreaterThan(0);
      expect(result.trends[0].population).toBe(9386755);
      expect(result.trends[0].male).toBe(4568930);
      expect(result.trends[0].female).toBe(4817825);
      expect(result.trends[0].households).toBe(4387521);
    });

    it("API가 population=0 데이터를 반환하면 폴백을 사용한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const emptyData = {
        data: { population: 0, male: 0, female: 0, households: 0 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(emptyData)
      );

      // 캐시 간섭을 피하기 위해 고유한 지역명 사용
      const result = await fetchMOISPopulation("대구");
      expect(result.dataSource).toBe("fallback");
    });

    it("요청 URL에 serviceKey와 regionCode가 포함된다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(null)
      );

      await fetchMOISPopulation("대전");

      // fetchMOISPopulation은 여러 연도를 순회하며 호출하므로 첫 번째 호출 확인
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const callUrl = calls[0][0];
      expect(callUrl).toContain("jumin.mois.go.kr/openapi");
      expect(callUrl).toContain("serviceKey=test-mois-key");
      expect(callUrl).toContain("regionCode=3000000000");
      expect(callUrl).toContain("population.json");
    });

    it("API 응답이 body 필드를 사용해도 파싱된다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const responseWithBody = {
        body: {
          totPpltn: 5000000,
          malePpltn: 2400000,
          femalePpltn: 2600000,
          houseHoldCnt: 2200000,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(responseWithBody)
      );

      const result = await fetchMOISPopulation("부산");
      expect(result.dataSource).toBe("live");
      expect(result.trends[0].population).toBe(5000000);
    });
  });

  describe("fetchMOISAgePopulation", () => {
    it("MOIS_API_KEY 미설정 시 폴백 연령 데이터를 반환한다", async () => {
      delete process.env.MOIS_API_KEY;

      const result = await fetchMOISAgePopulation("연령폴백mois시");
      expect(result.dataSource).toBe("fallback");
      expect(result.ageGroups.length).toBeGreaterThan(0);
      expect(result.medianAge).toBeGreaterThan(0);
      expect(result.workingAgeRatio).toBeGreaterThan(0);
      expect(result.elderlyRatio).toBeGreaterThan(0);
    });

    it("API 성공 시 연령대별 인구와 파생 지표를 계산한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const ageData = {
        data: [
          { ageGroup: "0~4세", male: 82000, female: 77000 },
          { ageGroup: "20~24세", male: 185000, female: 178000 },
          { ageGroup: "40~44세", male: 225000, female: 220000 },
          { ageGroup: "65~69세", male: 185000, female: 205000 },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(ageData)
      );

      const result = await fetchMOISAgePopulation("경기");
      expect(result.dataSource).toBe("live");
      expect(result.ageGroups.length).toBe(4);
      expect(result.ageGroups[0].total).toBe(82000 + 77000);
      expect(result.medianAge).toBeGreaterThan(0);
      expect(result.workingAgeRatio).toBeGreaterThan(0);
      expect(result.elderlyRatio).toBeGreaterThan(0);
    });

    it("지역코드 매핑 실패 시 폴백을 반환한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const result = await fetchMOISAgePopulation("없는지역");
      expect(result.dataSource).toBe("fallback");
    });

    it("API 응답에 items 필드가 있어도 파싱된다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";

      const response = {
        items: [
          { agrde: "30~34세", malePpltn: 205000, femalePpltn: 198000 },
        ],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse(response)
      );

      // 고유한 지역명 사용
      const result = await fetchMOISAgePopulation("인천");
      expect(result.dataSource).toBe("live");
      expect(result.ageGroups[0].ageGroup).toBe("30~34세");
      expect(result.ageGroups[0].male).toBe(205000);
    });

    it("year 파라미터를 지정하면 해당 연도로 조회한다", async () => {
      process.env.MOIS_API_KEY = "test-mois-key";
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockJsonResponse({ data: [] })
      );

      const result = await fetchMOISAgePopulation("광주", 2023);
      expect(result.year).toBe(2023);

      const callUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callUrl).toContain("searchYm=202312");
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 7. index.ts (barrel export)
// ════════════════════════════════════════════════════════════════

describe("barrel export (index.ts)", () => {
  it("api-utils의 fetchWithTimeout을 re-export한다", () => {
    expect(barrel.fetchWithTimeout).toBe(fetchWithTimeout);
  });

  it("region-codes의 상수와 함수를 re-export한다", () => {
    expect(barrel.REGION_CODE_MAP).toBe(REGION_CODE_MAP);
    expect(barrel.ADMIN_CODE_MAP).toBe(ADMIN_CODE_MAP);
    expect(barrel.extractRegionFromAddress).toBe(extractRegionFromAddress);
  });

  it("kosis-api 함수를 re-export한다", () => {
    expect(barrel.fetchPopulationTrends).toBe(fetchPopulationTrends);
    expect(barrel.fetchAgeGroupPopulation).toBe(fetchAgeGroupPopulation);
    expect(barrel.fetchIndustryData).toBe(fetchIndustryData);
    expect(barrel.fetchHousingSupply).toBe(fetchHousingSupply);
  });

  it("mois-api 함수를 re-export한다", () => {
    expect(barrel.fetchMOISPopulation).toBe(fetchMOISPopulation);
    expect(barrel.fetchMOISAgePopulation).toBe(fetchMOISAgePopulation);
    expect(barrel.extractAdminCode).toBe(extractAdminCode);
  });
});
