import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

// GET /api/sign/[token] — 서명 페이지에서 계약 정보 조회 (인증 불필요)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const sig = await prisma.eContractSignature.findUnique({
      where: { signToken: token },
      include: {
        contract: {
          include: {
            signatures: { select: { role: true, signedAt: true } },
          },
        },
      },
    });

    if (!sig) {
      return NextResponse.json({ error: "유효하지 않은 서명 링크입니다." }, { status: 404 });
    }

    if (sig.signedAt) {
      return NextResponse.json({ error: "이미 서명이 완료된 링크입니다.", alreadySigned: true }, { status: 400 });
    }

    if (sig.signTokenExpires && new Date() > sig.signTokenExpires) {
      return NextResponse.json({ error: "서명 링크가 만료되었습니다." }, { status: 400 });
    }

    if (sig.contract.status === "CANCELED") {
      return NextResponse.json({ error: "취소된 계약입니다." }, { status: 400 });
    }

    const { contract } = sig;
    return NextResponse.json({
      signatureId: sig.id,
      role: sig.role,
      contract: {
        id: contract.id,
        contractType: contract.contractType,
        status: contract.status,
        address: contract.address,
        deposit: contract.deposit.toString(),
        monthlyRent: contract.monthlyRent?.toString() ?? null,
        duration: contract.duration,
        startDate: contract.startDate,
        endDate: contract.endDate,
        specialTerms: contract.specialTerms,
        signatures: contract.signatures,
      },
    });
  } catch (e) {
    console.error("[GET /api/sign/[token]]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
