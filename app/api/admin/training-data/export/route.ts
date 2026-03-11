import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPII } from "@/lib/crypto";
import { generateAllLabels, toJSONL } from "@/lib/training-data-export";
import type { ParsedRegistry } from "@/lib/registry-parser";

/** GET: 승인된 데이터를 JSONL로 내보내기 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const approved = await prisma.trainingData.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "asc" },
  });

  if (approved.length === 0) {
    return NextResponse.json(
      { error: "승인된 학습 데이터가 없습니다." },
      { status: 404 },
    );
  }

  const allLabels: unknown[] = [];

  for (const item of approved) {
    const rawText = decryptPII(item.rawTextEncrypted);
    const parsed = item.parsedData as unknown as ParsedRegistry;
    if (!parsed || !rawText) continue;

    const labels = generateAllLabels(parsed, rawText);

    // 분류 라벨
    for (const cl of labels.classification) {
      allLabels.push({ type: "classification", ...cl });
    }
    // NER 라벨
    for (const ner of labels.ner) {
      allLabels.push({ type: "ner", ...ner });
    }
    // 구조 추출 라벨
    for (const st of labels.structure) {
      allLabels.push({ type: "structure", ...st });
    }
  }

  const jsonl = toJSONL(allLabels);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(jsonl, {
    headers: {
      "Content-Type": "application/jsonl",
      "Content-Disposition": `attachment; filename=vestra-training-${date}.jsonl`,
    },
  });
}
