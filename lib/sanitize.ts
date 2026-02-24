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

  // 7. HTML 엔티티 디코딩 (기본)
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");

  // 8. 재귀적으로 남은 태그 한번 더 제거
  text = text.replace(/<[^>]+>/g, "");

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
