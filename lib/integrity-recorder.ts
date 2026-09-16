/**
 * 분석 파이프라인 무결성 기록 헬퍼
 * 분석 API에서 호출하여 IntegrityRecord를 DB에 저장
 */

import { prisma } from "@/lib/prisma";
import { IntegrityChain } from "@/lib/integrity-chain";

interface RecordIntegrityParams {
  analysisId: string;
  analysisType: string;
  address?: string;
  steps: Array<{
    name: string;
    input: unknown;
    output: unknown;
  }>;
}

/**
 * 분석 결과의 무결성 체인을 생성하고 DB에 저장
 */
export async function recordIntegrity(params: RecordIntegrityParams): Promise<string> {
  const { analysisId, analysisType, address, steps } = params;

  const chain = new IntegrityChain(`chain_${analysisId}`);

  const stepsData = [];
  for (const step of steps) {
    const recorded = await chain.addStep(step.name, step.input, step.output);
    stepsData.push({
      stepId: recorded.stepId,
      stepName: recorded.stepName,
      inputHash: recorded.inputHash,
      outputHash: recorded.outputHash,
      previousStepHash: recorded.previousStepHash,
      stepHash: recorded.stepHash,
      timestamp: recorded.timestamp,
    });
  }

  const merkleRoot = await chain.finalize();
  const report = await chain.verify();

  await prisma.integrityRecord.create({
    data: {
      analysisId,
      analysisType,
      address,
      steps: stepsData.length,
      stepsData: stepsData as unknown as Record<string, unknown>[],
      merkleRoot,
      isValid: report.isValid,
      verifiedAt: new Date(),
    },
  });

  return merkleRoot;
}
