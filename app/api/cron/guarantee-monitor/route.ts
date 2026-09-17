import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * 보증보험 조건 변경 모니터링 (Vercel Cron)
 * ──────────────────────────────────────────
 * 매주 월요일 09:00 KST 실행
 * HUG·HF·SGI 공식 페이지를 fetch하여 주요 키워드 변경을 감지한다.
 *
 * ⚠️ 공지사항 자동 생성은 2026-09-17 중단함.
 *   현 감지 방식(키워드 유무)이 HUG·SGI 페이지 개편에 매주 오탐만 양산해
 *   어드민 공지가 오탐으로 누적됐다(21건 삭제). 감지 결과는 응답 JSON/로그로만
 *   남기고, 실제 변경 감시는 향후 스냅샷(contentLength/해시) 비교로 고도화 필요.
 */

const MONITOR_TARGETS = [
  {
    provider: "HUG",
    url: "https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp",
    keywords: ["보증한도", "담보인정비율", "보증료", "보증금액"],
  },
  {
    provider: "HF",
    url: "https://www.hf.go.kr/ko/sub02/sub02_05_01.do",
    keywords: ["보증조건", "보증료율", "전세지킴"],
  },
  {
    provider: "SGI",
    url: "https://www.sgic.co.kr/chp/iutm/S5001/S5001T110.do",
    keywords: ["가입조건", "보증료", "전세금"],
  },
];

export async function GET(req: Request) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const changes: string[] = [];

  for (const target of MONITOR_TARGETS) {
    try {
      const res = await fetch(target.url, {
        headers: { "User-Agent": "VESTRA-Monitor/1.0" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        changes.push(`${target.provider}: 페이지 접근 실패 (HTTP ${res.status})`);
        continue;
      }

      const html = await res.text();

      // 간이 변경 감지: 페이지 크기 기반 (정밀 감지는 향후 고도화)
      // 실제로는 이전 스냅샷과 비교하는 방식으로 개선 가능
      const hasKeywords = target.keywords.some((kw) => html.includes(kw));

      if (!hasKeywords) {
        changes.push(`${target.provider}: 주요 키워드가 페이지에서 사라짐 (페이지 구조 변경 가능성)`);
      }

      // TODO: 이전 contentLength와 비교하여 ±10% 이상 변동 시 알림
      // 현재는 키워드 기반 감지만 수행
    } catch {
      changes.push(`${target.provider}: 모니터링 실패 (타임아웃 또는 네트워크 오류)`);
    }
  }

  // 변경 감지 결과는 응답 JSON/로그로만 남긴다 (공지 자동생성 중단 — 상단 주석 참고).
  if (changes.length > 0) {
    console.warn("[CRON:GUARANTEE] 변경 감지(공지 미생성):", changes.join(" | "));
  }

  return NextResponse.json({
    monitored: MONITOR_TARGETS.length,
    changesDetected: changes.length,
    changes,
    timestamp: new Date().toISOString(),
  });
}
