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

    // 인증된 당사자 또는 서명 완료 계약만 허용
    const userId = session?.user?.id;
    const isParty =
      userId === contract.landlordId ||
      userId === contract.creatorId ||
      session?.user?.email === contract.tenantEmail ||
      session?.user?.email === contract.brokerEmail;

    if (!isParty && contract.status !== "COMPLETED") {
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
