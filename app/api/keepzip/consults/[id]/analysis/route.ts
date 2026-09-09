import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decryptPII } from "@/lib/crypto";

/**
 * GET /api/keepzip/consults/[id]/analysis
 * 상담에 (신청자 동의로) 첨부된 AI 분석 원문을 담당 전문가가 열람한다.
 *
 * 삼자 검증(개인정보 보호):
 *  1) 로그인 유저가 전문가(LawyerPartner)인지
 *  2) 이 상담이 그 전문가에게 배정됐는지 (consult.lawyerId === partner.id)
 *  3) content 마커의 분석이 상담 신청자(consult.userId) 본인 소유인지
 * 세 조건을 모두 만족할 때만 분석을 반환한다(임의 id 주입·타 전문가 열람 차단).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    // 검증 1: 로그인 유저가 전문가인지
    const partner = await prisma.lawyerPartner.findUnique({ where: { userId }, select: { id: true } });
    if (!partner) return NextResponse.json({ error: "전문가만 열람할 수 있습니다." }, { status: 403 });

    // 검증 2: 이 상담이 해당 전문가에게 배정됐는지
    const consult = await prisma.expertConsult.findUnique({
      where: { id },
      select: { id: true, lawyerId: true, userId: true, content: true },
    });
    if (!consult || consult.lawyerId !== partner.id) {
      return NextResponse.json({ error: "배정된 상담만 열람할 수 있습니다." }, { status: 403 });
    }

    // content 마커에서 analysisId 추출 (서버만 생성하는 신뢰 마커)
    const m = consult.content.match(/\[\[VS_ANALYSIS:([^\]]+)\]\]/);
    if (!m) return NextResponse.json({ error: "첨부된 분석이 없습니다." }, { status: 404 });
    const analysisId = m[1];

    // 검증 3: 그 분석이 상담 신청자 본인 소유인지
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: consult.userId ?? "__none__" },
      select: { type: true, typeLabel: true, address: true, summary: true, data: true, fraudRisk: true, vScore: true, createdAt: true },
    });
    if (!analysis) return NextResponse.json({ error: "분석을 찾을 수 없습니다." }, { status: 404 });

    // 주소 복호화(암호화 저장), data 파싱(평문 JSON)
    let address = "";
    try { address = decryptPII(analysis.address); } catch { address = ""; }
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(analysis.data); } catch { data = {}; }

    // 유형별 핵심 정보 추출(존재 시)
    const riskSrc =
      (data.riskAnalysis as { risks?: unknown } | undefined)?.risks ??
      (data.risks as unknown) ?? [];
    const risks = Array.isArray(riskSrc)
      ? (riskSrc as Array<{ level?: string; title?: string; description?: string }>).slice(0, 20)
      : [];
    const propertyInfo = (data.propertyInfo as Record<string, unknown> | undefined) ?? {};

    return NextResponse.json({
      analysis: {
        typeLabel: analysis.typeLabel,
        createdAt: analysis.createdAt.toISOString(),
        address,
        summary: analysis.summary,
        vScore: analysis.vScore ?? null,
        fraudRisk: analysis.fraudRisk ?? null,
        propertyInfo,
        risks,
      },
    });
  } catch (e) {
    console.error("[GET /api/keepzip/consults/[id]/analysis]", e);
    return NextResponse.json({ error: "분석 열람 중 오류가 발생했습니다." }, { status: 500 });
  }
}
