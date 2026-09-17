import { NextResponse } from "next/server";
import { loadActiveGuaranteeRules } from "@/lib/guarantee-rules-loader";

/**
 * GET — 현재 활성 보증보험 규칙 (공개)
 * 보증료율·보증한도·담보인정비율 등은 각 기관이 공시하는 공개 정보이므로 인증 없이 제공한다.
 * 클라이언트(전세 분석 등)가 계산 전 활성 규칙을 받아 checkGuaranteeInsurance에 전달하는 용도.
 */
export async function GET() {
  const rules = await loadActiveGuaranteeRules();
  return NextResponse.json({ rules });
}
