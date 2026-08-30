import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";
import { getLoanConditions } from "@/lib/loan-simulator";
import {
  getUnderwritingOverrides,
  setUnderwritingOverrides,
  mergeOverrides,
  productKey,
} from "@/lib/loan-underwriting";

/**
 * 관리자 전세대출 심사조건 오버라이드 API
 * GET — 기본 상품 목록에 현재 오버라이드를 적용한 심사조건(effective) 반환
 * PUT — 오버라이드 저장 (알 수 없는 키 차단 + 값 검증 후 SystemSetting upsert)
 */

async function checkAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const overrides = await getUnderwritingOverrides();
  const base = getLoanConditions();
  const products = mergeOverrides(base, overrides).map((p) => {
    const key = productKey(p.bankName, p.productName);
    return {
      key,
      bankName: p.bankName,
      productName: p.productName,
      maxLTV: p.maxLTV,
      maxDTI: p.maxDTI,
      maxAmount: p.maxAmount,
      maxIncome: p.maxIncome ?? null,
      minCreditScore: p.minCreditScore,
      isFirstHomeOnly: p.isFirstHomeOnly,
      propertyTypes: p.propertyTypes,
      overridden: Boolean(overrides[key]),
    };
  });

  return NextResponse.json({
    products,
    overrideCount: Object.keys(overrides).length,
  });
}

export async function PUT(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const overridesInput = (body as { overrides?: unknown } | null)?.overrides;
  if (typeof overridesInput !== "object" || overridesInput === null || Array.isArray(overridesInput)) {
    return NextResponse.json({ error: "overrides 필드가 필요합니다." }, { status: 400 });
  }

  // 기본 상품 목록에 존재하는 키만 허용 (임의 키 주입 차단)
  const validKeys = new Set(
    getLoanConditions().map((p) => productKey(p.bankName, p.productName)),
  );
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(overridesInput as Record<string, unknown>)) {
    if (validKeys.has(k)) filtered[k] = v;
  }

  // setUnderwritingOverrides 내부에서 값 범위 검증(sanitize) 후 저장
  const saved = await setUnderwritingOverrides(filtered);
  return NextResponse.json({
    success: true,
    overrides: saved,
    overrideCount: Object.keys(saved).length,
  });
}
