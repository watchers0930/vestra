import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Params = { params: Promise<{ token: string }> };

const ROLE_ORDER = ["LANDLORD", "TENANT", "BROKER"] as const;
type Role = (typeof ROLE_ORDER)[number];

function nextRole(current: Role, hasBroker: boolean): Role | null {
  const order = hasBroker ? ROLE_ORDER : (["LANDLORD", "TENANT"] as const);
  const idx = order.indexOf(current as never);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1] as Role;
}

function nextStatus(role: Role | null): string {
  if (role === null) return "COMPLETED";
  return `PENDING_${role}`;
}

function generateSignToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function tokenExpiry(hours = 72) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// POST /api/sign/[token]/complete — 서명 저장 + 계약 상태 진행
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const sig = await prisma.eContractSignature.findUnique({
      where: { signToken: token },
      include: {
        contract: { include: { signatures: true } },
      },
    });

    if (!sig) return NextResponse.json({ error: "유효하지 않은 서명 링크입니다." }, { status: 404 });
    if (sig.signedAt) return NextResponse.json({ error: "이미 서명이 완료된 링크입니다." }, { status: 400 });
    if (sig.signTokenExpires && new Date() > sig.signTokenExpires) {
      return NextResponse.json({ error: "서명 링크가 만료되었습니다." }, { status: 400 });
    }
    if (sig.contract.status === "CANCELED") {
      return NextResponse.json({ error: "취소된 계약입니다." }, { status: 400 });
    }

    // 서명 이미지 파일 수신 (multipart FormData)
    const formData = await req.formData();
    const signatureFile = formData.get("signature") as File | null;
    const signerName = formData.get("name") as string | null;
    const signerPhone = formData.get("phone") as string | null;

    if (!signatureFile) {
      return NextResponse.json({ error: "서명 이미지가 필요합니다." }, { status: 400 });
    }

    // 서명 이미지를 base64 data URL로 변환하여 DB에 저장
    const arrayBuffer = await signatureFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const signatureUrl = `data:image/png;base64,${base64}`;

    const contract = sig.contract;
    const hasBroker = !!contract.brokerEmail;
    const currentRole = sig.role as Role;
    const next = nextRole(currentRole, hasBroker);
    const newStatus = nextStatus(next);

    // 다음 서명자 토큰 준비
    let nextSignToken: string | null = null;

    await prisma.$transaction(async (tx) => {
      // 1. 현재 서명 레코드 업데이트
      await tx.eContractSignature.update({
        where: { id: sig.id },
        data: {
          signedAt: new Date(),
          method: "HANDWRITING",
          signatureUrl,
          signerName: signerName?.trim() || sig.signerName,
          signerPhone: signerPhone?.trim() || sig.signerPhone,
          ipAddress: getClientIp(req),
        },
      });

      // 2. 계약 상태 업데이트
      await tx.eContract.update({
        where: { id: contract.id },
        data: { status: newStatus },
      });

      // 3. 다음 서명자 레코드 생성 (있으면)
      if (next) {
        const nextEmail =
          next === "TENANT" ? contract.tenantEmail : (contract.brokerEmail ?? "");
        const newToken = generateSignToken();
        nextSignToken = newToken;

        const existing = contract.signatures.find((s) => s.role === next);
        if (existing) {
          await tx.eContractSignature.update({
            where: { id: existing.id },
            data: { signToken: newToken, signTokenExpires: tokenExpiry(72), signerEmail: nextEmail },
          });
        } else {
          await tx.eContractSignature.create({
            data: {
              contractId: contract.id,
              role: next,
              signerEmail: nextEmail,
              signToken: newToken,
              signTokenExpires: tokenExpiry(72),
            },
          });
        }
      }
    });

    // 4. 전체 서명 완료 → 최종 PDF 생성
    if (newStatus === "COMPLETED") {
      await generateFinalPdf(contract.id);
    }

    return NextResponse.json({
      success: true,
      nextRole: next,
      nextSignUrl: nextSignToken ? `/sign/${nextSignToken}` : null,
      completed: newStatus === "COMPLETED",
    });
  } catch (e) {
    console.error("[POST /api/sign/[token]/complete]", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// 최종 서명 완료 후 상태 업데이트 (PDF는 온디맨드 생성 — /api/e-contracts/[id]/pdf)
async function generateFinalPdf(contractId: string) {
  try {
    await prisma.eContract.update({
      where: { id: contractId },
      data: {
        finalPdfUrl: `/api/e-contracts/${contractId}/pdf`,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[generateFinalPdf]", e);
  }
}
