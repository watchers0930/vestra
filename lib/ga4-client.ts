import crypto from "crypto";

/**
 * GA4 Data API 클라이언트 (서비스 계정 인증, 의존성 없이 REST 호출)
 *
 * env:
 * - GA4_SA_KEY_BASE64 : 서비스 계정 JSON 키를 base64 인코딩한 값
 * - GA4_PROPERTY_ID   : GA4 속성 ID (숫자, 예: 536963348)
 *
 * 서버 전용. API 라우트(nodejs 런타임)에서만 사용한다.
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedKey: ServiceAccountKey | null = null;

function getServiceAccountKey(): ServiceAccountKey {
  if (cachedKey) return cachedKey;
  const b64 = process.env.GA4_SA_KEY_BASE64;
  if (!b64) throw new Error("GA4_SA_KEY_BASE64 미설정");
  const json = Buffer.from(b64, "base64").toString("utf8");
  const parsed = JSON.parse(json) as ServiceAccountKey;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GA4 서비스 계정 키 형식 오류");
  }
  cachedKey = parsed;
  return parsed;
}

export function getPropertyId(): string {
  const pid = process.env.GA4_PROPERTY_ID;
  if (!pid) throw new Error("GA4_PROPERTY_ID 미설정");
  return pid.trim();
}

export function isGa4Configured(): boolean {
  return Boolean(process.env.GA4_SA_KEY_BASE64 && process.env.GA4_PROPERTY_ID);
}

// ---- 액세스 토큰 (모듈 스코프 캐시, 요청마다 JWT 서명 반복 방지) ----
let tokenCache: { token: string; expiresAt: number } | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // 만료 60초 전까지 캐시 재사용
  if (tokenCache && tokenCache.expiresAt - 60 > now) {
    return tokenCache.token;
  }
  const key = getServiceAccountKey();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: key.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), key.private_key)
    .toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(key.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`GA4 토큰 발급 실패: ${data.error || res.status} ${data.error_description || ""}`);
  }
  tokenCache = { token: data.access_token, expiresAt: now + 3600 };
  return data.access_token;
}

// ---- GA4 Data API 타입 (필요한 부분만) ----
export interface Ga4ReportRequest {
  dateRanges?: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  orderBys?: unknown[];
  limit?: number | string;
  keepEmptyRows?: boolean;
}

export interface Ga4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

export interface Ga4Report {
  rows?: Ga4Row[];
  rowCount?: number;
  totals?: Ga4Row[];
}

async function apiPost<T>(method: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const pid = getPropertyId();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${pid}:${method}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(`GA4 ${method} 실패 (${data.error.code}): ${data.error.message}`);
  }
  return data as T;
}

/** 단일 리포트 */
export function runReport(req: Ga4ReportRequest): Promise<Ga4Report> {
  return apiPost<Ga4Report>("runReport", req);
}

/** 여러 리포트 일괄 (최대 5개/배치) */
export async function batchRunReports(requests: Ga4ReportRequest[]): Promise<Ga4Report[]> {
  const chunks: Ga4ReportRequest[][] = [];
  for (let i = 0; i < requests.length; i += 5) chunks.push(requests.slice(i, i + 5));
  const results: Ga4Report[] = [];
  for (const chunk of chunks) {
    const data = await apiPost<{ reports?: Ga4Report[] }>("batchRunReports", { requests: chunk });
    results.push(...(data.reports || []));
  }
  return results;
}

/** 실시간 리포트 */
export function runRealtimeReport(req: {
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  limit?: number | string;
}): Promise<Ga4Report> {
  return apiPost<Ga4Report>("runRealtimeReport", req);
}
