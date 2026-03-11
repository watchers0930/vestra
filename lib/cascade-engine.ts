/**
 * VESTRA 캐스케이드 업데이트 엔진
 * ─────────────────────────────────
 * 하나의 분석 결과가 변경되면 연관된 모든 분석이
 * 자동으로 재계산되는 변경 전파 메커니즘.
 *
 * 특허 핵심: 단순 기능 병합이 아닌 '기능 간 데이터 순환 처리' 방법론.
 */

import { AnalysisDependencyGraph, getDependencyGraph } from "./dependency-graph";

// ─── 타입 정의 ───

export interface CascadeUpdate {
  nodeId: string;
  nodeName: string;
  triggeredBy: string;
  previousValue?: unknown;
  newValue?: unknown;
  timestamp: string;
  skipped: boolean;
  skipReason?: string;
}

export interface CascadeResult {
  triggerNode: string;
  updatesExecuted: CascadeUpdate[];
  totalNodesAffected: number;
  totalUpdatesSkipped: number;
  executionOrder: string[];
  executionTimeMs: number;
}

// 재계산 함수 타입
type RecalculateFn = (
  nodeId: string,
  context: Record<string, unknown>,
) => Promise<unknown> | unknown;

// ─── 임계값 기반 변경 감지 ───

const CHANGE_THRESHOLDS: Record<string, number> = {
  registry: 5,   // 점수 5점 이상 변동 시 전파
  price: 3,      // 3% 이상 변동 시 전파
  contract: 10,  // 10점 이상 변동 시 전파
  fraud: 5,      // 5점 이상 변동 시 전파
  vscore: 3,     // 3점 이상 변동 시 전파
  tax: 1000000,  // 100만원 이상 변동 시 전파
  jeonse: 5,     // 5점 이상 변동 시 전파
  cross: 0,      // 항상 전파
};

/**
 * 변경이 임계값을 초과하는지 확인
 */
function isSignificantChange(
  nodeId: string,
  oldValue: unknown,
  newValue: unknown,
): boolean {
  const threshold = CHANGE_THRESHOLDS[nodeId] ?? 0;
  if (threshold === 0) return true;

  if (typeof oldValue === "number" && typeof newValue === "number") {
    return Math.abs(newValue - oldValue) >= threshold;
  }

  // 객체인 경우 score 필드 비교
  if (
    oldValue &&
    newValue &&
    typeof oldValue === "object" &&
    typeof newValue === "object"
  ) {
    const oldScore = (oldValue as Record<string, unknown>).score ??
      (oldValue as Record<string, unknown>).totalScore;
    const newScore = (newValue as Record<string, unknown>).score ??
      (newValue as Record<string, unknown>).totalScore;

    if (typeof oldScore === "number" && typeof newScore === "number") {
      return Math.abs(newScore - oldScore) >= threshold;
    }
  }

  // 비교 불가 → 항상 전파
  return true;
}

// ─── 캐스케이드 엔진 ───

export class CascadeEngine {
  private graph: AnalysisDependencyGraph;
  private recalculators: Map<string, RecalculateFn> = new Map();
  private context: Record<string, unknown> = {};

  constructor(graph?: AnalysisDependencyGraph) {
    this.graph = graph ?? getDependencyGraph();
  }

  /**
   * 재계산 함수 등록
   */
  registerRecalculator(nodeId: string, fn: RecalculateFn): void {
    this.recalculators.set(nodeId, fn);
  }

  /**
   * 컨텍스트 설정 (분석 결과 캐시)
   */
  setContext(key: string, value: unknown): void {
    this.context[key] = value;
  }

  /**
   * 전체 컨텍스트 설정
   */
  setFullContext(ctx: Record<string, unknown>): void {
    this.context = { ...ctx };
  }

  /**
   * 캐스케이드 업데이트 실행
   *
   * @param triggerNodeId - 변경이 발생한 노드
   * @param newValue - 새로운 값
   */
  async executeCascade(
    triggerNodeId: string,
    newValue: unknown,
  ): Promise<CascadeResult> {
    const startTime = Date.now();
    const updates: CascadeUpdate[] = [];

    // 영향 받는 노드 목록 (BFS 순서)
    const affectedNodes = this.graph.getAffectedNodes(triggerNodeId);

    // 토폴로지 정렬 순서에 맞게 재정렬
    const topo = this.graph.topologicalSort();
    const executionOrder = topo.order.filter((id) =>
      affectedNodes.includes(id)
    );

    // 트리거 노드 컨텍스트 업데이트
    const oldTriggerValue = this.context[triggerNodeId];
    this.context[triggerNodeId] = newValue;

    // 영향 받는 노드 순차 재계산
    for (const nodeId of executionOrder) {
      const recalculator = this.recalculators.get(nodeId);
      const oldValue = this.context[nodeId];

      // 임계값 검사 (트리거 노드의 변경이 유의미한지)
      if (!isSignificantChange(triggerNodeId, oldTriggerValue, newValue)) {
        updates.push({
          nodeId,
          nodeName: this.graph.getNodes().find((n) => n.id === nodeId)?.name ?? nodeId,
          triggeredBy: triggerNodeId,
          timestamp: new Date().toISOString(),
          skipped: true,
          skipReason: "변경량이 임계값 미만",
        });
        continue;
      }

      if (!recalculator) {
        updates.push({
          nodeId,
          nodeName: this.graph.getNodes().find((n) => n.id === nodeId)?.name ?? nodeId,
          triggeredBy: triggerNodeId,
          timestamp: new Date().toISOString(),
          skipped: true,
          skipReason: "재계산 함수 미등록",
        });
        continue;
      }

      try {
        const result = await recalculator(nodeId, this.context);
        this.context[nodeId] = result;

        updates.push({
          nodeId,
          nodeName: this.graph.getNodes().find((n) => n.id === nodeId)?.name ?? nodeId,
          triggeredBy: triggerNodeId,
          previousValue: oldValue,
          newValue: result,
          timestamp: new Date().toISOString(),
          skipped: false,
        });
      } catch (error) {
        console.error(`[Cascade] Recalculation failed for ${nodeId}:`, error);
        updates.push({
          nodeId,
          nodeName: this.graph.getNodes().find((n) => n.id === nodeId)?.name ?? nodeId,
          triggeredBy: triggerNodeId,
          timestamp: new Date().toISOString(),
          skipped: true,
          skipReason: `재계산 실패: ${error instanceof Error ? error.message : "unknown"}`,
        });
      }
    }

    return {
      triggerNode: triggerNodeId,
      updatesExecuted: updates,
      totalNodesAffected: affectedNodes.length,
      totalUpdatesSkipped: updates.filter((u) => u.skipped).length,
      executionOrder,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * 캐스케이드 엔진 팩토리
 */
export function createCascadeEngine(): CascadeEngine {
  return new CascadeEngine();
}
