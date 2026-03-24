import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addSubscription, removeSubscription } from "@/lib/push-subscriptions";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "유효하지 않은 구독 정보입니다." }, { status: 400 });
  }

  await addSubscription(session.user.id, sub);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
  }

  await removeSubscription(endpoint);

  return NextResponse.json({ ok: true });
}
