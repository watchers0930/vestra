import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/keepzip/my-contracts — 로그인 임차인 본인의 완료된 전세/월세 계약 목록 (갭1)
 * 보증금 반환청구 내용증명 작성 시 임대인·주소·보증금·계약일 프리필 소스.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const email = session?.user?.email?.toLowerCase() ?? "";
    // email 빈 문자열이면 tenantEmail:"" 가계약에 광범위 매치되므로 제외(IDOR 방지)
    const orConds: Array<{ tenantId: string } | { tenantEmail: string }> = [{ tenantId: userId }];
    if (email) orConds.push({ tenantEmail: email });

    const contracts = await prisma.eContract.findMany({
      where: {
        status: "COMPLETED",
        contractType: { in: ["JEONSE", "MONTHLY"] },
        OR: orConds,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, address: true, deposit: true, contractType: true,
        startDate: true, endDate: true,
        landlord: { select: { name: true } },
        signatures: { where: { role: "LANDLORD" }, select: { signerName: true } },
      },
    });

    const list = contracts.map((c) => ({
      id: c.id,
      address: c.address,
      deposit: c.deposit != null ? c.deposit.toString() : null,
      contractType: c.contractType,
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
      // 문서상 임대인명(서명자) 우선, 없으면 계정명
      landlordName: c.signatures[0]?.signerName || c.landlord?.name || "",
    }));

    return NextResponse.json({ contracts: list });
  } catch (e) {
    console.error("[GET /api/keepzip/my-contracts]", e);
    return NextResponse.json({ error: "계약 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
