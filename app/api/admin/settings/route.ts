import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditWithRequest, createAuditLog } from "@/lib/audit-log";
import { validateOrigin } from "@/lib/csrf";
import {
  getOAuthSettings,
  setOAuthSetting,
  deleteOAuthSetting,
  getPGSettings,
  setPGSetting,
  deletePGSetting,
  getScholarSettings,
  setScholarSetting,
  deleteScholarSetting,
  getNotificationSettings,
  setNotificationSetting,
  deleteNotificationSetting,
  maskValue,
  OAUTH_PROVIDERS,
  PG_PROVIDERS,
  SCHOLAR_PROVIDERS,
  NOTIFICATION_PROVIDERS,
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

  const [dbOAuth, dbPG, dbScholar, dbNotification] = await Promise.all([
    getOAuthSettings(),
    getPGSettings(),
    getScholarSettings(),
    getNotificationSettings(),
  ]);

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

  // Scholar 프로바이더
  const scholarProviders: Record<string, {
    label: string;
    apiKey: string;
    configured: boolean;
    source: "db" | "env" | "none";
    baseUrl: string;
    description: string;
  }> = {};

  for (const p of SCHOLAR_PROVIDERS) {
    const dbKey = dbScholar[p.apiKeyName];
    const envKey = process.env[p.apiKeyName];

    const hasDb = !!dbKey;
    const hasEnv = !!envKey;

    scholarProviders[p.provider] = {
      label: p.label,
      apiKey: hasDb ? maskValue(dbKey) : hasEnv ? maskValue(envKey) : "",
      configured: hasDb || hasEnv,
      source: hasDb ? "db" : hasEnv ? "env" : "none",
      baseUrl: p.baseUrl,
      description: p.description,
    };
  }

  // Notification 프로바이더
  const notificationProviders: Record<string, {
    label: string;
    keys: Record<string, { label: string; value: string; configured: boolean; source: "db" | "env" | "none" }>;
    description: string;
  }> = {};

  for (const p of NOTIFICATION_PROVIDERS) {
    const keys: Record<string, { label: string; value: string; configured: boolean; source: "db" | "env" | "none" }> = {};
    for (const k of p.keys) {
      const dbVal = dbNotification[k.name];
      const envVal = process.env[k.name];
      const hasDb = !!dbVal;
      const hasEnv = !!envVal;

      keys[k.name] = {
        label: k.label,
        value: hasDb ? maskValue(dbVal) : hasEnv ? maskValue(envVal) : "",
        configured: hasDb || hasEnv,
        source: hasDb ? "db" : hasEnv ? "env" : "none",
      };
    }
    notificationProviders[p.provider] = {
      label: p.label,
      keys,
      description: p.description,
    };
  }

  return NextResponse.json({ providers, pgProviders, scholarProviders, notificationProviders });
}

/**
 * PUT /api/admin/settings
 * OAuth 또는 PG 프로바이더 키 저장/삭제
 * Body: { category: "oauth"|"pg", provider: string, clientId/clientKey: string, clientSecret/secretKey: string }
 */
export async function PUT(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  }

  const body = await req.json();
  const { category = "oauth", provider } = body;

  // Notification 설정
  if (category === "notification") {
    const { keys } = body as { keys?: Record<string, string> };
    const config = NOTIFICATION_PROVIDERS.find((p) => p.provider === provider);
    if (!config) {
      return NextResponse.json({ error: "지원하지 않는 알림 서비스" }, { status: 400 });
    }

    // 초기화: keys가 없거나 모든 값이 비어있으면
    if (!keys || Object.values(keys).every((v) => !v)) {
      for (const k of config.keys) {
        await deleteNotificationSetting(k.name);
      }
      createAuditLog({
        req,
        userId: session.user.id,
        action: "admin:reset-settings",
        target: `notification:${provider}`,
        detail: { category: "notification", provider, description: "알림 서비스 설정 초기화" },
      });
      return NextResponse.json({ message: `${config.label} 설정이 초기화되었습니다.` });
    }

    // 필수 키 검증 (API Key, API Secret은 필수)
    const requiredKeys = config.keys.filter((k) => k.required);
    for (const rk of requiredKeys) {
      if (!keys[rk.name]) {
        return NextResponse.json(
          { error: `${rk.label}은(는) 필수 입력입니다.` },
          { status: 400 },
        );
      }
    }

    // 저장
    for (const k of config.keys) {
      if (keys[k.name]) {
        await setNotificationSetting(k.name, keys[k.name]);
      }
    }
    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:update-settings",
      target: `notification:${provider}`,
      detail: { category: "notification", provider, description: "알림 서비스 설정 저장" },
    });
    return NextResponse.json({ message: `${config.label} 설정이 저장되었습니다.` });
  }

  // Scholar 설정
  if (category === "scholar") {
    const { apiKey } = body;
    const config = SCHOLAR_PROVIDERS.find((p) => p.provider === provider);
    if (!config) {
      return NextResponse.json({ error: "지원하지 않는 논문검색 서비스" }, { status: 400 });
    }

    if (!apiKey) {
      await deleteScholarSetting(config.apiKeyName);
      createAuditLog({
        req,
        userId: session.user.id,
        action: "admin:reset-settings",
        target: `scholar:${provider}`,
        detail: { category: "scholar", provider, description: "논문검색 서비스 설정 초기화" },
      });
      return NextResponse.json({ message: `${config.label} 설정이 초기화되었습니다.` });
    }

    await setScholarSetting(config.apiKeyName, apiKey);
    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:update-settings",
      target: `scholar:${provider}`,
      detail: { category: "scholar", provider, description: "논문검색 API 키 저장" },
    });
    return NextResponse.json({ message: `${config.label} API 키가 저장되었습니다.` });
  }

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
      createAuditLog({
        req,
        userId: session.user.id,
        action: "admin:reset-settings",
        target: `pg:${provider}`,
        detail: { category: "pg", provider, description: "PG 설정 초기화" },
      });
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
    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:update-settings",
      target: `pg:${provider}`,
      detail: { category: "pg", provider, description: "PG 결제 설정 저장" },
    });
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
    createAuditLog({
      req,
      userId: session.user.id,
      action: "admin:reset-settings",
      target: `oauth:${provider}`,
      detail: { category: "oauth", provider, description: "OAuth 설정 초기화" },
    });
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

  // 감사 로그: 설정 변경
  await logAuditWithRequest({
    userId: session.user.id,
    action: "ADMIN_SETTINGS_CHANGE",
    target: provider,
    detail: { category, provider, action: "update" },
  });

  return NextResponse.json({ message: `${config.label} 소셜 로그인이 설정되었습니다.` });
}
