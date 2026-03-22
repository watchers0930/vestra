import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

/** GET: vocab.txt 내보내기 (KR-BERT 토크나이저용) */
export const GET = withAdminAuth(async () => {
  const vocabs = await prisma.domainVocabulary.findMany({
    orderBy: [{ category: "asc" }, { frequency: "desc" }],
  });

  if (vocabs.length === 0) {
    return NextResponse.json(
      { error: "등록된 도메인 용어가 없습니다." },
      { status: 404 },
    );
  }

  const content = vocabs.map((v) => v.term).join("\n") + "\n";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=vestra-vocab-${date}.txt`,
    },
  });
});
