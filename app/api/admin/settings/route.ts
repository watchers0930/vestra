import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOAuthSettings,
  setOAuthSetting,
  deleteOAuthSetting,
  getPGSettings,
  setPGSetting,
  deletePGSetting,
  maskValue,
  OAUTH_PROVIDERS,
  PG_PROVIDERS,
} from "@/lib/system-settings";

/**
 * GET /api/admin/settings
 * OAuth + PG 프로바이더 설정 상태 조회 (값은 마스킹)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const [dbOAuth, dbPG] = await Promise.all([getOAuthSettings(), getPGSettings()]);

  // OAuth 프로바이더
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
    const dbId = dbOAuth[p.clientIdKey];
    const dbSecret = dbOAuth[p.clientSecretKey];
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

  // PG 프로바이더
  const pgProviders: Record<string, {
    label: string;
    clientKey: string;
    secretKey: string;
    configured: boolean;
    source: "db" | "env" | "none";
    devConsoleUrl: string;
    description: string;
  }> = {};

  for (const p of PG_PROVIDERS) {
    const dbKey = dbPG[p.clientKeyName];
    const dbSecret = dbPG[p.secretKeyName];
    const envKey = process.env[p.clientKeyName];
    const envSecret = process.env[p.secretKeyName];

    const hasDb = !!(dbKey && dbSecret);
    const hasEnv = !!(envKey && envSecret);

    pgProviders[p.provider] = {
      label: p.label,
      clientKey: hasDb ? maskValue(dbKey) : hasEnv ? maskValue(envKey) : "",
      secretKey: hasDb ? "****" : hasEnv ? "****" : "",
      configured: hasDb || hasEnv,
      source: hasDb ? "db" : hasEnv ? "env" : "none",
      devConsoleUrl: p.devConsoleUrl,
      description: p.description,
    };
  }

  return NextResponse.json({ providers, pgProviders });
}

/**
 * PUT /api/admin/settings
 * OAuth 또는 PG 프로바이더 키 저장/삭제
 * Body: { category: "oauth"|"pg", provider: string, clientId/clientKey: string, clientSecret/secretKey: string }
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const body = await req.json();
  const { category = "oauth", provider } = body;

  // PG 설정
  if (category === "pg") {
    const { clientKey, secretKey } = body;
    const config = PG_PROVIDERS.find((p) => p.provider === provider);
    if (!config) {
      return NextResponse.json({ error: "지원하지 않는 PG사" }, { status: 400 });
    }

    if (!clientKey && !secretKey) {
      await deletePGSetting(config.clientKeyName);
      await deletePGSetting(config.secretKeyName);
      return NextResponse.json({ message: `${config.label} 설정이 초기화되었습니다.` });
    }

    if (!clientKey || !secretKey) {
      return NextResponse.json(
        { error: "Client Key와 Secret Key를 모두 입력해주세요." },
        { status: 400 },
      );
    }

    await setPGSetting(config.clientKeyName, clientKey);
    await setPGSetting(config.secretKeyName, secretKey);
    return NextResponse.json({ message: `${config.label} 결제 설정이 저장되었습니다.` });
  }

  // OAuth 설정 (기존)
  const { clientId, clientSecret } = body;
  const config = OAUTH_PROVIDERS.find((p) => p.provider === provider);
  if (!config) {
    return NextResponse.json({ error: "지원하지 않는 프로바이더" }, { status: 400 });
  }

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
