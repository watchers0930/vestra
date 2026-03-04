import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOAuthSettings,
  setOAuthSetting,
  deleteOAuthSetting,
  maskValue,
  OAUTH_PROVIDERS,
} from "@/lib/system-settings";

/**
 * GET /api/admin/settings
 * OAuth 프로바이더 설정 상태 조회 (값은 마스킹)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const dbSettings = await getOAuthSettings();

  const providers: Record<string, {
    label: string;
    clientId: string;
    clientSecret: string;
    configured: boolean;
    source: "db" | "env" | "none";
    devConsoleUrl: string;
    callbackPath: string;
  }> = {};

  for (const p of OAUTH_PROVIDERS) {
    const dbId = dbSettings[p.clientIdKey];
    const dbSecret = dbSettings[p.clientSecretKey];
    const envId = process.env[p.clientIdKey];
    const envSecret = process.env[p.clientSecretKey];

    const hasDb = !!(dbId && dbSecret);
    const hasEnv = !!(envId && envSecret);

    providers[p.provider] = {
      label: p.label,
      clientId: hasDb ? maskValue(dbId) : hasEnv ? maskValue(envId) : "",
      clientSecret: hasDb ? "****" : hasEnv ? "****" : "",
      configured: hasDb || hasEnv,
      source: hasDb ? "db" : hasEnv ? "env" : "none",
      devConsoleUrl: p.devConsoleUrl,
      callbackPath: p.callbackPath,
    };
  }

  return NextResponse.json({ providers });
}

/**
 * PUT /api/admin/settings
 * OAuth 프로바이더 키 저장/삭제
 * Body: { provider: "google"|"kakao"|"naver", clientId: string, clientSecret: string }
 * clientId가 빈 문자열이면 삭제
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const { provider, clientId, clientSecret } = await req.json();

  const config = OAUTH_PROVIDERS.find((p) => p.provider === provider);
  if (!config) {
    return NextResponse.json({ error: "지원하지 않는 프로바이더" }, { status: 400 });
  }

  // 빈 값이면 삭제 (env 폴백으로 전환)
  if (!clientId && !clientSecret) {
    await deleteOAuthSetting(config.clientIdKey);
    await deleteOAuthSetting(config.clientSecretKey);
    return NextResponse.json({ message: `${config.label} 설정이 초기화되었습니다.` });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Client ID와 Client Secret을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  await setOAuthSetting(config.clientIdKey, clientId);
  await setOAuthSetting(config.clientSecretKey, clientSecret);

  return NextResponse.json({ message: `${config.label} 소셜 로그인이 설정되었습니다.` });
}
