import { stripHtml, truncateInput } from "@/lib/sanitize";
import { compressFloorData } from "@/lib/registry-parser";
import { normalizePropertyAddress } from "@/lib/registry/title-address-parser";
export { parseAreaValue } from "@/lib/registry/title-area-parser";
export function resolvePropertyAddress(parsed: string, user: string, source?: string): string {
  const input = normalizePropertyAddress(user || "");
  const registry = normalizePropertyAddress(parsed || "");
  if ((source === "tilko" || source === "address") && input) return input;
  // 완전한 입력 주소가 있으면 잘린 파서 후보로 대체하지 않는다.
  return registry && /(?:로|길|동|리|가)\s*(?:산\s*)?\d/.test(registry) ? registry : input || registry;
}
export function sanitizeInput(rawInput: string): string {
  let sanitized = rawInput || "";

  // HTML 취소선 태그 감지 → 【말소】 마커 삽입 (stripHtml 전에 처리)
  sanitized = sanitized.replace(/<(?:del|s|strike)\b[^>]*>([\s\S]*?)<\/(?:del|s|strike)>/gi, "【말소】$1");
  sanitized = sanitized.replace(/<[^>]*(?:text-decoration\s*:\s*line-through|class\s*=\s*["'][^"']*(?:cancel|deleted|strikethrough|malso)[^"']*["'])[^>]*>([\s\S]*?)<\/[^>]+>/gi, "【말소】$1");

  sanitized = sanitized.replace(/<br\s*\/?>/gi, "\n");
  sanitized = sanitized.replace(/<\/(?:p|div|tr|li|td|th)>/gi, "\n");
  sanitized = stripHtml(sanitized);
  sanitized = compressFloorData(sanitized);
  return truncateInput(sanitized, 50000);
}

