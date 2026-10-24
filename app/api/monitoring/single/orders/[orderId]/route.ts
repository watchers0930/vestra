import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSingleOrder } from "@/lib/member-single-monitoring/order";
import { singleErrorResponse } from "@/lib/member-single-monitoring/http";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { orderId } = await params;
  try {
    return NextResponse.json(await getSingleOrder(session.user.id, orderId));
  } catch (e) { return singleErrorResponse(e); }
}
