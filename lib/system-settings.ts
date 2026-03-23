/**
 * 시스템 설정 관리 (System Settings Manager)
 * ─────────────────────────────────────────────
 * DB에 암호화하여 저장된 시스템 설정(OAuth 키 등)을 관리.
 * AES-256-GCM 암호화 + 인메모리 캐시(TTL 60초).
 */

import crypto from "crypto";
import { prisma } from "./prisma";

// ─── 암호화 ───

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다.");
  return crypto.scryptSync(secret, "vestra-salt", 32);
}

export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(16) + tag(16) + ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(encoded: string): string {
  const key = deriveKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// ─── 값 마스킹 ───

export function maskValue(value: string): string {
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

// ─── 인메모리 캐시 ───

let oauthCache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60초

export function invalidateOAuthCache() {
  oauthCache = null;
  cacheTimestamp = 0;
}

/**
 * DB에서 OAuth 카테고리 설정을 읽고 복호화하여 반환.
 * 캐시 TTL(60초) 내에는 인메모리 캐시 사용.
 */
export async function getOAuthSettings(): Promise<Record<string, string>> {
  if (oauthCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return oauthCache;
  }

  try {
    const rows = await prisma.systemSetting.findMany({
      where: { category: "oauth" },
    });
    const settings: Record<string, string> = {};
    for (const row of rows) {
      try {
        settings[row.key] = decrypt(row.value);
      } catch {
        // 복호화 실패 시 무시 (키 변경 등)
      }
    }
    oauthCache = settings;
    cacheTimestamp = Date.now();
    return settings;
  } catch {
    // DB 접근 실패 시 빈 객체 반환
    return {};
  }
}

/**
 * DB 값 우선, 없으면 env 폴백.
 */
export async function getOAuthSettingOrEnv(key: string): Promise<string | undefined> {
  const settings = await getOAuthSettings();
  return settings[key] || process.env[key] || undefined;
}

/**
 * OAuth 설정 값을 암호화하여 DB에 저장.
 */
export async function setOAuthSetting(key: string, value: string): Promise<void> {
  const encrypted = encrypt(value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: encrypted, category: "oauth" },
    create: { key, value: encrypted, category: "oauth" },
  });
  invalidateOAuthCache();
}

/**
 * OAuth 설정 삭제.
 */
export async function deleteOAuthSetting(key: string): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key } });
  invalidateOAuthCache();
}

// ─── OAuth 프로바이더 설정 구조 ───

export interface OAuthProviderConfig {
  provider: string;
  label: string;
  clientIdKey: string;
  clientSecretKey: string;
  devConsoleUrl: string;
  callbackPath: string;
}

export const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  {
    provider: "google",
    label: "Google",
    clientIdKey: "AUTH_GOOGLE_ID",
    clientSecretKey: "AUTH_GOOGLE_SECRET",
    devConsoleUrl: "https://console.cloud.google.com/apis/credentials",
    callbackPath: "/api/auth/callback/google",
  },
  {
    provider: "naver",
    label: "네이버",
    clientIdKey: "NAVER_CLIENT_ID",
    clientSecretKey: "NAVER_CLIENT_SECRET",
    devConsoleUrl: "https://developers.naver.com/apps",
    callbackPath: "/api/auth/callback/naver",
  },
];

// ─── PG 프로바이더 설정 구조 ───

export interface PGProviderConfig {
  provider: string;
  label: string;
  clientKeyName: string;
  secretKeyName: string;
  devConsoleUrl: string;
  description: string;
}

export const PG_PROVIDERS: PGProviderConfig[] = [
  {
    provider: "tosspayments",
    label: "토스페이먼츠",
    clientKeyName: "TOSS_CLIENT_KEY",
    secretKeyName: "TOSS_SECRET_KEY",
    devConsoleUrl: "https://developers.tosspayments.com",
    description: "카드, 계좌이체, 가상계좌, 간편결제 지원",
  },
  {
    provider: "inicis",
    label: "KG이니시스",
    clientKeyName: "INICIS_MID",
    secretKeyName: "INICIS_API_KEY",
    devConsoleUrl: "https://manual.inicis.com",
    description: "국내 1위 PG사, 다양한 결제수단 지원",
  },
  {
    provider: "kcp",
    label: "NHN KCP",
    clientKeyName: "KCP_SITE_CD",
    secretKeyName: "KCP_SITE_KEY",
    devConsoleUrl: "https://admin8.kcp.co.kr",
    description: "간편결제, 정기결제, 해외결제 지원",
  },
];

/**
 * DB에서 PG 카테고리 설정을 읽고 복호화하여 반환.
 */
export async function getPGSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { category: "pg" },
    });
    const settings: Record<string, string> = {};
    for (const row of rows) {
      try {
        settings[row.key] = decrypt(row.value);
      } catch {
        // 복호화 실패 시 무시
      }
    }
    return settings;
  } catch {
    return {};
  }
}

/**
 * PG 설정 값을 암호화하여 DB에 저장.
 */
export async function setPGSetting(key: string, value: string): Promise<void> {
  const encrypted = encrypt(value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: encrypted, category: "pg" },
    create: { key, value: encrypted, category: "pg" },
  });
}

/**
 * PG 설정 삭제.
 */
export async function deletePGSetting(key: string): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key } });
}

// ─── Scholar(학술논문) 프로바이더 설정 구조 ───

export interface ScholarProviderConfig {
  provider: string;
  label: string;
  apiKeyName: string;
  baseUrl: string;
  description: string;
}

export const SCHOLAR_PROVIDERS: ScholarProviderConfig[] = [
  {
    provider: "semantic_scholar",
    label: "Semantic Scholar",
    apiKeyName: "SEMANTIC_SCHOLAR_API_KEY",
    baseUrl: "https://api.semanticscholar.org",
    description: "영문 학술논문 검색 (무료, 100req/5min)",
  },
  {
    provider: "riss",
    label: "RISS (학술연구정보서비스)",
    apiKeyName: "RISS_API_KEY",
    baseUrl: "http://openapi.riss.kr",
    description: "국내 학술논문 검색 (무료, 기관신청)",
  },
  {
    provider: "kci",
    label: "KCI (한국학술지인용색인)",
    apiKeyName: "KCI_API_KEY",
    baseUrl: "https://open.kci.go.kr",
    description: "한국연구재단 논문 검색 (무료, 신청발급)",
  },
];

/**
 * DB에서 Scholar 카테고리 설정을 읽고 복호화하여 반환.
 */
export async function getScholarSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { category: "scholar" },
    });
    const settings: Record<string, string> = {};
    for (const row of rows) {
      try {
        settings[row.key] = decrypt(row.value);
      } catch {
        // 복호화 실패 시 무시
      }
    }
    return settings;
  } catch {
    return {};
  }
}

/**
 * Scholar 설정 값을 암호화하여 DB에 저장.
 */
export async function setScholarSetting(key: string, value: string): Promise<void> {
  const encrypted = encrypt(value);
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: encrypted, category: "scholar" },
    create: { key, value: encrypted, category: "scholar" },
  });
}

/**
 * Scholar 설정 삭제.
 */
export async function deleteScholarSetting(key: string): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key } });
}
