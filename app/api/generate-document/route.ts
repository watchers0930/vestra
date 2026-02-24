import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { JEONSE_ANALYSIS_PROMPT, DOCUMENT_GENERATION_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, landlordName, tenantName, propertyAddress, deposit, monthlyRent, startDate, endDate, propertyType } = body;

    const openai = getOpenAIClient();

    if (type === "analyze") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: JEONSE_ANALYSIS_PROMPT },
          {
            role: "user",
            content: `다음 전세 계약을 분석해주세요:
- 임대인: ${landlordName || "미입력"}
- 임차인: ${tenantName || "미입력"}
- 부동산: ${propertyAddress}
- 유형: ${propertyType}
- 보증금: ${deposit?.toLocaleString()}원
- 월세: ${monthlyRent?.toLocaleString()}원
- 계약기간: ${startDate} ~ ${endDate}

전세권 설정 필요 여부를 판단하고 JSON 형식으로 응답하세요.`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
      }

      return NextResponse.json(JSON.parse(content));
    }

    if (type === "jeonse") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: DOCUMENT_GENERATION_PROMPT },
          {
            role: "user",
            content: `전세권설정등기 신청서를 작성해주세요. 대법원 양식에 맞춰 정확하게 작성하세요.

정보:
- 임대인(등기의무자): ${landlordName || "홍길동"}
- 임차인(등기권리자): ${tenantName || "김철수"}
- 부동산 주소: ${propertyAddress || "서울특별시 강남구 역삼동 123-45 래미안 101동 1502호"}
- 전세금: ${deposit?.toLocaleString() || "300,000,000"}원
- 계약기간: ${startDate || "2025-03-01"} ~ ${endDate || "2027-02-28"}

JSON 형식으로 응답하세요: { "title": "전세권설정등기 신청서", "content": "문서 전체 내용" }`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
      }

      return NextResponse.json(JSON.parse(content));
    }

    if (type === "lease") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: DOCUMENT_GENERATION_PROMPT },
          {
            role: "user",
            content: `임차권등기명령 신청서를 작성해주세요. 대법원 양식에 맞춰 정확하게 작성하세요.

정보:
- 임대인(피신청인): ${landlordName || "홍길동"}
- 임차인(신청인): ${tenantName || "김철수"}
- 부동산 주소: ${propertyAddress || "서울특별시 강남구 역삼동 123-45 래미안 101동 1502호"}
- 보증금: ${deposit?.toLocaleString() || "300,000,000"}원
- 계약기간: ${startDate || "2025-03-01"} ~ ${endDate || "2027-02-28"}

JSON 형식으로 응답하세요: { "title": "임차권등기명령 신청서", "content": "문서 전체 내용" }`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
      }

      return NextResponse.json(JSON.parse(content));
    }

    return NextResponse.json({ error: "잘못된 요청 타입입니다." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("Document generation error:", message);

    if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
