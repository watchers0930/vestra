import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchScholarPapers } from "@/lib/scholar";

/**
 * POST /api/scholar/search
 * 키워드 기반 학술논문 검색.
 * Body: { keywords: string[] }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { keywords } = await req.json();
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ papers: [], sources: [] });
    }

    // 키워드를 조합하여 검색어 생성
    const query = keywords.slice(0, 5).join(" ");
    const result = await searchScholarPapers(query);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Scholar search error:", e);
    return NextResponse.json({ papers: [], sources: [] });
  }
}
