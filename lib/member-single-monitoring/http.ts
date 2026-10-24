import { NextResponse } from "next/server";
import { SingleError, singleMessages } from "./errors";
import { GuestError } from "@/lib/guest-monitoring/errors";

/** 회원 단건 API 공통 에러 응답. SingleError/GuestError(provider)는 상태코드 보존, 그 외 500. */
export function singleErrorResponse(e: unknown): NextResponse {
  if (e instanceof SingleError) {
    return NextResponse.json({ error: singleMessages[e.code] ?? "요청을 처리할 수 없습니다.", code: e.code }, { status: e.status });
  }
  if (e instanceof GuestError) {
    return NextResponse.json({ error: "현재 결제를 이용할 수 없습니다.", code: e.code }, { status: e.status });
  }
  console.error("[monitoring/single]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
}
