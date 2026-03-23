import { NextResponse } from "next/server";

/**
 * API 라우트 공통 에러 핸들러
 * - 에러 메시지 추출, 로깅, 적절한 HTTP 응답 반환
 */
export function handleApiError(error: unknown, context: string) {
  const message =
    error instanceof Error ? error.message : "알 수 없는 오류";
  console.error(`[${context}] ${message}`);

  if (
    message.includes("API key") ||
    message.includes("api_key") ||
    message.includes("환경변수")
  ) {
    return NextResponse.json(
      { error: "AI 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요." },
      { status: 503 },
    );
  }

  if (message.includes("rate limit") || message.includes("429")) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  return NextResponse.json(
    { error: `${context} 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.` },
    { status: 500 },
  );
}
