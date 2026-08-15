import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { JEONSE_ANALYSIS_PROMPT } from "@/lib/prompts";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { sanitizeField } from "@/lib/sanitize";
import { auth, ROLE_LIMITS } from "@/lib/auth";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    // 인증 + 역할 기반 제한 (문서 생성은 무거운 OpenAI 작업)
    const session = await auth();
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const userId = session?.user?.id;
    const dailyLimit = session?.user?.dailyLimit || ROLE_LIMITS.GUEST;

    const rl = await rateLimit(`generate-document:${userId || ip}`, 30);
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 이용하세요." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    const body = await req.json();
    const {
      type,
      landlordName: rawLandlord,
      tenantName: rawTenant,
      propertyAddress: rawAddress,
      deposit,
      monthlyRent,
      propertyPrice,
      seniorLiens,
      registrySummary,
      startDate: rawStartDate,
      endDate: rawEndDate,
      propertyType: rawPropertyType,
    } = body;

    // Input sanitization
    const landlordName = sanitizeField(rawLandlord || "", 100);
    const tenantName = sanitizeField(rawTenant || "", 100);
    const propertyAddress = sanitizeField(rawAddress || "", 300);
    const startDate = sanitizeField(rawStartDate || "", 20);
    const endDate = sanitizeField(rawEndDate || "", 20);
    const propertyType = sanitizeField(rawPropertyType || "", 50);

    // Cost Guard (일일 OpenAI 호출 제한)
    const costGuard = await checkOpenAICostGuard(userId || ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 }
      );
    }

    const openai = getOpenAIClient();

    if (type === "analyze") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: JEONSE_ANALYSIS_PROMPT },
          {
            role: "user",
            content: `다음 전세 계약을 분석해주세요:
- 임대인: ${landlordName || "미입력"}
- 임차인: ${tenantName || "미입력"}
- 부동산: ${propertyAddress}
- 유형: ${propertyType}
- 보증금: ${deposit?.toLocaleString()}원
- 주택 시세(매매가): ${propertyPrice ? propertyPrice.toLocaleString() + "원" : "미입력"}
- 선순위 채권액(근저당 등): ${seniorLiens ? seniorLiens.toLocaleString() + "원" : "0원"}
- 전세가율: ${propertyPrice > 0 ? ((deposit / propertyPrice) * 100).toFixed(1) + "%" : "미산출"}
- 월세: ${monthlyRent?.toLocaleString()}원
- 계약기간: ${startDate} ~ ${endDate}
${registrySummary ? `
[등기부등본 파싱 결과]
- 압류 여부: ${registrySummary.hasSeizure ? "있음 ⚠️" : "없음"}
- 가압류 여부: ${registrySummary.hasProvisionalSeizure ? "있음 ⚠️" : "없음"}
- 가처분 여부: ${registrySummary.hasProvisionalDisposition ? "있음 ⚠️" : "없음"}
- 경매개시결정 여부: ${registrySummary.hasAuctionOrder ? "있음 🚨" : "없음"}
- 신탁등기 여부: ${registrySummary.hasTrust ? "있음 ⚠️" : "없음"}
- 활성 갑구 건수: ${registrySummary.activeGapguEntries}건
- 활성 을구 건수: ${registrySummary.activeEulguEntries}건
- 소유권 이전 횟수: ${registrySummary.ownershipTransferCount}회
- 기등록 전세금 합계: ${registrySummary.totalJeonseAmount ? Number(registrySummary.totalJeonseAmount).toLocaleString() + "원" : "없음"}
` : ""}
전세권 설정 필요 여부를 판단하고 JSON 형식으로 응답하세요.`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ error: "AI 응답이 없습니다." }, { status: 500 });
      }

      return NextResponse.json(JSON.parse(content));
    }

    if (type === "jeonse") {
      const fmtDate = (d: string) => {
        if (!d) return "(날짜 기재)";
        const [y, m, day] = d.split("-");
        return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
      };
      const addr = propertyAddress || "(부동산 주소 기재)";
      const content = `전세권설정등기신청

접  수          ____년 ____월 ____일    접수번호

【부동산의 표시】
  소재지: ${addr}

【등기원인과 그 연월일】
  ${fmtDate(startDate)} 설정계약

【등기목적】전세권설정

【전세금】금 ${Number(deposit).toLocaleString()}원

【범    위】건물 전부

【존속기간】${fmtDate(startDate)}부터 ${fmtDate(endDate)}까지

【등기의무자】(임대인)
  성  명: ${landlordName || "(임대인 성명 기재)"}
  주  소: (임대인 주소 기재)
  주민등록번호: ________ - _______

【등기권리자】(전세권자/임차인)
  성  명: (임차인 성명 기재)
  주  소: ${addr}
  주민등록번호: ________ - _______

【첨부서면】
  1. 전세권설정계약서(임대차계약서)  1통
  2. 등기의무자의 인감증명서         1통
  3. 등기의무자의 주소증명서면       1통
  4. 건축물대장                      1통
  5. 등록면허세납부서                1통

                          ____년 ____월 ____일

등기의무자(임대인): ${landlordName || "(임대인 성명)"}   (인)
등기권리자(임차인): (임차인 성명)   (인)

________________________ 등기소 귀중`;
      return NextResponse.json({ title: "전세권설정등기 신청서", content });
    }

    if (type === "lease") {
      const fmtDate = (d: string) => {
        if (!d) return "(날짜 기재)";
        const [y, m, day] = d.split("-");
        return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
      };
      const addr = propertyAddress || "(부동산 주소 기재)";
      const content = `임차권등기명령 신청서

신 청 인(임차인)  성  명: (임차인 성명 기재)
                  주  소: ${addr}
                  연 락 처: (연락처 기재)

피신청인(임대인)  성  명: ${landlordName || "(임대인 성명 기재)"}
                  주  소: (임대인 주소 기재)

신  청  취  지
  별지 목록 기재 부동산에 관하여 임차권등기를 명한다.
  라는 결정을 구합니다.

신  청  이  유
  1. 신청인은 피신청인 소유의 별지목록 기재 부동산에 대하여
     임대차보증금 금 ${Number(deposit).toLocaleString()}원,
     임대차기간 ${fmtDate(startDate)}부터 ${fmtDate(endDate)}까지로
     하는 임대차계약을 체결하였습니다.

  2. 신청인은 위 임대차계약에 따라 임대차보증금 전액을 지급하고
     위 부동산을 인도받아 주민등록을 마쳤습니다.

  3. 임대차기간이 만료되었음에도 피신청인이 임대차보증금을
     반환하지 않으므로, 주택임대차보호법 제3조의3 제1항에 따라
     임차권등기를 신청합니다.

입  증  방  법
  1. 임대차계약서 사본

첨  부  서  류
  1. 임대차계약서 사본           1통
  2. 주민등록등본(또는 초본)     1통
  3. 건물등기사항증명서          1통
  4. 납부서(신청수수료)          1통

                              ____년 ____월 ____일

                  신청인(임차인)  (임차인 성명)   (인)

________________________지방법원 귀중

[별지]
부동산의 표시
  소재지: ${addr}`;
      return NextResponse.json({ title: "임차권등기명령 신청서", content });
    }

    return NextResponse.json({ error: "잘못된 요청 타입입니다." }, { status: 400 });
  } catch (error: unknown) {
    return handleApiError(error, "문서 생성");
  }
}
