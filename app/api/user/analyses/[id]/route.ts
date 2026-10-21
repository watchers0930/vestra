import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRecord, compareRecords, snapshotIdentity, samePropertyIdentity } from "@/lib/analysis/normalize-record";

const querySchema = z.object({ includePrevious: z.literal("1").optional() }).strict();
const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const select = { id: true, type: true, typeLabel: true, address: true, data: true, vScore: true, createdAt: true } as const;
const PREVIOUS_SCAN_LIMIT = 300;
const PREVIOUS_BATCH_SIZE = 100;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const s = await auth();
    if (!s?.user?.id) return json({ error: "인증이 필요합니다." }, 401);
    const { id } = await context.params;
    const params = new URL(req.url).searchParams;
    if (!idSchema.safeParse(id).success || !querySchema.safeParse(Object.fromEntries(params)).success || params.getAll("includePrevious").length > 1) {
      return json({ error: "조회 조건을 확인해주세요." }, 400);
    }
    const row = await prisma.analysis.findFirst({ where: { id, userId: s.user.id }, select });
    if (!row) return json({ error: "분석 기록을 찾을 수 없습니다." }, 404);
    const current = normalizeRecord(row);
    let previous = null;
    if (params.get("includePrevious") === "1") {
      // 암호화 주소를 DB에서 비교하지 않는다. 본인·타입·이전 시각 조건으로
      // 최근 300건까지만 복호화·정규화 매칭한다. 미발견 시 previous=null.
      const identity = snapshotIdentity(row);
      let cursor: { id: string } | undefined;
      for (let scanned = 0; scanned < PREVIOUS_SCAN_LIMIT;) {
        const take = Math.min(PREVIOUS_BATCH_SIZE, PREVIOUS_SCAN_LIMIT - scanned);
        const batch = await prisma.analysis.findMany({
          where: { userId: s.user.id, type: row.type, createdAt: { lt: row.createdAt } },
          select, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take,
          ...(cursor ? { cursor, skip: 1 } : {}),
        });
        const match = batch.find(candidate => samePropertyIdentity(identity, snapshotIdentity(candidate)));
        if (match) { previous = normalizeRecord(match); break; }
        scanned += batch.length;
        if (batch.length < take) break;
        cursor = { id: batch[batch.length - 1].id };
      }
    }
    return json({ current, previous, diff: compareRecords(current, previous) });
  } catch {
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
}
