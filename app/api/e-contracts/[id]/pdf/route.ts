import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { auth } from "@/lib/auth";
import { ContractPdf, EContractPdfData } from "@/lib/pdf/contract-template";

type Params = { params: Promise<{ id: string }> };

// GET /api/e-contracts/[id]/pdf — 전자계약서 최종 PDF 다운로드
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const { id } = await params;

    const contract = await prisma.eContract.findUnique({
      where: { id },
      include: {
        landlord: { select: { name: true, email: true } },
        signatures: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
    }

    // [보안] 로그인한 계약 당사자만 허용. COMPLETED 상태여도 비당사자/비로그인 접근 금지.
    // (PDF에 실명·서명·보증금·주소 등 개인정보가 포함되므로 ID 열거로 유출되면 안 됨)
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const isParty =
      userId === contract.landlordId ||
      userId === contract.creatorId ||
      session?.user?.email === contract.tenantEmail ||
      session?.user?.email === contract.brokerEmail;

    if (!isParty) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const getSig = (role: string) => contract.signatures.find((s) => s.role === role);
    const landlordSig = getSig("LANDLORD");
    const tenantSig = getSig("TENANT");
    const brokerSig = getSig("BROKER");

    const pdfData: EContractPdfData = {
      id: contract.id,
      contractType: contract.contractType as "JEONSE" | "MONTHLY" | "SALE",
      address: contract.address,
      deposit: contract.deposit,
      monthlyRent: contract.monthlyRent,
      duration: contract.duration,
      startDate: contract.startDate,
      endDate: contract.endDate,
      specialTerms: contract.specialTerms,
      createdAt: contract.createdAt,
      landlord: {
        name: contract.landlord.name,
        email: contract.landlord.email ?? "",
        signatureUrl: landlordSig?.signatureUrl ?? null,
      },
      tenant: {
        name: tenantSig?.signerName ?? null,
        email: contract.tenantEmail,
        signatureUrl: tenantSig?.signatureUrl ?? null,
      },
      broker: brokerSig
        ? {
            name: brokerSig.signerName ?? null,
            email: contract.brokerEmail ?? "",
            signatureUrl: brokerSig.signatureUrl ?? null,
          }
        : null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(React.createElement(ContractPdf, { data: pdfData }) as any);

    const filename = `vestra-contract-${id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (e) {
    console.error("[GET /api/e-contracts/[id]/pdf]", e);
    return NextResponse.json({ error: "PDF 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
