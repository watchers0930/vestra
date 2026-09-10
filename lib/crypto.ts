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

// ─── 키 버전 태깅 (무중단 로테이션 지원, v1 폐기 완료 — S8) ───
//
// 암호문 포맷: "v2:" + base64(iv+tag+ciphertext)   ← scrypt(PII_ENCRYPTION_KEY, PII_SALT)
//
// - 신규 암호화는 항상 v2 (PII_ENCRYPTION_KEY 필수).
// - 복호화는 "v2:" prefix만 처리. prefix가 없으면 미암호화 평문으로 간주해 원본 반환.
// - v1(AUTH_SECRET 파생) 복호화 경로는 S8에서 폐기 → AUTH_SECRET이 유출돼도 PII 복호화 불가.
//   (운영 전 필드 v1 0건 확인 후 제거. 차기 키 로테이션은 v3 prefix 추가 방식으로 확장)

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
    throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
}

/** PII 암호화 키(v2) 파생. PII_ENCRYPTION_KEY 전용 — AUTH_SECRET과 독립. */
function deriveKey(): Buffer {
  const k = process.env.PII_ENCRYPTION_KEY;
  if (!k) {
    throw new Error("PII_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다. PII 암호화를 수행할 수 없습니다.");
  }
  return crypto.scryptSync(k, getPIISalt(), 32);
}

// ─── 암호화 / 복호화 ───

/**
 * PII 데이터를 AES-256-GCM으로 암호화 (항상 v2)
 * @param plaintext - 평문 (사업자등록번호, 주소 등)
 * @returns "v2:" + Base64(iv + tag + ciphertext)
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext) return "";

  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv(16) + tag(16) + ciphertext → base64, v2 prefix 부여
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64");
  return `${V2_PREFIX}${payload}`;
}

/**
 * AES-256-GCM 암호문(v2)을 복호화
 * @param encoded - "v2:" 접두 암호문. prefix 없으면 미암호화 평문으로 간주해 원본 반환.
 * @returns 복호화된 평문
 */
export function decryptPII(encoded: string): string {
  if (!encoded) return "";

  // v2 prefix가 없으면 미암호화 평문(원본 반환). v1(AUTH_SECRET) 경로는 폐기됨(S8).
  if (!encoded.startsWith(V2_PREFIX)) return encoded;

  try {
    const payload = encoded.slice(V2_PREFIX.length);
    const key = deriveKey();
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
  } catch {
    // 복호화 실패 시 원본 반환 (호환)
    return encoded;
  }
}

// ─── 검색용 해시 ───

/**
 * 검색 인덱스(blind index) 전용 HMAC 키.
 * SEARCH_INDEX_KEY가 있으면 그것을(마스터키 분리, 설계서 §1),
 * 없으면 AUTH_SECRET으로 폴백 → env 미설정 시 기존 해시와 완전 호환.
 */
function getSearchKey(): string {
  return process.env.SEARCH_INDEX_KEY || getSecret();
}

/**
 * 검색 가능한 단방향 해시 생성 (HMAC-SHA256, blind index)
 * DB에서 암호화된 필드를 정확일치로 검색할 때 사용.
 *
 * 예: addressHash = hashForSearch(address)
 *     WHERE addressHash = hashForSearch(searchTerm)
 */
export function hashForSearch(value: string): string {
  if (!value) return "";
  return crypto
    .createHmac("sha256", getSearchKey())
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
