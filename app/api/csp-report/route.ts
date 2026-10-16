import { NextResponse } from "next/server";

// CSP 위반 리포트 수신 엔드포인트.
// ⚠️ 의도적으로 무인증이다 — 브라우저가 CSP 위반 시 자동으로(사용자 세션과 무관하게) 전송하는 엔드포인트이기 때문이다.
//    DB 변이 없이 서버 로그만 남긴다(읽기/로그 전용). 외부 공급사(카카오맵 CDN 전환 등)로 리소스가
//    차단되는 순간을 사용자 민원 전에 감지하는 것이 목적.
export const runtime = "nodejs";

// 인메모리 중복 억제 — 같은 위반(디렉티브+차단 호스트)을 DEDUP_MS 내 1회만 로그.
// 서버리스 인스턴스별이라 완벽하진 않지만 리포트 폭주/로그 홍수를 충분히 완화한다.
const seen = new Map<string, number>();
const DEDUP_MS = 5 * 60 * 1000; // 5분
const MAX_KEYS = 500;

function shouldLog(key: string, now: number): boolean {
  const last = seen.get(key);
  if (last && now - last < DEDUP_MS) return false;
  if (seen.size > MAX_KEYS) seen.clear(); // 메모리 상한(간단 정리)
  seen.set(key, now);
  return true;
}

function hostOf(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return String(uri).slice(0, 80);
  }
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    // 비정상/과대 페이로드 방어(악의적 폭주 완화)
    if (!text || text.length > 10_000) return new NextResponse(null, { status: 204 });

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    // 리포트 포맷: 구형 {"csp-report":{...}} / 신형 report-to [{type,body:{...}}, ...]
    const reports = Array.isArray(body) ? body : [body];
    for (const r of reports.slice(0, 20)) {
      const rec = r as Record<string, unknown>;
      const rep = (rec["csp-report"] || rec["body"] || rec) as Record<string, unknown>;
      const directive = String(
        rep["violated-directive"] || rep["effectiveDirective"] || rep["effective-directive"] || "unknown",
      );
      const blockedRaw = String(rep["blocked-uri"] || rep["blockedURL"] || rep["blocked-url"] || "unknown");
      const docUri = String(rep["document-uri"] || rep["documentURL"] || "unknown");
      const blockedHost = hostOf(blockedRaw);

      const key = `${directive}|${blockedHost}`;
      if (shouldLog(key, Date.now())) {
        // 이 로그가 찍히면 = 외부 리소스가 CSP에 막히기 시작했다는 신호.
        // (예: 카카오가 지도 엔진 CDN을 또 바꿔 새 호스트가 차단되는 경우)
        console.error(
          "[CSP-VIOLATION]",
          JSON.stringify({ directive, blockedHost, blocked: blockedRaw.slice(0, 200), docUri: docUri.slice(0, 200) }),
        );
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
