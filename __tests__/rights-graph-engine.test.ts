import { describe, it, expect, beforeAll } from "vitest";
import {
  buildRightsGraph,
  analyzeRightsGraph,
} from "@/lib/rights-graph-engine";

// ─── 테스트 데이터 ───

const simple: any = {
  title: { address: "서울시 강남구" },
  gapgu: [
    { order: 1, purpose: "소유권이전", holder: "홍길동", date: "2020.01.01", isCancelled: false },
  ],
  eulgu: [],
};

const complex: any = {
  title: { address: "서울시 강남구" },
  gapgu: [
    { order: 1, purpose: "소유권이전", holder: "홍길동", date: "2020.01.01", isCancelled: false },
    { order: 2, purpose: "가압류", holder: "김채권", date: "2023.06.01", isCancelled: false },
  ],
  eulgu: [
    { order: 1, purpose: "근저당권설정", holder: "국민은행", date: "2021.03.15", amount: 500000000, isCancelled: false },
  ],
};

const empty: any = { title: null, gapgu: [], eulgu: [] };

const cancelled: any = {
  title: { address: "test" },
  gapgu: [
    { order: 1, purpose: "소유권이전", holder: "A", date: "2020.01.01", isCancelled: false },
    { order: 2, purpose: "가압류", holder: "B", date: "2021.01.01", isCancelled: true },
  ],
  eulgu: [],
};

// ─── 테스트 ───

describe("buildRightsGraph", () => {
  describe("단순 등기 (소유권만)", () => {
    it("부동산 루트 + 소유권 노드가 최소 2개 존재한다", () => {
      const graph = buildRightsGraph(simple);
      expect(graph.nodes.size).toBeGreaterThanOrEqual(2);
    });

    it("부동산 루트 노드가 존재한다", () => {
      const graph = buildRightsGraph(simple);
      expect(graph.nodes.has("property_root")).toBe(true);
    });

    it("소유권이전 노드가 존재한다", () => {
      const graph = buildRightsGraph(simple);
      expect(graph.nodes.has("gapgu_1")).toBe(true);
    });

    it("엣지가 존재한다", () => {
      const graph = buildRightsGraph(simple);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it("인접 리스트가 구축되어 있다", () => {
      const graph = buildRightsGraph(simple);
      expect(graph.adjacency.size).toBeGreaterThan(0);
    });
  });

  describe("빈 입력", () => {
    it("property_root 노드가 존재한다 (nodeCount >= 1)", () => {
      const graph = buildRightsGraph(empty);
      expect(graph.nodes.size).toBeGreaterThanOrEqual(1);
      expect(graph.nodes.has("property_root")).toBe(true);
    });

    it("빈 입력에서도 에러 없이 그래프를 반환한다", () => {
      const graph = buildRightsGraph(empty);
      expect(graph.nodes).toBeInstanceOf(Map);
      expect(graph.edges).toBeInstanceOf(Array);
      expect(graph.adjacency).toBeInstanceOf(Map);
      expect(graph.reverseAdj).toBeInstanceOf(Map);
    });
  });

  describe("말소된 항목 제외", () => {
    it("말소된 가압류 노드가 생성되지 않는다", () => {
      const graph = buildRightsGraph(cancelled);
      // gapgu_2는 isCancelled: true이므로 노드에 포함되면 안 된다
      expect(graph.nodes.has("gapgu_2")).toBe(false);
    });

    it("말소되지 않은 항목만 노드로 생성된다", () => {
      const graph = buildRightsGraph(cancelled);
      // property_root + gapgu_1(소유권이전) = 2개
      expect(graph.nodes.has("property_root")).toBe(true);
      expect(graph.nodes.has("gapgu_1")).toBe(true);
      expect(graph.nodes.size).toBe(2);
    });
  });
});

describe("analyzeRightsGraph", () => {
  describe("복합 등기 (근저당 + 압류)", () => {
    let result: ReturnType<typeof analyzeRightsGraph>;
    beforeAll(() => {
      result = analyzeRightsGraph(complex, 1000000000);
    });

    it("노드가 4개 이상 존재한다", () => {
      expect(result.graph.nodeCount).toBeGreaterThanOrEqual(4);
    });

    it("엣지가 존재한다", () => {
      expect(result.graph.edgeCount).toBeGreaterThan(0);
    });

    it("체인이 1개 이상 존재한다", () => {
      expect(result.chainAnalysis.chains.length).toBeGreaterThan(0);
    });

    it("전체 시스템 위험도가 0보다 크다", () => {
      expect(result.riskPropagation.totalSystemRisk).toBeGreaterThan(0);
    });

    it("maxDepth가 0 이상이다", () => {
      expect(result.graph.maxDepth).toBeGreaterThanOrEqual(0);
    });
  });

  describe("빈 입력 분석", () => {
    let result: ReturnType<typeof analyzeRightsGraph>;
    beforeAll(() => {
      result = analyzeRightsGraph(empty);
    });

    it("순환이 없다", () => {
      expect(result.cycles.hasCycle).toBe(false);
      expect(result.cycles.cycles).toHaveLength(0);
    });

    it("노드가 최소 1개(property_root) 존재한다", () => {
      expect(result.graph.nodeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("totalSystemRisk 범위", () => {
    it("단순 등기에서 0~100 범위이다", () => {
      const result = analyzeRightsGraph(simple);
      expect(result.riskPropagation.totalSystemRisk).toBeGreaterThanOrEqual(0);
      expect(result.riskPropagation.totalSystemRisk).toBeLessThanOrEqual(100);
    });

    it("복합 등기에서 0~100 범위이다", () => {
      const result = analyzeRightsGraph(complex, 1000000000);
      expect(result.riskPropagation.totalSystemRisk).toBeGreaterThanOrEqual(0);
      expect(result.riskPropagation.totalSystemRisk).toBeLessThanOrEqual(100);
    });

    it("빈 입력에서 0~100 범위이다", () => {
      const result = analyzeRightsGraph(empty);
      expect(result.riskPropagation.totalSystemRisk).toBeGreaterThanOrEqual(0);
      expect(result.riskPropagation.totalSystemRisk).toBeLessThanOrEqual(100);
    });
  });

  describe("criticalPath", () => {
    it("path 배열이 비어있지 않다", () => {
      const result = analyzeRightsGraph(complex, 1000000000);
      expect(result.criticalPath.path.length).toBeGreaterThan(0);
    });

    it("totalRisk가 0 이상이다", () => {
      const result = analyzeRightsGraph(complex, 1000000000);
      expect(result.criticalPath.totalRisk).toBeGreaterThanOrEqual(0);
    });

    it("maxLossAmount가 0 이상이다", () => {
      const result = analyzeRightsGraph(complex, 1000000000);
      expect(result.criticalPath.maxLossAmount).toBeGreaterThanOrEqual(0);
    });

    it("description이 존재한다", () => {
      const result = analyzeRightsGraph(complex, 1000000000);
      expect(result.criticalPath.description).toBeTruthy();
      expect(result.criticalPath.description.length).toBeGreaterThan(0);
    });
  });
});
