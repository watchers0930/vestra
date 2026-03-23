import { NextResponse } from "next/server";
import { collectNews } from "@/lib/news-collector";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await collectNews();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: "Collection failed", detail: String(error) },
      { status: 500 }
    );
  }
}
