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
  const secret = process.env.AUTH_SECRET || "vestra-default-secret-change-me";
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
    provider: "kakao",
    label: "카카오",
    clientIdKey: "KAKAO_CLIENT_ID",
    clientSecretKey: "KAKAO_CLIENT_SECRET",
    devConsoleUrl: "https://developers.kakao.com/console/app",
    callbackPath: "/api/auth/callback/kakao",
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
