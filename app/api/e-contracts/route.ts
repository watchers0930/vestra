import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import crypto from "crypto";

function generateSignToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function tokenExpiry(hours = 72) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// POST /api/e-contracts — 계약 생성 (임대인 or 공인중개사)
export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const {
      contractType,
      address,
      deposit,
      monthlyRent,
      duration,
      startDate,
      endDate,
      specialTerms,
      tenantEmail,
      brokerEmail,
    } = body;

    // 필수값 검증
    if (!contractType || !address || !deposit || !tenantEmail) {
      return NextResponse.json(
        { error: "contractType, address, deposit, tenantEmail은 필수입니다." },
        { status: 400 }
      );
    }
    if (!["JEONSE", "MONTHLY", "SALE"].includes(contractType)) {
      return NextResponse.json({ error: "유효하지 않은 계약 유형입니다." }, { status: 400 });
    }

    // 계약 생성 + 임대인 서명 레코드(토큰) 동시 생성
    const contract = await prisma.eContract.create({
      data: {
        contractType,
        status: "PENDING_LANDLORD",
        address: String(address).trim(),
        deposit: BigInt(deposit),
        monthlyRent: monthlyRent ? BigInt(monthlyRent) : null,
        duration: duration ? Number(duration) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        specialTerms: specialTerms ? String(specialTerms).trim() : null,
        landlordId: session.user.id,
        tenantEmail: String(tenantEmail).trim().toLowerCase(),
        brokerEmail: brokerEmail ? String(brokerEmail).trim().toLowerCase() : null,
        creatorId: session.user.id,
        signatures: {
          create: {
            role: "LANDLORD",
            signerEmail: session.user.email ?? undefined,
            signerName: session.user.name ?? undefined,
            signToken: generateSignToken(),
            signTokenExpires: tokenExpiry(72),
          },
        },
      },
      include: { signatures: true },
    });

    const landlordSig = contract.signatures.find((s) => s.role === "LANDLORD");

    return NextResponse.json({
      id: contract.id,
      status: contract.status,
      signToken: landlordSig?.signToken,
      signUrl: `/sign/${landlordSig?.signToken}`,
    });
  } catch (e) {
    console.error("[POST /api/e-contracts]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// GET /api/e-contracts — 내 계약 목록
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const userEmail = session.user.email?.toLowerCase() ?? "";

    // 임대인 or 임차인 or 중개사로 참여한 계약 모두 조회
    const [contracts, total] = await Promise.all([
      prisma.eContract.findMany({
        where: {
          OR: [
            { landlordId: session.user.id },
            { tenantEmail: userEmail },
            { brokerEmail: userEmail },
          ],
        },
        include: {
          signatures: { select: { role: true, signedAt: true, method: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eContract.count({
        where: {
          OR: [
            { landlordId: session.user.id },
            { tenantEmail: userEmail },
            { brokerEmail: userEmail },
          ],
        },
      }),
    ]);

    return NextResponse.json({ contracts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error("[GET /api/e-contracts]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
