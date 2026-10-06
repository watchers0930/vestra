/**
 * 공개 임베드 권리분석 API (무인증)
 * 등기부등본 "텍스트 PDF" 업로드 → 위험도 분석 (파싱·위험도 모두 순수 로직, OpenAI 미사용)
 * - 스캔본/이미지는 OpenAI OCR 비용이 발생하므로 미지원(안내). 텍스트 PDF만 처리.
 * - 응답은 위험도 집계만 반환(소유자명 등 개인정보·원문 미포함).
 */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";

export const runtime = "nodejs";
export const maxDuration = 30;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const rl = await rateLimit(`embed-rights:${ip}`, 10, 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { ...CORS, ...rateLimitHeaders(rl) } }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "등기부등본 PDF 파일을 첨부해주세요." }, { status: 400, headers: CORS });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "파일은 10MB 이하만 가능합니다." }, { status: 400, headers: CORS });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // 매직바이트: PDF만 허용
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "PDF 파일만 업로드할 수 있습니다." }, { status: 400, headers: CORS });
    }

    const ext = await extractTextFromPDF(buf, file.name);
    if (!ext.text || ext.charCount < 200) {
      return NextResponse.json(
        {
          error:
            "텍스트를 추출하지 못했습니다. 인터넷등기소에서 발급한 '텍스트 기반 PDF'를 올려주세요. (스캔본·이미지는 현재 미지원)",
        },
        { status: 422, headers: CORS }
      );
    }

    const parsed = parseRegistry(ext.text);
    const risk = calculateRiskScore(parsed);

    return NextResponse.json(
      {
        grade: risk.grade,
        gradeLabel: risk.gradeLabel,
        totalScore: risk.totalScore,
        mortgageRatio: risk.mortgageRatio,
        summary: risk.summary,
        factors: (risk.factors || []).slice(0, 8).map((f) => ({
          category: f.category,
          description: f.description,
          severity: f.severity,
        })),
        isRegistry: ext.isRegistry,
        lastUpdated: new Date().toISOString(),
      },
      { headers: { ...CORS, ...rateLimitHeaders(rl) } }
    );
  } catch {
    return NextResponse.json({ error: "권리분석 중 오류가 발생했습니다." }, { status: 500, headers: CORS });
  }
}
