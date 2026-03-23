import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { CONTRACT_ANALYSIS_OPINION_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { stripHtml, truncateInput } from "@/lib/sanitize";
import { searchCourtCases } from "@/lib/court-api";
import { analyzeContract } from "@/lib/contract-analyzer";
import { buildPolicyContext, logNewsUsage } from "@/lib/news-query";
import { auth, ROLE_LIMITS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 인증 + 역할 기반 제한
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`analyze-contract:${userId || ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    // Cost Guard (일일 OpenAI 호출 제한)
    const costGuard = await checkOpenAICostGuard(userId || ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const { contractText: rawText } = await req.json();
    const contractText = truncateInput(stripHtml(rawText || ""), 50000);

    if (!contractText) {
      return NextResponse.json({ error: "계약서 내용을 입력해주세요." }, { status: 400 });
    }

    // 1단계: 자체 엔진으로 계약서 분석
    const engineResult = analyzeContract(contractText);

    // 2단계: 판례 검색 (LLM 의견 보강용)
    let courtContext = "";
    try {
      const keywords = extractContractKeywords(contractText);
      if (keywords.length > 0) {
        const cases = await searchCourtCases(keywords[0], 3);
        if (cases.length > 0) {
          courtContext = `\n\n관련 판례:\n${cases
            .map(
              (c) =>
                `- [${c.caseNumber}] ${c.caseName} (${c.courtName}, ${c.judgmentDate})\n  판시사항: ${c.summary}`
            )
            .join("\n")}`;
        }
      }
    } catch (e) {
      console.warn("판례 검색 실패:", e);
    }

    // 2.5단계: 최근 관련 정책 조회
    let policyContext = "";
    let policyArticleIds: string[] = [];
    try {
      const policy = await buildPolicyContext(["전세", "규제", "대출"]);
      policyContext = policy.context;
      policyArticleIds = policy.articleIds;
    } catch {
      // 정책 조회 실패 시 무시
    }

    // 3단계: LLM으로 종합 의견만 생성
    let aiOpinion = "";
    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: CONTRACT_ANALYSIS_OPINION_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              clauses: engineResult.clauses,
              missingClauses: engineResult.missingClauses,
              safetyScore: engineResult.safetyScore,
              highRiskCount: engineResult.clauses.filter((c) => c.riskLevel === "high").length,
              warningCount: engineResult.clauses.filter((c) => c.riskLevel === "warning").length,
              courtContext: courtContext || "관련 판례 없음",
              policyContext: policyContext || "관련 정책 없음",
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        aiOpinion = parsed.aiOpinion || parsed.opinion || "";
      }
    } catch {
      aiOpinion = "AI 의견 생성에 실패했습니다. 자체 분석 결과를 참고해주세요.";
    }

    // 정책 활용 로그
    if (policyArticleIds.length > 0) {
      logNewsUsage(policyArticleIds, "contract").catch(() => {});
    }

    return NextResponse.json({
      clauses: engineResult.clauses,
      missingClauses: engineResult.missingClauses,
      safetyScore: engineResult.safetyScore,
      aiOpinion,
    });
  } catch (error: unknown) {
    return handleApiError(error, "계약서 분석");
  }
}

/** 계약서 텍스트에서 핵심 키워드 추출 */
function extractContractKeywords(text: string): string[] {
  const keywordPatterns = [
    "전세보증금", "보증금 반환", "임대차", "근저당", "계약해지",
    "위약금", "손해배상", "특약사항", "원상회복", "권리금",
    "전세권", "임차권", "대항력", "우선변제",
  ];

  const found = keywordPatterns.filter((kw) => text.includes(kw));
  if (found.length === 0) return ["부동산 계약 분쟁"];
  return [found.slice(0, 2).join(" ")];
}
