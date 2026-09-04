import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { autoRegisterMonitoring } from "@/lib/e-contract/auto-monitoring";
import { isValidImageDataUrl } from "@/lib/keepzip/image-validation";
import { getClientIp } from "@/lib/client-ip";

const TENANT_SIGN_TTL_MS = 72 * 60 * 60 * 1000; // 서명 링크 유효 72시간

const RRN_PREFIX_RE = /^\d{6}-[1-4]$/;
const MAX_AMOUNT = BigInt("1000000000000"); // 1조 원 상한
const ZERO = BigInt(0);

function parseAmount(v: unknown): bigint | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && !/^\d+$/.test(v.trim())) return null;
  try {
    const n = BigInt(typeof v === "string" ? v.trim() : Math.trunc(v));
    return n >= ZERO && n <= MAX_AMOUNT ? n : null;
  } catch {
    return null;
  }
}

interface PartyInput { name?: string; phone?: string; rrn?: string; sign?: string; }

// POST /api/e-contracts — 가계약서 생성 (임대인+임차인 양측 서명 즉시 완료 → 출력용)
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
      contractType, address, deposit, monthlyRent,
      startDate, endDate, balance, balanceDate, specialTerms,
      landlord, tenant, applicationId, tenantSelfSign,
    } = body as {
      contractType?: string; address?: string; deposit?: unknown; monthlyRent?: unknown;
      startDate?: string; endDate?: string; balance?: unknown; balanceDate?: string; specialTerms?: string;
      landlord?: PartyInput; tenant?: PartyInput; applicationId?: string; tenantSelfSign?: boolean;
    };
    // 임차인 독립 서명 모드(갭5): 임대인이 임차인 서명 없이 생성 → 임차인이 링크로 직접 서명
    const selfSign = tenantSelfSign === true;

    // 1. 기본 검증
    if (!contractType || !["JEONSE", "MONTHLY", "SALE"].includes(contractType)) {
      return NextResponse.json({ error: "유효하지 않은 계약 유형입니다." }, { status: 400 });
    }
    if (!address || String(address).trim().length < 5) {
      return NextResponse.json({ error: "유효한 주소를 입력해주세요." }, { status: 400 });
    }

    // 2. 당사자(임대인/임차인) 검증 — 이름 필수, 서명은 임차인 독립서명 모드면 임차인만 생략 허용
    for (const [label, party, needSign] of [["임대인", landlord, true], ["임차인", tenant, !selfSign]] as const) {
      if (!party?.name || !String(party.name).trim()) {
        return NextResponse.json({ error: `${label} 이름을 입력해주세요.` }, { status: 400 });
      }
      if (needSign && !isValidImageDataUrl(party?.sign)) {
        return NextResponse.json({ error: `${label} 서명 이미지가 올바르지 않습니다. (PNG/JPEG, 2MB 이하)` }, { status: 400 });
      }
      if (party?.rrn && !RRN_PREFIX_RE.test(party.rrn)) {
        return NextResponse.json({ error: `${label} 생년월일+성별 형식이 올바르지 않습니다. (예: 890101-1)` }, { status: 400 });
      }
    }

    // 3. 금액 검증
    const depositVal = parseAmount(deposit);
    if (depositVal === null) {
      return NextResponse.json({ error: "금액(보증금/매매가)이 올바르지 않습니다." }, { status: 400 });
    }
    const monthlyRentVal = (monthlyRent !== undefined && monthlyRent !== null && monthlyRent !== "") ? parseAmount(monthlyRent) : null;
    const balanceVal = (balance !== undefined && balance !== null && balance !== "") ? parseAmount(balance) : null;

    // 4. 의향서 기반이면 매물·의향서·임차인 FK 연결
    let linkedListingId: string | undefined;
    let linkedApplicationId: string | undefined;
    let linkedTenantId: string | undefined;
    let linkedMoveInDate: Date | null = null;
    if (applicationId && typeof applicationId === "string") {
      const app = await prisma.contractApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, applicantId: true, listingId: true, moveInDate: true, listing: { select: { ownerId: true } } },
      });
      if (!app) return NextResponse.json({ error: "연결할 의향서를 찾을 수 없습니다." }, { status: 404 });
      if (app.listing.ownerId !== session.user.id) {
        return NextResponse.json({ error: "본인 매물의 의향서만 계약으로 연결할 수 있습니다." }, { status: 403 });
      }
      linkedListingId = app.listingId;
      linkedApplicationId = app.id;
      linkedTenantId = app.applicantId;
      linkedMoveInDate = app.moveInDate ?? null;
    }

    // 5. 표준계약서 요약 특약: 잔금 일정을 특약 상단에 합침
    const termsParts: string[] = [];
    if (balanceVal !== null) {
      termsParts.push(`잔금: ${Number(balanceVal).toLocaleString("ko-KR")}원${balanceDate ? ` (${balanceDate} 지급)` : ""}`);
    }
    if (specialTerms && String(specialTerms).trim()) termsParts.push(String(specialTerms).trim());
    const terms = termsParts.length ? termsParts.join("\n") : null;

    const ip = getClientIp(req, "") || null;
    const now = new Date();

    // 임차인 독립 서명 모드면 임차인 서명란은 토큰만 발급(미서명), 계약은 PENDING_TENANT
    const signToken = selfSign ? randomBytes(24).toString("hex") : null;
    const tenantSignature = selfSign
      ? { role: "TENANT", signerName: String(tenant!.name).trim(), signerPhone: tenant!.phone || null, signerRrnPrefix: tenant!.rrn || null, signatureUrl: null, method: "HANDWRITING", signToken, signTokenExpires: new Date(now.getTime() + TENANT_SIGN_TTL_MS) }
      : { role: "TENANT", signerName: String(tenant!.name).trim(), signerPhone: tenant!.phone || null, signerRrnPrefix: tenant!.rrn || null, signatureUrl: tenant!.sign, method: "HANDWRITING", signedAt: now, ipAddress: ip };

    // 6. 가계약서 생성 — 즉시완료(COMPLETED) 또는 임차인 서명 대기(PENDING_TENANT)
    const contract = await prisma.eContract.create({
      data: {
        contractType,
        status: selfSign ? "PENDING_TENANT" : "COMPLETED",
        address: String(address).trim(),
        deposit: depositVal,
        monthlyRent: monthlyRentVal,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        specialTerms: terms,
        landlordId: session.user.id,
        tenantEmail: "", // 가계약은 이메일 서명 링크를 쓰지 않음
        creatorId: session.user.id,
        completedAt: selfSign ? null : now,
        ...(linkedListingId ? { listingId: linkedListingId } : {}),
        ...(linkedApplicationId ? { applicationId: linkedApplicationId } : {}),
        ...(linkedTenantId ? { tenantId: linkedTenantId } : {}),
        signatures: {
          create: [
            { role: "LANDLORD", signerName: String(landlord!.name).trim(), signerPhone: landlord!.phone || null, signerRrnPrefix: landlord!.rrn || null, signatureUrl: landlord!.sign, method: "HANDWRITING", signedAt: now, ipAddress: ip },
            tenantSignature,
          ],
        },
      },
      select: { id: true },
    });

    // 7. 의향서 기반이면 매물을 거래완료로 동기화 + 의향서 상태를 ACCEPTED로 정합화(갭4)
    //    임차인 독립서명 대기(PENDING_TENANT) 중이면 서명 완료 후(서명 API)에 처리
    if (linkedApplicationId) {
      // 계약 절차가 시작됐으므로 근거 의향서는 수락 상태로 정합화
      await prisma.contractApplication.update({ where: { id: linkedApplicationId }, data: { status: "ACCEPTED" } }).catch(() => {});
    }
    if (!selfSign) {
      if (linkedListingId) {
        await prisma.listing.update({ where: { id: linkedListingId }, data: { status: "COMPLETED" } }).catch(() => {});
      }
      // 8. 등기감시 자동 등록(갭2) — 전입 예정일: 의향서 입주희망일 우선, 없으면 계약 시작일
      if (linkedTenantId) {
        await autoRegisterMonitoring({
          tenantId: linkedTenantId,
          address: String(address).trim(),
          contractType,
          depositVal,
          moveIn: linkedMoveInDate ?? (startDate ? new Date(startDate) : null),
          landlordName: String(landlord!.name).trim(),
          listingId: linkedListingId ?? null,
        });
      }
    }

    return NextResponse.json({
      id: contract.id,
      pdfUrl: `/api/e-contracts/${contract.id}/pdf`,
      status: selfSign ? "PENDING_TENANT" : "COMPLETED",
      ...(selfSign && signToken ? { tenantSignPath: `/contract-sign?token=${signToken}` } : {}),
    });
  } catch (e) {
    console.error("[POST /api/e-contracts]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// GET /api/e-contracts — 내 가계약 목록 (임대인/작성자 + 연결된 임차인)
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

    const where = {
      OR: [
        { landlordId: session.user.id },
        { tenantId: session.user.id },
        { tenantEmail: userEmail },
        { brokerEmail: userEmail },
      ],
    };

    const [contracts, total] = await Promise.all([
      prisma.eContract.findMany({
        where,
        include: { signatures: { select: { role: true, signedAt: true, method: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eContract.count({ where }),
    ]);

    // BigInt(deposit·monthlyRent)는 JSON 직렬화 불가 → 문자열로 변환
    const serialized = contracts.map((c) => ({
      ...c,
      deposit: c.deposit.toString(),
      monthlyRent: c.monthlyRent?.toString() ?? null,
    }));

    return NextResponse.json({ contracts: serialized, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error("[GET /api/e-contracts]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
