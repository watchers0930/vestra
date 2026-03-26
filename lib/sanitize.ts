/**
 * 입력값 살균 (Input Sanitization) 유틸리티
 *
 * XSS, 인젝션 공격을 방지하기 위한 서버사이드 입력값 정제 모듈입니다.
 *
 * @module lib/sanitize
 */

// ---------------------------------------------------------------------------
// HTML 태그 제거
// ---------------------------------------------------------------------------

/**
 * HTML 태그 및 위험 패턴 제거
 * - <script>, <iframe>, <object>, <embed> 등 실행 가능 태그 완전 제거
 * - on* 이벤트 핸들러 제거
 * - javascript: 프로토콜 제거
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  let text = input;

  // 1. <script>...</script> 블록 제거 (내용 포함)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. <style>...</style> 블록 제거
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. 위험한 태그 제거 (iframe, object, embed, form, input)
  text = text.replace(/<\/?(?:iframe|object|embed|form|input|button|select|textarea)\b[^>]*>/gi, "");

  // 4. 모든 HTML 태그 제거
  text = text.replace(/<[^>]+>/g, "");

  // 5. javascript: 프로토콜 제거
  text = text.replace(/javascript\s*:/gi, "");

  // 6. on* 이벤트 핸들러 패턴 제거
  text = text.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");

  // 7. HTML 엔티티는 디코딩하지 않음 (인코딩된 XSS 페이로드 방지)
  // &lt;script&gt; 같은 인코딩된 태그가 복원되는 것을 차단
  // 필요 시 출력 단계에서 별도 디코딩

  return text;
}

// ---------------------------------------------------------------------------
// 입력 길이 제한
// ---------------------------------------------------------------------------

/**
 * 입력 텍스트 최대 길이 제한
 *
 * @param input - 원본 텍스트
 * @param maxLen - 최대 글자수 (기본 50,000)
 */
export function truncateInput(input: string, maxLen: number = 50000): string {
  if (!input || typeof input !== "string") return "";
  if (input.length <= maxLen) return input;
  return input.slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// 채팅 메시지 배열 살균
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: string;
  content: string;
}

/**
 * 채팅 메시지 배열 살균
 * - 각 메시지의 content에서 HTML 제거
 * - role은 허용된 값만 통과 (user, assistant, system)
 * - 메시지 최대 개수 제한 (50개)
 * - 개별 메시지 최대 길이 제한 (10,000자)
 */
export function sanitizeMessages(
  messages: ChatMessage[],
  maxMessages: number = 50,
  maxContentLen: number = 10000
): ChatMessage[] {
  if (!Array.isArray(messages)) return [];

  const allowedRoles = new Set(["user", "assistant", "system"]);

  return messages
    .slice(0, maxMessages)
    .filter((m) => m && typeof m.role === "string" && typeof m.content === "string")
    .filter((m) => allowedRoles.has(m.role))
    .map((m) => ({
      role: m.role,
      content: truncateInput(stripHtml(m.content), maxContentLen),
    }));
}

// ---------------------------------------------------------------------------
// 일반 문자열 필드 살균 (짧은 입력용)
// ---------------------------------------------------------------------------

/**
 * 짧은 텍스트 필드 살균 (이름, 주소 등)
 * - HTML 제거 + 길이 제한 + 앞뒤 공백 정리
 */
export function sanitizeField(input: string, maxLen: number = 500): string {
  return truncateInput(stripHtml(input), maxLen).trim();
}

// ---------------------------------------------------------------------------
// JSON 입력 검증 (API 요청 본문 검증용)
// ---------------------------------------------------------------------------

/**
 * 객체의 필수 필드 존재 여부 검증
 * @returns 누락된 필드 목록 (빈 배열이면 모두 통과)
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  return requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );
}

/**
 * 문자열 타입 검증 및 살균
 * - null/undefined → 빈 문자열
 * - 문자열이 아니면 String() 변환
 * - stripHtml + truncate 적용
 */
export function sanitizeString(value: unknown, maxLen: number = 500): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  return sanitizeField(str, maxLen);
}

// ---------------------------------------------------------------------------
// 파일 매직바이트 검증 (MIME 스푸핑 방어)
// ---------------------------------------------------------------------------

/** 알려진 파일 시그니처 (매직바이트) */
const FILE_SIGNATURES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
};

/**
 * 파일의 매직바이트를 확인하여 MIME 타입과 실제 내용이 일치하는지 검증
 * @param buffer - 파일의 처음 몇 바이트 (최소 8바이트)
 * @param declaredMime - 클라이언트가 선언한 MIME 타입
 * @returns true면 매직바이트가 선언된 MIME과 일치
 */
export function validateMagicBytes(
  buffer: ArrayBuffer | Uint8Array,
  declaredMime: string
): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const signatures = FILE_SIGNATURES[declaredMime];

  if (!signatures) {
    // 알려지지 않은 MIME: 매직바이트 검증 스킵 (MIME 타입 체크는 별도로)
    return true;
  }

  return signatures.some((sig) =>
    sig.every((byte, i) => bytes[i] === byte)
  );
}
