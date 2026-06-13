/**
 * MOLIT 비아파트 API 키 진단 엔드포인트 (임시)
 * 확인 후 삭제 예정
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const kaptKey = process.env.KAPT_API_KEY;
  const molitKey = process.env.MOLIT_API_KEY;

  const results: Record<string, unknown> = {
    KAPT_API_KEY_set: !!kaptKey,
    KAPT_API_KEY_hint: kaptKey ? kaptKey.substring(0, 8) + "..." : null,
    MOLIT_API_KEY_set: !!molitKey,
    MOLIT_API_KEY_hint: molitKey ? molitKey.substring(0, 8) + "..." : null,
  };

  // singlehouse 매매 테스트 (강남구, 2025년 12월)
  const endpoint = "https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade";
  const serviceKey = kaptKey || molitKey;

  if (serviceKey) {
    try {
      const params = new URLSearchParams({
        serviceKey,
        LAWD_CD: "11680",
        DEAL_YMD: "202512",
        pageNo: "1",
        numOfRows: "3",
      });
      const url = `${endpoint}?${params.toString()}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        headers: { Accept: "application/xml" },
        signal: controller.signal,
      });
      clearTimeout(t);
      const text = await res.text();
      results.singlehouse_status = res.status;
      results.singlehouse_ok = res.ok;
      results.singlehouse_body_preview = text.substring(0, 500);
    } catch (err) {
      results.singlehouse_error = String(err);
    }
  }

  return NextResponse.json(results);
}
