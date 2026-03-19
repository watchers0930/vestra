/**
 * 해시 체인 무결성 증명 시스템 (Hash Chain Integrity Proof System)
 *
 * Merkle Tree 기반 분석 파이프라인 무결성 검증
 * - 각 분석 단계의 입출력을 해시로 연결
 * - 사후 검증(tamper detection) 가능
 * - 블록체인 불필요, 자체 Merkle Tree 구현
 */

// ============================================================
// 1. 해시 유틸리티 (SHA-256 기반)
// ============================================================

/**
 * Web Crypto API 기반 SHA-256 해시
 * Node.js 환경에서는 crypto 모듈 사용
 */
async function sha256(data: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoder = new TextEncoder();
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node.js fallback
  const { createHash } = await import('crypto');
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 객체를 결정론적 문자열로 변환 (키 정렬)
 */
function deterministicStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']';
  }
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + sorted.map(k =>
    JSON.stringify(k) + ':' + deterministicStringify((obj as Record<string, unknown>)[k])
  ).join(',') + '}';
}

// ============================================================
// 2. Merkle Tree 구현
// ============================================================

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string; // leaf만 보유
  index?: number;
}

export interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  siblings: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  root: string;
}

export class MerkleTree {
  private leaves: MerkleNode[] = [];
  private root: MerkleNode | null = null;
  private layers: MerkleNode[][] = [];

  /**
   * 리프 노드들로 Merkle Tree 구축
   */
  async build(dataItems: string[]): Promise<string> {
    if (dataItems.length === 0) {
      throw new Error('Cannot build Merkle Tree with empty data');
    }

    // 리프 노드 생성
    this.leaves = await Promise.all(
      dataItems.map(async (data, index) => ({
        hash: await sha256('leaf:' + data),
        data,
        index,
      }))
    );

    // 홀수 개면 마지막 노드 복제 (balanced tree)
    let currentLayer = [...this.leaves];
    this.layers = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: MerkleNode[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || currentLayer[i]; // 홀수면 복제

        const parentHash = await sha256('node:' + left.hash + ':' + right.hash);
        nextLayer.push({
          hash: parentHash,
          left,
          right: currentLayer[i + 1] ? right : undefined,
        });
      }

      currentLayer = nextLayer;
      this.layers.push(currentLayer);
    }

    this.root = currentLayer[0];
    return this.root.hash;
  }

  /**
   * 루트 해시 반환
   */
  getRootHash(): string {
    if (!this.root) throw new Error('Tree not built');
    return this.root.hash;
  }

  /**
   * 특정 리프에 대한 Merkle Proof 생성
   * 이 proof로 해당 데이터가 트리에 포함되어 있는지 독립 검증 가능
   */
  getProof(leafIndex: number): MerkleProof {
    if (!this.root || leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error('Invalid leaf index or tree not built');
    }

    const siblings: MerkleProof['siblings'] = [];
    let currentIndex = leafIndex;

    for (let layer = 0; layer < this.layers.length - 1; layer++) {
      const currentLayer = this.layers[layer];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLayer.length) {
        siblings.push({
          hash: currentLayer[siblingIndex].hash,
          position: isRightNode ? 'left' : 'right',
        });
      } else {
        // 홀수 레이어에서 마지막 노드 → 자기 자신이 sibling
        siblings.push({
          hash: currentLayer[currentIndex].hash,
          position: 'right',
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leafHash: this.leaves[leafIndex].hash,
      leafIndex,
      siblings,
      root: this.root.hash,
    };
  }

  /**
   * Merkle Proof 독립 검증 (정적 메서드)
   * Tree 없이도 proof만으로 검증 가능
   */
  static async verifyProof(proof: MerkleProof): Promise<boolean> {
    let currentHash = proof.leafHash;

    for (const sibling of proof.siblings) {
      if (sibling.position === 'left') {
        currentHash = await sha256('node:' + sibling.hash + ':' + currentHash);
      } else {
        currentHash = await sha256('node:' + currentHash + ':' + sibling.hash);
      }
    }

    return currentHash === proof.root;
  }
}

// ============================================================
// 3. 분석 단계 해시 체인 (Analysis Step Chain)
// ============================================================

export interface AnalysisStep {
  stepId: string;
  stepName: string;
  timestamp: number;
  inputHash: string;
  outputHash: string;
  parameters: Record<string, unknown>;
  previousStepHash: string | null; // 체인 연결
  stepHash: string; // 이 단계의 최종 해시
}

export interface AnalysisChain {
  chainId: string;
  createdAt: number;
  steps: AnalysisStep[];
  merkleRoot: string | null;
  isFinalized: boolean;
}

export interface IntegrityReport {
  chainId: string;
  totalSteps: number;
  isValid: boolean;
  merkleRootValid: boolean;
  chainLinksValid: boolean;
  brokenLinks: number[];
  tamperedSteps: string[];
  verifiedAt: number;
}

/**
 * 분석 파이프라인 무결성 체인
 * 각 분석 단계의 입출력을 해시로 연결하여 사후 검증 가능
 */
export class IntegrityChain {
  private chain: AnalysisChain;
  private merkleTree: MerkleTree;

  constructor(chainId?: string) {
    this.chain = {
      chainId: chainId || `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      steps: [],
      merkleRoot: null,
      isFinalized: false,
    };
    this.merkleTree = new MerkleTree();
  }

  /**
   * 분석 단계 추가
   * 입력 데이터와 출력 데이터를 해시로 변환하여 체인에 연결
   */
  async addStep(
    stepName: string,
    input: unknown,
    output: unknown,
    parameters: Record<string, unknown> = {}
  ): Promise<AnalysisStep> {
    if (this.chain.isFinalized) {
      throw new Error('Cannot add steps to a finalized chain');
    }

    const inputHash = await sha256(deterministicStringify(input));
    const outputHash = await sha256(deterministicStringify(output));

    const previousStep = this.chain.steps[this.chain.steps.length - 1];
    const previousStepHash = previousStep?.stepHash || null;

    // 단계 해시 = H(stepName + inputHash + outputHash + params + prevHash + timestamp)
    const timestamp = Date.now();
    const stepId = `step_${this.chain.steps.length}_${timestamp}`;

    const stepHash = await sha256(
      deterministicStringify({
        stepId,
        stepName,
        inputHash,
        outputHash,
        parameters,
        previousStepHash,
        timestamp,
      })
    );

    const step: AnalysisStep = {
      stepId,
      stepName,
      timestamp,
      inputHash,
      outputHash,
      parameters,
      previousStepHash,
      stepHash,
    };

    this.chain.steps.push(step);
    return step;
  }

  /**
   * 체인 확정 및 Merkle Root 생성
   * 모든 단계가 추가된 후 호출
   */
  async finalize(): Promise<string> {
    if (this.chain.steps.length === 0) {
      throw new Error('Cannot finalize empty chain');
    }

    // 각 step의 해시를 리프로 하는 Merkle Tree 구축
    const stepHashes = this.chain.steps.map(s => s.stepHash);
    const merkleRoot = await this.merkleTree.build(stepHashes);

    this.chain.merkleRoot = merkleRoot;
    this.chain.isFinalized = true;

    return merkleRoot;
  }

  /**
   * 특정 단계의 Merkle Proof 생성
   * 이 proof를 제3자에게 제출하면 해당 단계가 체인에 포함됨을 독립 증명 가능
   */
  getStepProof(stepIndex: number): MerkleProof {
    if (!this.chain.isFinalized) {
      throw new Error('Chain must be finalized before generating proofs');
    }
    return this.merkleTree.getProof(stepIndex);
  }

  /**
   * 전체 체인 무결성 검증
   * 1) 각 단계의 해시 재계산 → 저장된 해시와 비교
   * 2) 체인 링크 검증 (previousStepHash 연결)
   * 3) Merkle Root 재계산 → 저장된 루트와 비교
   */
  async verify(): Promise<IntegrityReport> {
    const brokenLinks: number[] = [];
    const tamperedSteps: string[] = [];

    // 1. 각 단계의 해시 재계산 검증
    for (let i = 0; i < this.chain.steps.length; i++) {
      const step = this.chain.steps[i];

      const expectedHash = await sha256(
        deterministicStringify({
          stepId: step.stepId,
          stepName: step.stepName,
          inputHash: step.inputHash,
          outputHash: step.outputHash,
          parameters: step.parameters,
          previousStepHash: step.previousStepHash,
          timestamp: step.timestamp,
        })
      );

      if (expectedHash !== step.stepHash) {
        tamperedSteps.push(step.stepId);
      }
    }

    // 2. 체인 링크 검증
    for (let i = 1; i < this.chain.steps.length; i++) {
      const currentStep = this.chain.steps[i];
      const previousStep = this.chain.steps[i - 1];

      if (currentStep.previousStepHash !== previousStep.stepHash) {
        brokenLinks.push(i);
      }
    }

    // 첫 번째 단계의 previousStepHash는 null이어야 함
    if (this.chain.steps.length > 0 && this.chain.steps[0].previousStepHash !== null) {
      brokenLinks.push(0);
    }

    // 3. Merkle Root 검증
    let merkleRootValid = false;
    if (this.chain.isFinalized && this.chain.merkleRoot) {
      const stepHashes = this.chain.steps.map(s => s.stepHash);
      const verifyTree = new MerkleTree();
      const recomputedRoot = await verifyTree.build(stepHashes);
      merkleRootValid = recomputedRoot === this.chain.merkleRoot;
    }

    const chainLinksValid = brokenLinks.length === 0;
    const isValid = tamperedSteps.length === 0 && chainLinksValid && merkleRootValid;

    return {
      chainId: this.chain.chainId,
      totalSteps: this.chain.steps.length,
      isValid,
      merkleRootValid,
      chainLinksValid,
      brokenLinks,
      tamperedSteps,
      verifiedAt: Date.now(),
    };
  }

  /**
   * 체인 데이터 직렬화 (저장/전송용)
   */
  serialize(): string {
    return JSON.stringify(this.chain, null, 2);
  }

  /**
   * 직렬화된 체인 복원 (정적 메서드)
   */
  static async deserialize(data: string): Promise<IntegrityChain> {
    const parsed: AnalysisChain = JSON.parse(data);
    const instance = new IntegrityChain(parsed.chainId);
    instance.chain = parsed;

    // Merkle Tree 재구축 (finalized인 경우)
    if (parsed.isFinalized && parsed.steps.length > 0) {
      const stepHashes = parsed.steps.map(s => s.stepHash);
      await instance.merkleTree.build(stepHashes);
    }

    return instance;
  }

  /**
   * 체인 정보 조회
   */
  getChainInfo(): {
    chainId: string;
    totalSteps: number;
    merkleRoot: string | null;
    isFinalized: boolean;
    createdAt: number;
  } {
    return {
      chainId: this.chain.chainId,
      totalSteps: this.chain.steps.length,
      merkleRoot: this.chain.merkleRoot,
      isFinalized: this.chain.isFinalized,
      createdAt: this.chain.createdAt,
    };
  }
}

// ============================================================
// 4. 분석 파이프라인 통합 래퍼
// ============================================================

export interface PipelineStageResult<T> {
  stageName: string;
  input: unknown;
  output: T;
  step: AnalysisStep;
}

/**
 * 분석 파이프라인에 무결성 체인을 통합하는 래퍼
 *
 * 사용 예:
 * ```ts
 * const pipeline = new VerifiedPipeline('jeonse-analysis');
 *
 * const stage1 = await pipeline.executeStage('위험도분석', inputData, async (data) => {
 *   return calculateRiskScore(data);
 * });
 *
 * const stage2 = await pipeline.executeStage('권리분석', stage1.output, async (data) => {
 *   return analyzeRights(data);
 * });
 *
 * const result = await pipeline.finalize();
 * // result.merkleRoot → 전체 분석의 무결성 증명
 * // result.report → 검증 보고서
 * ```
 */
export class VerifiedPipeline {
  private chain: IntegrityChain;
  private stages: PipelineStageResult<unknown>[] = [];

  constructor(pipelineId?: string) {
    this.chain = new IntegrityChain(pipelineId);
  }

  /**
   * 분석 단계 실행 + 자동 해시 기록
   */
  async executeStage<T>(
    stageName: string,
    input: unknown,
    executor: (input: unknown) => Promise<T>,
    parameters: Record<string, unknown> = {}
  ): Promise<PipelineStageResult<T>> {
    const output = await executor(input);

    const step = await this.chain.addStep(stageName, input, output, parameters);

    const result: PipelineStageResult<T> = {
      stageName,
      input,
      output,
      step,
    };

    this.stages.push(result as PipelineStageResult<unknown>);
    return result;
  }

  /**
   * 파이프라인 확정 및 무결성 보고서 생성
   */
  async finalize(): Promise<{
    merkleRoot: string;
    report: IntegrityReport;
    stages: Array<{
      name: string;
      stepHash: string;
      inputHash: string;
      outputHash: string;
    }>;
  }> {
    const merkleRoot = await this.chain.finalize();
    const report = await this.chain.verify();

    const stages = this.stages.map(s => ({
      name: s.stageName,
      stepHash: s.step.stepHash,
      inputHash: s.step.inputHash,
      outputHash: s.step.outputHash,
    }));

    return { merkleRoot, report, stages };
  }

  /**
   * 특정 단계의 독립 검증 proof
   */
  getStageProof(stageIndex: number): MerkleProof {
    return this.chain.getStepProof(stageIndex);
  }

  /**
   * 파이프라인 직렬화
   */
  serialize(): string {
    return this.chain.serialize();
  }
}

// ============================================================
// 5. 독립 검증 유틸리티
// ============================================================

/**
 * 직렬화된 체인의 무결성을 독립적으로 검증
 * 체인 생성자와 무관하게 제3자가 검증 가능
 */
export async function verifyChainIntegrity(serializedChain: string): Promise<IntegrityReport> {
  const chain = await IntegrityChain.deserialize(serializedChain);
  return chain.verify();
}

/**
 * Merkle Proof의 독립 검증
 */
export async function verifyStepInclusion(proof: MerkleProof): Promise<boolean> {
  return MerkleTree.verifyProof(proof);
}

/**
 * 두 분석 결과의 데이터 무결성 비교
 * 같은 입력에 대해 같은 출력이 나왔는지 확인
 */
export async function compareAnalysisOutputs(
  output1: unknown,
  output2: unknown
): Promise<{ match: boolean; hash1: string; hash2: string }> {
  const hash1 = await sha256(deterministicStringify(output1));
  const hash2 = await sha256(deterministicStringify(output2));
  return { match: hash1 === hash2, hash1, hash2 };
}
