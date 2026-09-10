/**
 * PII 암호화/복호화 유틸리티
 * ─────────────────────────────
 * 개인정보(사업자등록번호 등)를 AES-256-GCM으로 암호화.
 * system-settings.ts의 암호화 패턴을 범용화한 버전.
 *
 * 주요 특징:
 * - AES-256-GCM (인증된 암호화)
 * - AUTH_SECRET 기반 키 파생 (PII 전용 salt)
 * - 검색용 해시 인덱스 지원 (SHA-256)
 *
 * @module lib/crypto
 */

import crypto from "crypto";

// ─── 상수 ───

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// ─── 키 버전 태깅 (무중단 로테이션 지원) ───
//
// 암호문 포맷:
//   v1 (레거시): base64(iv+tag+ciphertext)           ← prefix 없음, scrypt(AUTH_SECRET, PII_SALT)
//   v2 (신규)  : "v2:" + base64(iv+tag+ciphertext)   ← scrypt(PII_ENCRYPTION_KEY, PII_SALT)
//
// - PII_ENCRYPTION_KEY가 설정돼 있으면 신규 암호화는 v2, 없으면 기존 v1로 동작(폴백).
//   → env 설정 순서와 무관하게 기존 동작이 절대 깨지지 않는다.
// - 복호화는 prefix로 키 버전을 판별한다. 구 데이터(prefix 없음)는 v1로 복호화 → 무중단 호환.
// - 재암호화 완료 후 v1(AUTH_SECRET 파생)을 폐기하면 AUTH_SECRET 유출로도 PII 복호화 불가.

type KeyVersion = "v1" | "v2";
const V2_PREFIX = "v2:";

function getPIISalt(): string {
  const salt = process.env.PII_SALT;
  if (!salt) {
    throw new Error("PII_SALT 환경변수가 설정되지 않았습니다. PII 암호화를 수행할 수 없습니다.");
  }
  return salt;
}

// ─── 키 파생 ───

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다. PII 암호화를 수행할 수 없습니다.");
  }
  return secret;
}

/** 신규 암호화에 사용할 활성 키 버전 (PII_ENCRYPTION_KEY 있으면 v2) */
function activeKeyVersion(): KeyVersion {
  return process.env.PII_ENCRYPTION_KEY ? "v2" : "v1";
}

/** 키 버전별 32바이트 키 파생 */
function deriveKey(version: KeyVersion): Buffer {
  if (version === "v2") {
    const k = process.env.PII_ENCRYPTION_KEY;
    if (!k) {
      throw new Error("PII_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
    }
    return crypto.scryptSync(k, getPIISalt(), 32);
  }
  // v1 (레거시): AUTH_SECRET 기반
  return crypto.scryptSync(getSecret(), getPIISalt(), 32);
}

// ─── 암호화 / 복호화 ───

/**
 * PII 데이터를 AES-256-GCM으로 암호화
 * @param plaintext - 평문 (사업자등록번호, 주소 등)
 * @returns Base64 인코딩된 암호문 (iv + tag + ciphertext)
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return "";

  const version = activeKeyVersion();
  const key = deriveKey(version);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv(16) + tag(16) + ciphertext → base64
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");
  // v2는 키 버전 prefix, v1은 레거시 포맷(prefix 없음) 유지 → 하위호환
  return version === "v2" ? `${V2_PREFIX}${payload}` : payload;
}

/**
 * AES-256-GCM 암호문을 복호화
 * @param encoded - Base64 인코딩된 암호문
 * @returns 복호화된 평문
 */
export function decryptPII(encoded: string): string {
  if (!encoded) return "";

  try {
    // 키 버전 판별: "v2:" prefix면 v2, 없으면 레거시 v1
    let version: KeyVersion = "v1";
    let payload = encoded;
    if (encoded.startsWith(V2_PREFIX)) {
      version = "v2";
      payload = encoded.slice(V2_PREFIX.length);
    }

    const key = deriveKey(version);
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    // 복호화 실패 시 원본 반환 (미암호화 평문 데이터 호환)
    return encoded;
  }
}

// ─── 검색용 해시 ───

/**
 * 검색 가능한 단방향 해시 생성 (SHA-256)
 * DB에서 암호화된 필드를 검색할 때 사용.
 *
 * 예: addressHash = hashForSearch(address)
 *     WHERE addressHash = hashForSearch(searchTerm)
 */
export function hashForSearch(value: string): string {
  if (!value) return "";
  return crypto
    .createHmac("sha256", getSecret())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

// ─── PII 마스킹 (표시용) ───

/**
 * 사업자등록번호 마스킹 (예: 123-45-****)
 */
export function maskBusinessNumber(value: string): string {
  if (!value || value.length < 6) return "****";
  return value.slice(0, 6) + "****";
}

/**
 * 이메일 마스킹 (예: ab****@example.com)
 */
export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!domain) return "****";
  const masked = local.length <= 2 ? "**" : local.slice(0, 2) + "****";
  return `${masked}@${domain}`;
}
