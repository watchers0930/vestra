/**
 * VESTRA 기능 간 의존성 그래프 (DAG)
 * ────────────────────────────────────
 * 특허 핵심: 6가지 기능을 단순 나열이 아닌, 각 기능의 분석 결과가
 * 다른 기능의 입력으로 자동 반영되는 '상호 참조 피드백 루프' 구조.
 * DAG(방향성 비순환 그래프)로 순환참조를 방지.
 */

export interface DependencyNode {
  id: string;
  name: string;
  module: string;
  dependencies: string[]; // 이 노드가 의존하는 노드 ID들
}

export interface DependencyEdge {
  from: string;
  to: string;
  dataFlow: string;
  description: string;
}

export interface TopologicalResult {
  order: string[];
  isValid: boolean;
  cycleDetected?: string[];
}

/**
 * VESTRA 분석 기능 간 의존성 그래프
 */
export class AnalysisDependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];

  constructor() {
    this.initializeDefaultGraph();
  }

  /**
   * 기본 의존성 그래프 초기화
   */
  private initializeDefaultGraph(): void {
    // 노드 정의
    const defaultNodes: DependencyNode[] = [
      {
        id: "registry",
        name: "권리분석",
        module: "risk-scoring",
        dependencies: [],
      },
      {
        id: "contract",
        name: "계약서검토",
        module: "contract-analyzer",
        dependencies: [],
      },
      {
        id: "price",
        name: "시세전망",
        module: "prediction-engine",
        dependencies: [],
      },
      {
        id: "tax",
        name: "세무시뮬레이션",
        module: "tax-calculator",
        dependencies: ["registry", "price"],
      },
      {
        id: "jeonse",
        name: "전세보호",
        module: "risk-scoring",
        dependencies: ["price", "registry"],
      },
      {
        id: "fraud",
        name: "사기위험평가",
        module: "fraud-risk-model",
        dependencies: ["registry", "price", "contract"],
      },
      {
        id: "vscore",
        name: "V-Score",
        module: "v-score",
        dependencies: ["registry", "price", "contract", "fraud"],
      },
      {
        id: "cross",
        name: "교차검증",
        module: "cross-analysis",
        dependencies: ["registry", "contract"],
      },
    ];

    for (const node of defaultNodes) {
      this.nodes.set(node.id, node);
    }

    // 엣지(데이터 흐름) 정의
    this.edges = [
      {
        from: "registry",
        to: "tax",
        dataFlow: "소유권 변동 이력, 근저당 설정 정보",
        description: "소유권 이전 이력 → 양도세 자동 반영",
      },
      {
        from: "price",
        to: "jeonse",
        dataFlow: "시세 하락 예측값",
        description: "시세 하락 예측 시 → 깡투자 위험 경고 자동 발동",
      },
      {
        from: "contract",
        to: "cross",
        dataFlow: "계약서 특약사항",
        description: "계약서 특약사항 → 등기부등본 일치 여부 교차 검증",
      },
      {
        from: "registry",
        to: "cross",
        dataFlow: "등기 권리관계",
        description: "등기부등본 → 계약서 교차 검증 대상",
      },
      {
        from: "jeonse",
        to: "price",
        dataFlow: "전세가율 변동",
        description: "전세가율 → 시세 예측 모델에 피드백",
      },
      {
        from: "registry",
        to: "fraud",
        dataFlow: "근저당비율, 압류/가처분, 선순위채권비율",
        description: "등기 위험요소 → 전세사기 피처 입력",
      },
      {
        from: "price",
        to: "fraud",
        dataFlow: "전세가율, 매매가 대비 전세비율, 시세변동률",
        description: "시세 데이터 → 전세사기 피처 입력",
      },
      {
        from: "fraud",
        to: "vscore",
        dataFlow: "사기 위험도 점수",
        description: "전세사기 위험 → V-Score 지역 위험도 입력",
      },
    ];
  }

  /**
   * 토폴로지 정렬 (실행 순서 결정)
   * Kahn's Algorithm
   */
  topologicalSort(): TopologicalResult {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // 초기화
    for (const [id, node] of this.nodes) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    // 간선 카운트
    for (const [id, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (this.nodes.has(dep)) {
          adjacency.get(dep)?.push(id);
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      }
    }

    // 진입차수 0인 노드부터
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      for (const next of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, newDegree);
        if (newDegree === 0) queue.push(next);
      }
    }

    // 순환 검출
    if (order.length !== this.nodes.size) {
      const remaining = [...this.nodes.keys()].filter(
        (id) => !order.includes(id)
      );
      return {
        order,
        isValid: false,
        cycleDetected: remaining,
      };
    }

    return { order, isValid: true };
  }

  /**
   * 특정 노드 변경 시 영향 받는 노드 목록 (BFS)
   */
  getAffectedNodes(changedNodeId: string): string[] {
    const affected: string[] = [];
    const visited = new Set<string>();
    const queue = [changedNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // 이 노드에 의존하는 노드 찾기
      for (const [id, node] of this.nodes) {
        if (
          node.dependencies.includes(current) &&
          !visited.has(id)
        ) {
          affected.push(id);
          queue.push(id);
        }
      }
    }

    return affected;
  }

  /**
   * 데이터 흐름 엣지 조회
   */
  getEdges(): DependencyEdge[] {
    return [...this.edges];
  }

  /**
   * 노드 조회
   */
  getNodes(): DependencyNode[] {
    return [...this.nodes.values()];
  }

  /**
   * DAG 유효성 검증
   */
  validate(): boolean {
    return this.topologicalSort().isValid;
  }
}

/**
 * 싱글턴 의존성 그래프
 */
let graphInstance: AnalysisDependencyGraph | null = null;

export function getDependencyGraph(): AnalysisDependencyGraph {
  if (!graphInstance) {
    graphInstance = new AnalysisDependencyGraph();
  }
  return graphInstance;
}
