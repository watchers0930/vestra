import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * 보증보험 조건 변경 모니터링 (Vercel Cron)
 * ──────────────────────────────────────────
 * 매주 월요일 09:00 KST 실행
 * HUG·HF·SGI 공식 페이지를 fetch하여 주요 키워드 변경을 감지하고,
 * 변경 시 관리자 공지사항에 알림을 자동 생성한다.
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
      const contentLength = html.length;

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

  // 변경 감지 시 공지사항 생성
  if (changes.length > 0) {
    try {
      await prisma.announcement.create({
        data: {
          title: "[자동감지] 보증보험 조건 변경 가능성",
          content:
            `보증보험 공식 사이트에서 변경이 감지되었습니다.\n\n` +
            changes.map((c) => `• ${c}`).join("\n") +
            `\n\n관리자 대시보드 > 보증보험 규칙 탭에서 확인 후 업데이트하세요.\n` +
            `감지일: ${new Date().toISOString().slice(0, 10)}`,
        },
      });
    } catch {
      // 공지사항 생성 실패 시 무시 (로그만)
    }
  }

  return NextResponse.json({
    monitored: MONITOR_TARGETS.length,
    changesDetected: changes.length,
    changes,
    timestamp: new Date().toISOString(),
  });
}
