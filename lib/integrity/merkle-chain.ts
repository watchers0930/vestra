/**
 * Merkle Tree + IntegrityChain (해시 체인 무결성 증명)
 *
 * @module lib/integrity/merkle-chain
 */

// ─── 해시 유틸리티 (SHA-256) ───

/**
 * Web Crypto API 기반 SHA-256 해시
 * Node.js 환경에서는 crypto 모듈 사용
 */
export async function sha256(data: string): Promise<string> {
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
export function deterministicStringify(obj: unknown): string {
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

// ─── Merkle Tree ───

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
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

  async build(dataItems: string[]): Promise<string> {
    if (dataItems.length === 0) {
      throw new Error('Cannot build Merkle Tree with empty data');
    }

    this.leaves = await Promise.all(
      dataItems.map(async (data, index) => ({
        hash: await sha256('leaf:' + data),
        data,
        index,
      }))
    );

    let currentLayer = [...this.leaves];
    this.layers = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: MerkleNode[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || currentLayer[i];

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

  getRootHash(): string {
    if (!this.root) throw new Error('Tree not built');
    return this.root.hash;
  }

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

// ─── 분석 단계 해시 체인 ───

export interface AnalysisStep {
  stepId: string;
  stepName: string;
  timestamp: number;
  inputHash: string;
  outputHash: string;
  parameters: Record<string, unknown>;
  previousStepHash: string | null;
  stepHash: string;
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

  async finalize(): Promise<string> {
    if (this.chain.steps.length === 0) {
      throw new Error('Cannot finalize empty chain');
    }

    const stepHashes = this.chain.steps.map(s => s.stepHash);
    const merkleRoot = await this.merkleTree.build(stepHashes);

    this.chain.merkleRoot = merkleRoot;
    this.chain.isFinalized = true;

    return merkleRoot;
  }

  getStepProof(stepIndex: number): MerkleProof {
    if (!this.chain.isFinalized) {
      throw new Error('Chain must be finalized before generating proofs');
    }
    return this.merkleTree.getProof(stepIndex);
  }

  async verify(): Promise<IntegrityReport> {
    const brokenLinks: number[] = [];
    const tamperedSteps: string[] = [];

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

    for (let i = 1; i < this.chain.steps.length; i++) {
      const currentStep = this.chain.steps[i];
      const previousStep = this.chain.steps[i - 1];

      if (currentStep.previousStepHash !== previousStep.stepHash) {
        brokenLinks.push(i);
      }
    }

    if (this.chain.steps.length > 0 && this.chain.steps[0].previousStepHash !== null) {
      brokenLinks.push(0);
    }

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

  serialize(): string {
    return JSON.stringify(this.chain, null, 2);
  }

  static async deserialize(data: string): Promise<IntegrityChain> {
    const parsed: AnalysisChain = JSON.parse(data);
    const instance = new IntegrityChain(parsed.chainId);
    instance.chain = parsed;

    if (parsed.isFinalized && parsed.steps.length > 0) {
      const stepHashes = parsed.steps.map(s => s.stepHash);
      await instance.merkleTree.build(stepHashes);
    }

    return instance;
  }

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
