import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateOrigin } from "@/lib/csrf";
import { autoRegisterMonitoring } from "@/lib/e-contract/auto-monitoring";

const RRN_PREFIX_RE = /^\d{6}-[1-4]$/;
type Params = { params: Promise<{ token: string }> };

/**
 * 임차인 독립 서명(갭5) — 공개 서명 링크 API. 토큰이 인증 역할(비로그인 접근).
 * GET   /api/e-contracts/sign/[token] — 서명할 계약 요약 조회
 * PATCH /api/e-contracts/sign/[token] — 임차인 손글씨 서명 제출(1회용·만료검증) → 계약 완료
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const sig = await prisma.eContractSignature.findUnique({
    where: { signToken: token },
    include: {
      contract: {
        select: {
          id: true, contractType: true, address: true, deposit: true, monthlyRent: true,
          startDate: true, endDate: true, specialTerms: true, status: true,
          signatures: { where: { role: "LANDLORD" }, select: { signerName: true } },
        },
      },
    },
  });
  if (!sig || !sig.contract) return NextResponse.json({ error: "유효하지 않은 서명 링크입니다." }, { status: 404 });
  if (sig.signatureUrl) return NextResponse.json({ error: "이미 서명이 완료된 계약입니다." }, { status: 410 });
  if (sig.signTokenExpires && sig.signTokenExpires.getTime() < Date.now()) {
    return NextResponse.json({ error: "서명 링크가 만료되었습니다. 임대인에게 재발급을 요청하세요." }, { status: 410 });
  }
  const c = sig.contract;
  return NextResponse.json({
    contract: {
      id: c.id,
      contractType: c.contractType,
      address: c.address,
      deposit: c.deposit.toString(),
      monthlyRent: c.monthlyRent != null ? c.monthlyRent.toString() : null,
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
      specialTerms: c.specialTerms,
      landlordName: c.signatures[0]?.signerName ?? "",
      tenantName: sig.signerName ?? "",
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const { token } = await params;
  const body = await req.json().catch(() => null);
  const sign = typeof body?.sign === "string" && body.sign.startsWith("data:image") ? body.sign : null;
  const rrn = typeof body?.rrn === "string" ? body.rrn.trim() : "";
  if (!sign) return NextResponse.json({ error: "서명을 입력해주세요." }, { status: 400 });
  if (rrn && !RRN_PREFIX_RE.test(rrn)) {
    return NextResponse.json({ error: "생년월일+성별 형식이 올바르지 않습니다. (예: 890101-1)" }, { status: 400 });
  }

  const sig = await prisma.eContractSignature.findUnique({
    where: { signToken: token },
    include: {
      contract: {
        select: {
          id: true, status: true, listingId: true, tenantId: true, contractType: true,
          address: true, deposit: true, startDate: true, applicationId: true,
          signatures: { where: { role: "LANDLORD" }, select: { signerName: true } },
        },
      },
    },
  });
  if (!sig || !sig.contract) return NextResponse.json({ error: "유효하지 않은 서명 링크입니다." }, { status: 404 });
  if (sig.signatureUrl) return NextResponse.json({ error: "이미 서명이 완료된 계약입니다." }, { status: 410 });
  if (sig.signTokenExpires && sig.signTokenExpires.getTime() < Date.now()) {
    return NextResponse.json({ error: "서명 링크가 만료되었습니다." }, { status: 410 });
  }

  const c = sig.contract;
  const now = new Date();
  const ip = req.headers.get("x-forwarded-for") || null;

  // 서명 저장 + 토큰 1회 무효화 + 계약 완료 + 매물 동기화 (원자적)
  await prisma.$transaction(async (tx) => {
    await tx.eContractSignature.update({
      where: { id: sig.id },
      data: {
        signatureUrl: sign,
        signerRrnPrefix: rrn || sig.signerRrnPrefix,
        signedAt: now,
        signToken: null,
        signTokenExpires: null,
        ipAddress: ip,
      },
    });
    await tx.eContract.update({ where: { id: c.id }, data: { status: "COMPLETED", completedAt: now } });
    if (c.listingId) {
      await tx.listing.update({ where: { id: c.listingId }, data: { status: "COMPLETED" } });
    }
  });

  // 등기감시 자동 등록(갭2) — 완료 시점. 전입 예정일: 의향서 입주희망일 우선
  if (c.tenantId) {
    let moveIn: Date | null = c.startDate ?? null;
    if (c.applicationId) {
      const app = await prisma.contractApplication.findUnique({ where: { id: c.applicationId }, select: { moveInDate: true } });
      moveIn = app?.moveInDate ?? moveIn;
    }
    await autoRegisterMonitoring({
      tenantId: c.tenantId,
      address: c.address,
      contractType: c.contractType,
      depositVal: c.deposit,
      moveIn,
      landlordName: c.signatures[0]?.signerName ?? "",
      listingId: c.listingId,
    });
  }

  return NextResponse.json({ ok: true, status: "COMPLETED", pdfUrl: `/api/e-contracts/${c.id}/pdf` });
}
