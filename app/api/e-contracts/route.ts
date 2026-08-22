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
      applicationId,
    } = body;

    // 의향서 기반 계약: 매물·의향서·임차인을 FK로 연결(데이터 무결성). 직접 작성 시엔 생략.
    let linkedListingId: string | undefined;
    let linkedApplicationId: string | undefined;
    let linkedTenantId: string | undefined;
    if (applicationId && typeof applicationId === "string") {
      const app = await prisma.contractApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, applicantId: true, listingId: true, listing: { select: { ownerId: true } } },
      });
      if (!app) {
        return NextResponse.json({ error: "연결할 의향서를 찾을 수 없습니다." }, { status: 404 });
      }
      if (app.listing.ownerId !== session.user.id) {
        return NextResponse.json({ error: "본인 매물의 의향서만 계약으로 연결할 수 있습니다." }, { status: 403 });
      }
      linkedListingId = app.listingId;
      linkedApplicationId = app.id;
      linkedTenantId = app.applicantId;
    }

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

    // [보안] 이메일 형식 검증 (잘못된 서명 초대 주소 방지)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof tenantEmail !== "string" || !emailRegex.test(tenantEmail.trim())) {
      return NextResponse.json({ error: "유효한 임차인 이메일을 입력해주세요." }, { status: 400 });
    }
    if (brokerEmail && (typeof brokerEmail !== "string" || !emailRegex.test(brokerEmail.trim()))) {
      return NextResponse.json({ error: "유효한 중개사 이메일을 입력해주세요." }, { status: 400 });
    }

    // [보안] 금액·기간 숫자 검증 (비정상 입력으로 인한 BigInt 예외/음수 저장 방지)
    const MAX_AMOUNT = BigInt("1000000000000"); // 1조 원 상한
    const ZERO = BigInt(0);
    const parseAmount = (v: unknown): bigint | null => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v !== "number" && typeof v !== "string") return null;
      if (typeof v === "string" && !/^\d+$/.test(v.trim())) return null;
      try {
        const n = BigInt(typeof v === "string" ? v.trim() : Math.trunc(v));
        return n >= ZERO && n <= MAX_AMOUNT ? n : null;
      } catch {
        return null;
      }
    };
    const depositVal = parseAmount(deposit);
    if (depositVal === null) {
      return NextResponse.json({ error: "보증금 금액이 올바르지 않습니다." }, { status: 400 });
    }
    let monthlyRentVal: bigint | null = null;
    if (monthlyRent !== undefined && monthlyRent !== null && monthlyRent !== "") {
      monthlyRentVal = parseAmount(monthlyRent);
      if (monthlyRentVal === null) {
        return NextResponse.json({ error: "월세 금액이 올바르지 않습니다." }, { status: 400 });
      }
    }
    let durationVal: number | null = null;
    if (duration !== undefined && duration !== null && duration !== "") {
      const d = Number(duration);
      if (!Number.isInteger(d) || d < 0 || d > 600) {
        return NextResponse.json({ error: "계약 기간(개월)이 올바르지 않습니다." }, { status: 400 });
      }
      durationVal = d;
    }

    // 계약 생성 + 임대인 서명 레코드(토큰) 동시 생성
    const contract = await prisma.eContract.create({
      data: {
        contractType,
        status: "PENDING_LANDLORD",
        address: String(address).trim(),
        deposit: depositVal,
        monthlyRent: monthlyRentVal,
        duration: durationVal,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        specialTerms: specialTerms ? String(specialTerms).trim() : null,
        landlordId: session.user.id,
        tenantEmail: String(tenantEmail).trim().toLowerCase(),
        brokerEmail: brokerEmail ? String(brokerEmail).trim().toLowerCase() : null,
        creatorId: session.user.id,
        ...(linkedListingId ? { listingId: linkedListingId } : {}),
        ...(linkedApplicationId ? { applicationId: linkedApplicationId } : {}),
        ...(linkedTenantId ? { tenantId: linkedTenantId } : {}),
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
