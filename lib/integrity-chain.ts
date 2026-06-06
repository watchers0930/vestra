/**
 * 해시 체인 무결성 증명 시스템 (Hash Chain Integrity Proof System)
 *
 * Merkle Tree 기반 분석 파이프라인 무결성 검증
 * - 각 분석 단계의 입출력을 해시로 연결
 * - 사후 검증(tamper detection) 가능
 * - 블록체인 불필요, 자체 Merkle Tree 구현
 */

import {
  sha256, deterministicStringify,
  MerkleTree, IntegrityChain,
} from "./integrity/merkle-chain";
import type { AnalysisStep, MerkleProof, IntegrityReport } from "./integrity/merkle-chain";

// ─── re-export (기존 import 경로 유지) ───

export {
  sha256, deterministicStringify,
  MerkleTree, IntegrityChain,
} from "./integrity/merkle-chain";

export type {
  MerkleNode, MerkleProof,
  AnalysisStep, AnalysisChain, IntegrityReport,
} from "./integrity/merkle-chain";

// ─── 분석 파이프라인 통합 래퍼 ───

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

  getStageProof(stageIndex: number): MerkleProof {
    return this.chain.getStepProof(stageIndex);
  }

  serialize(): string {
    return this.chain.serialize();
  }
}

// ─── 독립 검증 유틸리티 ───

/**
 * 직렬화된 체인의 무결성을 독립적으로 검증
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
 */
export async function compareAnalysisOutputs(
  output1: unknown,
  output2: unknown
): Promise<{ match: boolean; hash1: string; hash2: string }> {
  const hash1 = await sha256(deterministicStringify(output1));
  const hash2 = await sha256(deterministicStringify(output2));
  return { match: hash1 === hash2, hash1, hash2 };
}
