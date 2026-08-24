import { NextRequest } from "next/server";

/**
 * 신뢰 가능한 클라이언트 IP 추출.
 * Vercel은 `x-real-ip`에 실제 클라이언트 IP를 세팅하며 클라이언트가 조작할 수 없다.
 * `x-forwarded-for`의 첫 토큰은 클라이언트가 위조(프리펜드) 가능하므로 신뢰하지 않는다.
 * (rate-limit 키·감사 로그 IP에 사용)
 */
export function getClientIp(req: NextRequest, fallback: string = "anon"): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  // 폴백: XFF는 신뢰 프록시가 마지막에 추가하므로 맨 끝 값을 사용(첫 값은 위조 가능)
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return fallback;
}
