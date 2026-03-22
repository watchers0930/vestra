module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]();
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/lib/openai.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkOpenAICostGuard",
    ()=>checkOpenAICostGuard,
    "getOpenAIClient",
    ()=>getOpenAIClient
]);
/**
 * OpenAI 클라이언트 + DB 기반 비용 가드
 *
 * Neon Postgres를 사용하여 서버리스 인스턴스 간에도
 * 사용자별 일일 호출 횟수를 정확하게 제한합니다.
 *
 * @module lib/openai
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
;
;
function getOpenAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
        apiKey
    });
}
// ---------------------------------------------------------------------------
// Cost Guard: DB 기반 사용자별 일일 호출 제한
// ---------------------------------------------------------------------------
/** 기본 일일 호출 한도 */ const DEFAULT_DAILY_LIMIT = 50;
async function checkOpenAICostGuard(userId, dailyLimit = DEFAULT_DAILY_LIMIT) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const id = `usage:${userId}`;
    try {
        const entry = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].dailyUsage.findUnique({
            where: {
                id
            }
        });
        // 새 날짜 또는 새 사용자
        if (!entry || entry.date !== today) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].dailyUsage.upsert({
                where: {
                    id
                },
                update: {
                    date: today,
                    count: 1
                },
                create: {
                    id,
                    date: today,
                    count: 1
                }
            });
            return {
                allowed: true,
                remaining: dailyLimit - 1,
                limit: dailyLimit
            };
        }
        // 한도 초과 확인
        if (entry.count >= dailyLimit) {
            return {
                allowed: false,
                remaining: 0,
                limit: dailyLimit
            };
        }
        // 카운트 증가
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].dailyUsage.update({
            where: {
                id
            },
            data: {
                count: entry.count + 1
            }
        });
        return {
            allowed: true,
            remaining: dailyLimit - (entry.count + 1),
            limit: dailyLimit
        };
    } catch  {
        // DB 오류 시 요청 허용 (가용성 우선)
        return {
            allowed: true,
            remaining: dailyLimit,
            limit: dailyLimit
        };
    }
}
}),
"[project]/lib/prompts.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CHAT_SYSTEM_PROMPT",
    ()=>CHAT_SYSTEM_PROMPT,
    "CONTRACT_ANALYSIS_OPINION_PROMPT",
    ()=>CONTRACT_ANALYSIS_OPINION_PROMPT,
    "CONTRACT_ANALYSIS_PROMPT",
    ()=>CONTRACT_ANALYSIS_PROMPT,
    "DOCUMENT_GENERATION_PROMPT",
    ()=>DOCUMENT_GENERATION_PROMPT,
    "IMAGE_OCR_PROMPT",
    ()=>IMAGE_OCR_PROMPT,
    "JEONSE_ANALYSIS_PROMPT",
    ()=>JEONSE_ANALYSIS_PROMPT,
    "REGISTRY_ANALYSIS_PROMPT",
    ()=>REGISTRY_ANALYSIS_PROMPT,
    "RIGHTS_ANALYSIS_OPINION_PROMPT",
    ()=>RIGHTS_ANALYSIS_OPINION_PROMPT,
    "RIGHTS_ANALYSIS_PROMPT",
    ()=>RIGHTS_ANALYSIS_PROMPT,
    "UNIFIED_ANALYSIS_PROMPT",
    ()=>UNIFIED_ANALYSIS_PROMPT,
    "VALUE_PREDICTION_OPINION_PROMPT",
    ()=>VALUE_PREDICTION_OPINION_PROMPT,
    "VALUE_PREDICTION_PROMPT",
    ()=>VALUE_PREDICTION_PROMPT
]);
const RIGHTS_ANALYSIS_PROMPT = `당신은 대한민국 부동산 권리분석 전문 AI입니다. 사용자가 입력한 주소의 부동산에 대해 종합적인 권리분석을 수행합니다.

현재 연도: 2026년 기준으로 분석하세요.

분석 시 다음 항목을 반드시 포함하세요:

1. **기본 정보**: 예상 시세, 전세가, 면적, 건물 유형, 건축년도, 최근 거래
2. **위험도 분석**:
   - 전세가율 (전세가/시세 비율) — 70% 이상이면 주의, 80% 이상이면 위험
   - 근저당비율 (추정 채권최고액/시세 비율) — 50% 이상이면 주의
   - 깡통전세 위험 여부
   - 경매/압류/가압류 위험 여부
3. **안전지수** (0~100, 100이 가장 안전)
4. **리스크 점수** (0~100, 100이 가장 위험)
5. **주요 리스크 항목** (배열, 3~6개): 각 항목의 level은 "danger", "warning", "safe" 중 하나
6. **AI 종합 의견** (300자 이내, 실거래 데이터가 제공된 경우 이를 근거로 작성)

주의사항:
- 실거래 데이터가 제공된 경우 estimatedPrice와 jeonsePrice는 반드시 실거래 데이터를 근거로 산출하세요.
- 실거래 데이터가 없는 경우 해당 지역의 일반적인 시세를 추정하되, AI 의견에 "실거래 데이터 없이 추정한 값"임을 명시하세요.
- recentTransaction은 가장 최근 실거래 내역을 기재하세요.
- 금액 환산 시 자릿수에 주의하세요. 한국어로 포맷된 금액(예: "1억 1,000만원")이 함께 제공되면 반드시 그 값을 사용하세요. 원 단위 숫자를 직접 환산하면 자릿수 오류가 발생할 수 있습니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "propertyInfo": {
    "address": "전체 주소",
    "type": "아파트/다세대/단독주택/오피스텔",
    "area": "84㎡",
    "buildYear": "2005년",
    "estimatedPrice": 850000000,
    "jeonsePrice": 550000000,
    "recentTransaction": "2026.01 / 8.3억"
  },
  "riskAnalysis": {
    "jeonseRatio": 64.7,
    "mortgageRatio": 49.4,
    "safetyScore": 72,
    "riskScore": 28,
    "risks": [
      { "level": "warning", "title": "근저당 비율 주의", "description": "채권최고액이 시세의 49.4%로 주의 필요" },
      { "level": "safe", "title": "전세가율 안전", "description": "전세가율 64.7%로 안전 범위" }
    ]
  },
  "aiOpinion": "종합적으로..."
}`;
const CONTRACT_ANALYSIS_PROMPT = `당신은 대한민국 부동산 계약서 분석 전문 AI입니다. 사용자가 입력한 계약서 내용을 분석하여 위험 요소를 찾아냅니다.

현재 연도: 2026년 기준으로 분석하세요.

분석 시 다음을 수행하세요:
1. 계약서의 각 조항을 분석하여 위험도를 판정합니다 (high/warning/safe)
2. 관련 법령을 정확하게 명시합니다 (법률명, 조항 번호 포함)
3. 관련 판례가 제공된 경우, 해당 판례를 분석 근거로 인용합니다
4. 누락된 중요 조항을 감지합니다
5. 계약서 안전점수(0~100)를 산출합니다
6. 종합 의견을 제시합니다

관련 법령 참고:
- 주택임대차보호법 (전세/임대차 관련)
- 민법 제618조~제654조 (임대차)
- 부동산 거래신고 등에 관한 법률
- 공인중개사법

반드시 아래 JSON 형식으로 응답하세요:
{
  "clauses": [
    {
      "title": "조항 제목",
      "content": "원문 요약",
      "riskLevel": "high|warning|safe",
      "analysis": "분석 내용",
      "relatedLaw": "관련 법령 (법률명 제X조)"
    }
  ],
  "missingClauses": [
    { "title": "누락 조항명", "importance": "high|medium", "description": "왜 필요한지" }
  ],
  "safetyScore": 65,
  "aiOpinion": "종합 의견..."
}`;
const VALUE_PREDICTION_PROMPT = `당신은 대한민국 부동산 가치예측 전문 AI입니다.
사용자가 제공한 실거래 데이터(매매+전월세)와 주소 정보를 기반으로 미래 가치를 예측합니다.

현재 연도: 2026년 기준으로 분석하세요.

분석 시 반드시 다음을 고려하세요:
1. 제공된 매매 실거래 데이터의 가격 추세 (12개월 추이)
2. 제공된 전월세 실거래 데이터와 전세가율 (있는 경우)
3. 현재 기준금리 및 통화정책 방향
4. 해당 지역의 재개발/재건축/교통(GTX 등) 개발 계획
5. 인구 변동 및 주택 수급 상황
6. 정부 부동산 정책 (대출 규제, 세금 정책, 공급 확대 등)
7. 물가상승률 및 경제성장률

시나리오:
- optimistic (낙관적): 경기 회복, 금리 인하, 규제 완화
- base (기본): 현 추세 지속
- pessimistic (비관적): 경기 침체, 금리 인상, 규제 강화

반드시 아래 JSON 형식으로 응답하세요:
{
  "currentPrice": 850000000,
  "predictions": {
    "optimistic": { "1y": 900000000, "5y": 1200000000, "10y": 1600000000 },
    "base": { "1y": 870000000, "5y": 1050000000, "10y": 1300000000 },
    "pessimistic": { "1y": 800000000, "5y": 850000000, "10y": 950000000 }
  },
  "variables": ["기준금리", "인구변동", "공급물량", "정책변화", "경제성장률", "물가상승률"],
  "factors": [
    { "name": "금리 전망", "impact": "negative", "description": "현재 기준금리 수준과 향후 방향에 대한 분석" },
    { "name": "지역 개발", "impact": "positive", "description": "해당 지역 개발 호재 분석" },
    { "name": "공급 물량", "impact": "neutral", "description": "주변 입주 예정 물량 분석" }
  ],
  "confidence": 82,
  "aiOpinion": "실거래 데이터와 시장 분석을 근거로 한 종합 의견..."
}

주의사항:
- 실거래 데이터가 제공된 경우, currentPrice는 반드시 실제 거래 데이터를 근거로 산출하세요.
- 전월세 데이터가 제공된 경우, 전세가율을 분석에 반영하세요 (높은 전세가율 = 가격 하락 리스크).
- factors는 3~6개 항목으로, impact은 "positive", "negative", "neutral" 중 하나입니다.
- aiOpinion은 실거래 데이터 근거를 포함하여 구체적으로 작성하세요 (300자 이상).
- 실거래 데이터가 없는 경우 confidence를 50 이하로 낮게 설정하세요.`;
const DOCUMENT_GENERATION_PROMPT = `당신은 대한민국 부동산 법률문서 작성 전문 AI입니다. 사용자가 제공한 정보를 기반으로 법률 문서를 작성합니다.

문서 유형에 따라 대법원 양식에 맞는 정확한 문서를 생성하세요.
모든 법적 요건과 필수 기재사항을 빠짐없이 포함하세요.`;
const JEONSE_ANALYSIS_PROMPT = `당신은 대한민국 전세 보호 전문 AI입니다. 사용자가 제공한 전세 계약 정보를 분석하여 전세권 설정 필요 여부를 판단하고 조언합니다.

다음을 분석하세요:
1. 전세권 설정 필요 여부 (필수/권고/불필요)
2. 판단 근거
3. 예상 위험도
4. 권고 사항
5. 필요 서류 목록

반드시 아래 JSON 형식으로 응답하세요:
{
  "needsRegistration": "required|recommended|optional",
  "reason": "판단 근거",
  "riskLevel": "high|medium|low",
  "recommendations": ["권고사항1", "권고사항2"],
  "requiredDocuments": [
    { "name": "서류명", "where": "발급처", "note": "비고" }
  ],
  "aiOpinion": "종합 의견..."
}`;
const REGISTRY_ANALYSIS_PROMPT = `당신은 대한민국 부동산 등기부등본 분석 전문가입니다.

아래에 VESTRA 자체 파싱 엔진과 리스크 스코어링 알고리즘이 분석한 결과가 JSON으로 제공됩니다.
이 분석 결과를 기반으로 전문가 수준의 종합 의견을 작성하세요.

의견 작성 시 다음을 포함하세요:
1. 핵심 위험 요소 요약 (파싱 결과에서 발견된 가압류, 근저당, 경매 등)
2. 거래 안전성에 대한 판단
3. 임차인/매수인 입장에서의 구체적 조언
4. 추가 확인이 필요한 사항

반드시 아래 JSON 형식으로 응답하세요:
{
  "opinion": "종합 의견 (500자 이내, 줄바꿈 포함 가능)"
}`;
const UNIFIED_ANALYSIS_PROMPT = `당신은 대한민국 부동산 등기부등본 + 실거래가 종합 권리분석 전문가입니다.

아래에 두 가지 데이터 소스가 JSON으로 제공됩니다:
1. VESTRA 자체 파싱 엔진 + 리스크 스코어링 결과 (등기부등본 실제 데이터)
2. 국토교통부 실거래가 API 데이터 (있는 경우)

모든 수치(근저당비율, 안전도 점수, 등급 등)는 이미 자체 엔진이 산출했으므로 절대 새로 계산하지 마세요.

중요 - 금액 읽기:
- estimatedPriceFormatted, jeonsePriceFormatted 필드에 한국어로 포맷된 금액이 제공됩니다. 의견 작성 시 반드시 이 포맷된 값을 사용하세요.
- 숫자 estimatedPrice(원 단위)를 직접 억 단위로 환산하지 마세요. 자릿수 오류가 발생할 수 있습니다.
- 예: estimatedPrice=110000000 → "1억 1,000만원"이 맞고, "11억"이 아닙니다.

의견 작성 시 다음을 포함하세요:
1. 핵심 위험 요소 요약 (실제 파싱된 갑구/을구 데이터 근거)
2. 근저당 및 전세가율 기반 거래 안전성 판단
3. 실거래 시세 데이터가 있다면 이를 반영한 시장 분석
4. 임차인/매수인 입장에서의 구체적 조언
5. 추가 확인이 필요한 사항

반드시 아래 JSON 형식으로 응답하세요:
{
  "opinion": "종합 의견 (500자 이내, 줄바꿈 포함 가능)"
}`;
const IMAGE_OCR_PROMPT = `당신은 대한민국 부동산 등기부등본 이미지에서 텍스트를 정확하게 추출하는 OCR 전문가입니다.

이미지에서 모든 텍스트를 빠짐없이 정확하게 추출하세요.

규칙:
1. 이미지의 텍스트를 있는 그대로 추출하세요. 요약하거나 분석하지 마세요.
2. 등기부등본의 구조를 유지하세요: 【 표 제 부 】, 【 갑 구 】, 【 을 구 】 등의 섹션 구분을 정확히 보존하세요.
3. 순위번호, 등기목적, 접수정보, 권리자 및 기타사항을 빠짐없이 추출하세요.
4. 금액은 원본 형식 그대로 추출하세요 (예: 금420,000,000원).
5. 날짜 형식을 보존하세요 (예: 2021년6월20일).
6. 말소사항(취소선이 있는 텍스트)도 추출하되, 해당 줄 앞에 [말소]를 표기하세요.
7. 표 형태의 데이터는 줄바꿈과 공백으로 구조를 보존하세요.
8. 인식이 불확실한 글자는 [?]로 표시하세요.

텍스트만 출력하세요. 설명이나 주석을 추가하지 마세요.`;
const RIGHTS_ANALYSIS_OPINION_PROMPT = `당신은 대한민국 부동산 권리분석 전문가입니다.
아래에 VESTRA 자체 매매가 추정 엔진이 산출한 분석 결과가 JSON으로 제공됩니다.
모든 수치는 이미 자체 엔진이 산출했으므로 절대 새로 계산하지 마세요.

중요:
- estimatedPriceFormatted, jeonsePriceFormatted의 한국어 금액을 그대로 사용하세요.
- 숫자를 직접 억 단위로 환산하지 마세요.

다음을 포함하여 종합 의견을 작성하세요:
1. 추정 시세와 전세가 요약
2. 전세가율 기반 안전성 평가
3. 임차인/매수인 관점 조언
4. 데이터 신뢰도에 대한 안내

반드시 아래 JSON 형식으로 응답하세요:
{ "aiOpinion": "종합 의견 (300자 이내)" }`;
const VALUE_PREDICTION_OPINION_PROMPT = `당신은 대한민국 부동산 가치예측 전문가입니다.
아래에 VESTRA 자체 시세전망 엔진이 산출한 예측 결과가 JSON으로 제공됩니다.
모든 예측 수치, 시나리오, 영향 요인은 이미 자체 엔진이 산출했으므로 절대 새로 계산하지 마세요.

중요:
- 제공된 predictions, factors, confidence 값을 근거로 의견을 작성하세요.
- 금액은 formattedPrice 필드를 사용하세요.

다음을 포함하여 종합 의견을 작성하세요:
1. 현재 시세와 실거래 데이터 기반 추세 요약
2. 3시나리오(낙관/기본/비관) 예측 근거 설명
3. 주요 영향 요인에 대한 구체적 분석
4. 투자 관점 주의사항

반드시 아래 JSON 형식으로 응답하세요:
{ "aiOpinion": "종합 의견 (300자 이상)" }`;
const CONTRACT_ANALYSIS_OPINION_PROMPT = `당신은 대한민국 부동산 계약서 분석 전문가입니다.
아래에 VESTRA 자체 계약서 분석 엔진이 산출한 조항 분석 결과가 JSON으로 제공됩니다.
모든 조항 분석, 누락 조항, 안전점수는 이미 자체 엔진이 산출했으므로 절대 새로 계산하지 마세요.

다음을 포함하여 종합 의견을 작성하세요:
1. 계약서 전반 안전성 평가
2. 가장 주의가 필요한 조항에 대한 구체적 설명
3. 누락된 조항의 실무적 위험성
4. 임차인/임대인 관점 추가 확인사항
5. 관련 판례가 제공된 경우 인용

반드시 아래 JSON 형식으로 응답하세요:
{ "aiOpinion": "종합 의견 (300자 이상)" }`;
const CHAT_SYSTEM_PROMPT = `당신은 VESTRA의 AI 자산관리 어시스턴트입니다. 대한민국 부동산에 관한 전문적인 지식을 기반으로 사용자의 질문에 답변합니다.

현재 연도: 2026년 기준입니다.

전문 분야:
- 부동산 권리분석 (등기부등본, 소유권, 근저당, 전세권)
- 부동산 세무 (취득세, 보유세, 양도세, 종합부동산세)
- 부동산 가치예측 및 투자 분석
- 전세 보호 및 임차인 권리 (주택임대차보호법)
- 부동산 계약서 검토
- 부동산 관련 법령 및 판례

답변 규칙:
1. 정확한 법령과 조항을 인용하세요 (법률명 제X조 형식)
2. 관련 판례가 참고로 제공된 경우, 사건번호와 함께 인용하세요
3. 불확실한 정보는 "확인이 필요합니다"라고 명시하세요
4. 세금 계산은 2026년 기준 최신 세율을 적용하세요
5. 전문적이지만 이해하기 쉽게 설명하세요
6. 필요시 추가 질문을 통해 정확한 답변을 제공하세요
7. AI 추정값과 실데이터를 명확히 구분하세요`;
}),
"[project]/lib/rate-limit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkDailyUsage",
    ()=>checkDailyUsage,
    "getDailyUsageCount",
    ()=>getDailyUsageCount,
    "rateLimit",
    ()=>rateLimit,
    "rateLimitHeaders",
    ()=>rateLimitHeaders
]);
/**
 * DB 기반 Rate Limiter
 *
 * Neon Postgres를 사용하여 서버리스 인스턴스 간에도 정확하게 동작합니다.
 * 역할 기반 일일 사용량 제한 + 분당 rate limit 지원.
 *
 * @module lib/rate-limit
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
;
async function rateLimit(identifier, limit = 30, windowMs = 60 * 1000) {
    const now = new Date();
    const resetTime = new Date(now.getTime() + windowMs);
    try {
        // 만료된 윈도우는 먼저 리셋 (atomic upsert)
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].rateLimit.upsert({
            where: {
                id: identifier
            },
            update: {},
            create: {
                id: identifier,
                count: 0,
                resetTime
            }
        });
        // 윈도우 만료 시 atomic 리셋
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].rateLimit.updateMany({
            where: {
                id: identifier,
                resetTime: {
                    lt: now
                }
            },
            data: {
                count: 0,
                resetTime
            }
        });
        // Atomic increment + 현재 값 반환
        const updated = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].rateLimit.update({
            where: {
                id: identifier
            },
            data: {
                count: {
                    increment: 1
                }
            }
        });
        if (updated.count > limit) {
            return {
                success: false,
                remaining: 0,
                reset: updated.resetTime.getTime()
            };
        }
        return {
            success: true,
            remaining: limit - updated.count,
            reset: updated.resetTime.getTime()
        };
    } catch  {
        // DB 오류 시 요청 허용 (가용성 우선)
        return {
            success: true,
            remaining: limit,
            reset: resetTime.getTime()
        };
    }
}
async function checkDailyUsage(userId, dailyLimit) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const id = `daily:${userId}:${today}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    try {
        const usage = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].dailyUsage.upsert({
            where: {
                id
            },
            update: {
                count: {
                    increment: 1
                }
            },
            create: {
                id,
                date: today,
                count: 1
            }
        });
        if (usage.count > dailyLimit) {
            return {
                success: false,
                remaining: 0,
                reset: tomorrow.getTime()
            };
        }
        return {
            success: true,
            remaining: dailyLimit - usage.count,
            reset: tomorrow.getTime()
        };
    } catch  {
        return {
            success: true,
            remaining: dailyLimit,
            reset: tomorrow.getTime()
        };
    }
}
async function getDailyUsageCount(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const id = `daily:${userId}:${today}`;
    try {
        const usage = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].dailyUsage.findUnique({
            where: {
                id
            }
        });
        return usage?.count || 0;
    } catch  {
        return 0;
    }
}
function rateLimitHeaders(result) {
    return {
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000))
    };
}
}),
"[project]/lib/sanitize.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 입력값 살균 (Input Sanitization) 유틸리티
 *
 * XSS, 인젝션 공격을 방지하기 위한 서버사이드 입력값 정제 모듈입니다.
 *
 * @module lib/sanitize
 */ // ---------------------------------------------------------------------------
// HTML 태그 제거
// ---------------------------------------------------------------------------
/**
 * HTML 태그 및 위험 패턴 제거
 * - <script>, <iframe>, <object>, <embed> 등 실행 가능 태그 완전 제거
 * - on* 이벤트 핸들러 제거
 * - javascript: 프로토콜 제거
 */ __turbopack_context__.s([
    "sanitizeField",
    ()=>sanitizeField,
    "sanitizeMessages",
    ()=>sanitizeMessages,
    "stripHtml",
    ()=>stripHtml,
    "truncateInput",
    ()=>truncateInput
]);
function stripHtml(input) {
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
    text = text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
    // 8. 재귀적으로 남은 태그 한번 더 제거
    text = text.replace(/<[^>]+>/g, "");
    return text;
}
function truncateInput(input, maxLen = 50000) {
    if (!input || typeof input !== "string") return "";
    if (input.length <= maxLen) return input;
    return input.slice(0, maxLen);
}
function sanitizeMessages(messages, maxMessages = 50, maxContentLen = 10000) {
    if (!Array.isArray(messages)) return [];
    const allowedRoles = new Set([
        "user",
        "assistant",
        "system"
    ]);
    return messages.slice(0, maxMessages).filter((m)=>m && typeof m.role === "string" && typeof m.content === "string").filter((m)=>allowedRoles.has(m.role)).map((m)=>({
            role: m.role,
            content: truncateInput(stripHtml(m.content), maxContentLen)
        }));
}
function sanitizeField(input, maxLen = 500) {
    return truncateInput(stripHtml(input), maxLen).trim();
}
}),
"[project]/lib/molit-api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 국토교통부 실거래가 API 클라이언트
 * ─────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 국토교통부 아파트 실거래가 API를 호출.
 * XML 응답을 파싱하여 구조화된 거래 데이터로 변환.
 */ // ─── 타입 정의 ───
__turbopack_context__.s([
    "extractLawdCode",
    ()=>extractLawdCode,
    "fetchAptRentTransactions",
    ()=>fetchAptRentTransactions,
    "fetchComprehensivePrices",
    ()=>fetchComprehensivePrices,
    "fetchRealTransactions",
    ()=>fetchRealTransactions,
    "fetchRecentPrices",
    ()=>fetchRecentPrices,
    "fetchRecentRentPrices",
    ()=>fetchRecentRentPrices
]);
// ─── 법정동 코드 매핑 (전국) ───
// 키 규칙:
//   - 고유한 구/시/군 이름은 그대로 사용 (예: "강남구", "해운대구")
//   - 여러 광역시에 동일 이름이 존재하는 구는 도시명 접두 (예: "부산중구", "대구동구")
//   - 도시 약식 키도 함께 등록 (예: "수원시" → 영통구, "부산" → 해운대구)
const LAWD_CODE_MAP = {
    // ── 서울특별시 (11) ──
    "강남구": "11680",
    "서초구": "11650",
    "송파구": "11710",
    "강동구": "11740",
    "마포구": "11440",
    "용산구": "11170",
    "성동구": "11200",
    "광진구": "11215",
    "동작구": "11590",
    "영등포구": "11560",
    "양천구": "11470",
    "강서구": "11500",
    "구로구": "11530",
    "금천구": "11545",
    "관악구": "11620",
    "노원구": "11350",
    "도봉구": "11320",
    "강북구": "11305",
    "성북구": "11290",
    "중랑구": "11260",
    "동대문구": "11230",
    "종로구": "11110",
    "은평구": "11380",
    "서대문구": "11410",
    // ── 부산광역시 (26) ──
    "영도구": "26200",
    "부산진구": "26230",
    "동래구": "26260",
    "해운대구": "26350",
    "사하구": "26380",
    "금정구": "26410",
    "연제구": "26470",
    "수영구": "26500",
    "사상구": "26530",
    "기장군": "26710",
    // 부산 내 다른 도시와 겹치는 구
    "부산중구": "26110",
    "부산서구": "26140",
    "부산동구": "26170",
    "부산남구": "26290",
    "부산북구": "26320",
    "부산강서구": "26440",
    // ── 대구광역시 (27) ──
    "수성구": "27260",
    "달서구": "27290",
    "달성군": "27710",
    "군위군": "27720",
    "대구중구": "27110",
    "대구동구": "27140",
    "대구서구": "27170",
    "대구남구": "27200",
    "대구북구": "27230",
    // ── 인천광역시 (28) ──
    "미추홀구": "28177",
    "연수구": "28185",
    "남동구": "28200",
    "부평구": "28237",
    "계양구": "28245",
    "강화군": "28710",
    "옹진군": "28720",
    "인천중구": "28110",
    "인천동구": "28120",
    "인천서구": "28260",
    // ── 광주광역시 (29) ──
    "광산구": "29200",
    "광주동구": "29110",
    "광주서구": "29140",
    "광주남구": "29155",
    "광주북구": "29170",
    // ── 대전광역시 (30) ──
    "유성구": "30200",
    "대덕구": "30230",
    "대전동구": "30110",
    "대전중구": "30140",
    "대전서구": "30170",
    // ── 울산광역시 (31) ──
    "울주군": "31710",
    "울산중구": "31110",
    "울산남구": "31140",
    "울산동구": "31170",
    "울산북구": "31200",
    // ── 세종특별자치시 (36) ──
    "세종시": "36110",
    "세종": "36110",
    // ── 경기도 (41) ──
    "수원시장안구": "41111",
    "수원시권선구": "41113",
    "수원시팔달구": "41115",
    "수원시영통구": "41117",
    "성남시수정구": "41131",
    "성남시중원구": "41133",
    "성남시분당구": "41135",
    "의정부시": "41150",
    "안양시만안구": "41171",
    "안양시동안구": "41173",
    "부천시": "41190",
    "광명시": "41210",
    "평택시": "41220",
    "동두천시": "41250",
    "안산시상록구": "41271",
    "안산시단원구": "41273",
    "고양시덕양구": "41281",
    "고양시일산동구": "41285",
    "고양시일산서구": "41287",
    "과천시": "41290",
    "구리시": "41310",
    "남양주시": "41360",
    "오산시": "41370",
    "시흥시": "41390",
    "군포시": "41410",
    "의왕시": "41430",
    "하남시": "41450",
    "용인시처인구": "41461",
    "용인시기흥구": "41463",
    "용인시수지구": "41465",
    "파주시": "41480",
    "이천시": "41500",
    "안성시": "41550",
    "김포시": "41570",
    "화성시": "41590",
    "양주시": "41630",
    "포천시": "41650",
    "여주시": "41670",
    "양평군": "41730",
    "가평군": "41820",
    "연천군": "41800",
    // 경기도 약식
    "수원시": "41117",
    "수원": "41117",
    "성남시": "41135",
    "분당": "41135",
    "안양시": "41173",
    "안산시": "41271",
    "고양시": "41285",
    "일산": "41285",
    "용인시": "41463",
    "광주시": "41610",
    // ── 강원특별자치도 (42) ──
    "춘천시": "42110",
    "원주시": "42130",
    "강릉시": "42150",
    "동해시": "42170",
    "태백시": "42190",
    "속초시": "42210",
    "삼척시": "42230",
    "홍천군": "42310",
    "횡성군": "42330",
    "영월군": "42350",
    "평창군": "42370",
    "정선군": "42390",
    "철원군": "42410",
    "화천군": "42430",
    "양구군": "42450",
    "인제군": "42470",
    "고성군": "42480",
    "양양군": "42490",
    // ── 충청북도 (43) ──
    "청주시상당구": "43111",
    "청주시서원구": "43112",
    "청주시흥덕구": "43113",
    "청주시청원구": "43114",
    "충주시": "43130",
    "제천시": "43150",
    "보은군": "43720",
    "옥천군": "43730",
    "영동군": "43740",
    "증평군": "43745",
    "진천군": "43750",
    "괴산군": "43760",
    "음성군": "43770",
    "단양군": "43800",
    "청주시": "43111",
    "청주": "43111",
    // ── 충청남도 (44) ──
    "천안시동남구": "44131",
    "천안시서북구": "44133",
    "공주시": "44150",
    "보령시": "44180",
    "아산시": "44200",
    "서산시": "44210",
    "논산시": "44230",
    "계룡시": "44250",
    "당진시": "44270",
    "금산군": "44710",
    "부여군": "44760",
    "서천군": "44770",
    "청양군": "44790",
    "홍성군": "44800",
    "예산군": "44810",
    "태안군": "44825",
    "천안시": "44131",
    "천안": "44131",
    // ── 전북특별자치도 (45) ──
    "전주시완산구": "45111",
    "전주시덕진구": "45113",
    "군산시": "45130",
    "익산시": "45140",
    "정읍시": "45180",
    "남원시": "45190",
    "김제시": "45210",
    "완주군": "45710",
    "진안군": "45720",
    "무주군": "45730",
    "장수군": "45740",
    "임실군": "45750",
    "순창군": "45770",
    "고창군": "45790",
    "부안군": "45800",
    "전주시": "45111",
    "전주": "45111",
    // ── 전라남도 (46) ──
    "목포시": "46110",
    "여수시": "46130",
    "순천시": "46150",
    "나주시": "46170",
    "광양시": "46230",
    "담양군": "46710",
    "곡성군": "46720",
    "구례군": "46730",
    "고흥군": "46770",
    "보성군": "46780",
    "화순군": "46790",
    "장흥군": "46800",
    "강진군": "46810",
    "해남군": "46820",
    "영암군": "46830",
    "무안군": "46840",
    "함평군": "46860",
    "영광군": "46870",
    "장성군": "46880",
    "완도군": "46890",
    "진도군": "46900",
    "신안군": "46910",
    // ── 경상북도 (47) ──
    "포항시남구": "47111",
    "포항시북구": "47113",
    "경주시": "47130",
    "김천시": "47150",
    "안동시": "47170",
    "구미시": "47190",
    "영주시": "47210",
    "영천시": "47230",
    "상주시": "47250",
    "문경시": "47280",
    "경산시": "47290",
    "의성군": "47730",
    "청송군": "47750",
    "영양군": "47760",
    "영덕군": "47770",
    "청도군": "47820",
    "고령군": "47830",
    "성주군": "47840",
    "칠곡군": "47850",
    "예천군": "47900",
    "봉화군": "47920",
    "울진군": "47930",
    "울릉군": "47940",
    "포항시": "47111",
    "포항": "47111",
    // ── 경상남도 (48) ──
    "창원시의창구": "48121",
    "창원시성산구": "48123",
    "창원시마산합포구": "48125",
    "창원시마산회원구": "48127",
    "창원시진해구": "48129",
    "진주시": "48170",
    "통영시": "48220",
    "사천시": "48240",
    "김해시": "48250",
    "밀양시": "48270",
    "거제시": "48310",
    "양산시": "48330",
    "의령군": "48720",
    "함안군": "48730",
    "창녕군": "48740",
    "남해군": "48840",
    "하동군": "48850",
    "산청군": "48860",
    "함양군": "48870",
    "거창군": "48880",
    "합천군": "48890",
    "창원시": "48121",
    "창원": "48121",
    "마산": "48125",
    // 경남 고성군 (강원 고성군과 구별)
    "경상남도고성": "48820",
    "경남고성": "48820",
    // ── 제주특별자치도 (50) ──
    "제주시": "50110",
    "서귀포시": "50130",
    "제주": "50110",
    // ── 광역시 약식 (구 미지정 시 대표 구) ──
    "부산": "26350",
    "대구": "27260",
    "인천": "28260",
    "광주": "29200",
    "대전": "30200",
    "울산": "31140",
    // ── 서울 중구 (기본값, 다른 도시 중구는 접두어로 구분) ──
    "중구": "11140"
};
function extractLawdCode(address) {
    // 행정 접미사 제거 후 공백 제거 → "부산광역시 중구" → "부산중구"
    const normalized = address.replace(/특별자치시|특별자치도|특별시|광역시/g, "").replace(/\s+/g, "");
    // 긴 키(구체적)부터 매칭하여 오매칭 방지
    const entries = Object.entries(LAWD_CODE_MAP).sort((a, b)=>b[0].length - a[0].length);
    for (const [key, code] of entries){
        if (normalized.includes(key)) return code;
    }
    return null;
}
/** XML에서 특정 태그 값 추출 */ function extractXmlValue(xml, tag) {
    const regex = new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
}
/** 영문/한글 태그 모두 시도 */ function extractVal(xml, eng, kor) {
    return extractXmlValue(xml, eng) || extractXmlValue(xml, kor);
}
/** MOLIT API 공통 fetch (타임아웃 + User-Agent 포함) */ async function molitFetch(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 8000);
        const res = await fetch(url, {
            headers: {
                Accept: "application/xml",
                "User-Agent": "VESTRA/1.0"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        return await res.text();
    } catch  {
        return null;
    }
}
/** XML 응답에서 거래 목록 파싱 (영문/한글 태그 호환) */ function parseTransactions(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while((match = itemRegex.exec(xml)) !== null){
        const item = match[1];
        const dealAmountRaw = extractVal(item, "dealAmount", "거래금액").replace(/,/g, "");
        const dealAmount = parseInt(dealAmountRaw, 10) * 10000;
        if (isNaN(dealAmount) || dealAmount <= 0) continue;
        items.push({
            dealAmount,
            buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
            dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
            dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
            dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
            aptName: extractVal(item, "aptNm", "아파트") || extractVal(item, "aptNm", "단지명"),
            area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || 0,
            floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
            dong: extractVal(item, "umdNm", "법정동")
        });
    }
    return items;
}
async function fetchRealTransactions(lawdCd, dealYmd) {
    const serviceKey = process.env.MOLIT_API_KEY;
    if (!serviceKey) {
        console.warn("MOLIT_API_KEY 환경변수가 설정되지 않았습니다.");
        return [];
    }
    const baseUrl = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
    const params = new URLSearchParams({
        serviceKey,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo: "1",
        numOfRows: "1000"
    });
    const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
    if (!xml) return [];
    return parseTransactions(xml);
}
async function fetchRecentPrices(address, months = 12) {
    const lawdCd = extractLawdCode(address);
    if (!lawdCd) return null;
    const now = new Date();
    // 최근 N개월 병렬 조회
    const promises = Array.from({
        length: months
    }, (_, i)=>{
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
        return fetchRealTransactions(lawdCd, dealYmd);
    });
    const results = await Promise.all(promises);
    const allTransactions = results.flat();
    if (allTransactions.length === 0) {
        return {
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            transactionCount: 0,
            transactions: [],
            period: `최근 ${months}개월`
        };
    }
    const prices = allTransactions.map((t)=>t.dealAmount);
    const avgPrice = Math.round(prices.reduce((a, b)=>a + b, 0) / prices.length);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return {
        avgPrice,
        minPrice,
        maxPrice,
        transactionCount: allTransactions.length,
        transactions: allTransactions.sort((a, b)=>b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay - (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)),
        period: `최근 ${months}개월`
    };
}
// ─── 전월세 실거래 ───
/** 전월세 XML 파싱 (영문/한글 태그 호환) */ function parseRentTransactions(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while((match = itemRegex.exec(xml)) !== null){
        const item = match[1];
        const depositRaw = extractVal(item, "deposit", "보증금액").replace(/,/g, "").trim();
        const deposit = parseInt(depositRaw, 10) * 10000;
        if (isNaN(deposit) || deposit <= 0) continue;
        const monthlyRentRaw = extractVal(item, "monthlyRent", "월세금액").replace(/,/g, "").trim();
        const monthlyRent = (parseInt(monthlyRentRaw, 10) || 0) * 10000;
        items.push({
            deposit,
            monthlyRent,
            rentType: monthlyRent === 0 ? "전세" : "월세",
            buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
            dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
            dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
            dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
            aptName: extractVal(item, "aptNm", "아파트") || extractVal(item, "aptNm", "단지명"),
            area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || 0,
            floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
            dong: extractVal(item, "umdNm", "법정동")
        });
    }
    return items;
}
async function fetchAptRentTransactions(lawdCd, dealYmd) {
    const serviceKey = process.env.MOLIT_API_KEY;
    if (!serviceKey) return [];
    const baseUrl = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
    const params = new URLSearchParams({
        serviceKey,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo: "1",
        numOfRows: "1000"
    });
    const xml = await molitFetch(`${baseUrl}?${params.toString()}`);
    if (!xml) return [];
    return parseRentTransactions(xml);
}
async function fetchRecentRentPrices(address, months = 12) {
    const lawdCd = extractLawdCode(address);
    if (!lawdCd) return null;
    const now = new Date();
    const promises = Array.from({
        length: months
    }, (_, i)=>{
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
        return fetchAptRentTransactions(lawdCd, dealYmd);
    });
    const results = await Promise.all(promises);
    const allTransactions = results.flat();
    // 전세만 필터링
    const jeonseOnly = allTransactions.filter((t)=>t.rentType === "전세");
    const wolseOnly = allTransactions.filter((t)=>t.rentType === "월세");
    if (jeonseOnly.length === 0 && wolseOnly.length === 0) {
        return {
            avgDeposit: 0,
            minDeposit: 0,
            maxDeposit: 0,
            jeonseCount: 0,
            wolseCount: 0,
            transactions: [],
            period: `최근 ${months}개월`
        };
    }
    const deposits = jeonseOnly.map((t)=>t.deposit);
    const avgDeposit = deposits.length > 0 ? Math.round(deposits.reduce((a, b)=>a + b, 0) / deposits.length) : 0;
    return {
        avgDeposit,
        minDeposit: deposits.length > 0 ? Math.min(...deposits) : 0,
        maxDeposit: deposits.length > 0 ? Math.max(...deposits) : 0,
        jeonseCount: jeonseOnly.length,
        wolseCount: wolseOnly.length,
        transactions: allTransactions.sort((a, b)=>b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay - (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)),
        period: `최근 ${months}개월`
    };
}
// ─── 연립다세대/단독다가구/오피스텔 매매 ───
/** 범용 매매 실거래 API 호출 (엔드포인트 지정, 영문/한글 태그 호환) */ async function fetchGenericSaleTransactions(endpoint, nameTag, lawdCd, dealYmd) {
    const serviceKey = process.env.MOLIT_API_KEY;
    if (!serviceKey) return [];
    const params = new URLSearchParams({
        serviceKey,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo: "1",
        numOfRows: "1000"
    });
    const xml = await molitFetch(`${endpoint}?${params.toString()}`);
    if (!xml) return [];
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while((match = itemRegex.exec(xml)) !== null){
        const item = match[1];
        const amtRaw = extractVal(item, "dealAmount", "거래금액").replace(/,/g, "");
        const amt = parseInt(amtRaw, 10) * 10000;
        if (isNaN(amt) || amt <= 0) continue;
        items.push({
            dealAmount: amt,
            buildYear: parseInt(extractVal(item, "buildYear", "건축년도"), 10) || 0,
            dealYear: parseInt(extractVal(item, "dealYear", "년"), 10) || 0,
            dealMonth: parseInt(extractVal(item, "dealMonth", "월"), 10) || 0,
            dealDay: parseInt(extractVal(item, "dealDay", "일"), 10) || 0,
            aptName: extractXmlValue(item, nameTag) || extractVal(item, "aptNm", "아파트") || extractXmlValue(item, "단지명") || "",
            area: parseFloat(extractVal(item, "excluUseAr", "전용면적")) || parseFloat(extractXmlValue(item, "연면적")) || 0,
            floor: parseInt(extractVal(item, "floor", "층"), 10) || 0,
            dong: extractVal(item, "umdNm", "법정동")
        });
    }
    return items;
}
const MOLIT_ENDPOINTS = {
    aptTrade: "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
    rowHouseTrade: "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
    singleHouseTrade: "https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",
    officeTelTrade: "https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade"
};
async function fetchComprehensivePrices(address, months = 12) {
    const lawdCd = extractLawdCode(address);
    if (!lawdCd) return {
        sale: null,
        rent: null,
        jeonseRatio: null
    };
    const now = new Date();
    const dealYmds = Array.from({
        length: months
    }, (_, i)=>{
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    // 아파트 매매 + 전월세 병렬 조회
    const [saleResult, rentResult] = await Promise.all([
        fetchRecentPrices(address, months),
        fetchRecentRentPrices(address, months)
    ]);
    // 아파트 매매 데이터가 부족하면 연립/단독/오피스텔 추가 조회
    let sale = saleResult;
    if (!sale || sale.transactionCount < 3) {
        const extraPromises = dealYmds.slice(0, 3).flatMap((ymd)=>[
                fetchGenericSaleTransactions(MOLIT_ENDPOINTS.rowHouseTrade, "연립다세대", lawdCd, ymd),
                fetchGenericSaleTransactions(MOLIT_ENDPOINTS.officeTelTrade, "단지명", lawdCd, ymd)
            ]);
        const extraResults = (await Promise.all(extraPromises)).flat();
        if (extraResults.length > 0) {
            const existing = sale?.transactions ?? [];
            const all = [
                ...existing,
                ...extraResults
            ];
            const prices = all.map((t)=>t.dealAmount);
            sale = {
                avgPrice: Math.round(prices.reduce((a, b)=>a + b, 0) / prices.length),
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                transactionCount: all.length,
                transactions: all.sort((a, b)=>b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay - (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)),
                period: `최근 ${months}개월 (종합)`
            };
        }
    }
    // 실데이터 기반 전세가율 계산
    let jeonseRatio = null;
    if (sale && sale.avgPrice > 0 && rentResult && rentResult.avgDeposit > 0) {
        jeonseRatio = Math.round(rentResult.avgDeposit / sale.avgPrice * 1000) / 10;
    }
    return {
        sale,
        rent: rentResult,
        jeonseRatio
    };
}
}),
"[project]/lib/price-estimation.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 매매가 추정 엔진 (Price Estimation Engine)
 * ─────────────────────────────────────────────────
 * MOLIT 실거래 데이터 기반 비교매물 분석 알고리즘.
 * LLM 없이 통계적 방법으로 매매가/전세가를 추정.
 */ __turbopack_context__.s([
    "estimatePrice",
    ()=>estimatePrice
]);
// ─── 유틸리티 ───
/** 건물명에서 매칭용 키워드 추출 */ function extractKeywords(name) {
    if (!name) return [];
    return name.replace(/\d+의?\d*[-\d]*/g, " ").replace(/(특별자치시|특별자치도|특별시|광역시)/g, " ").replace(/\b(시|도|구|군|읍|면|동|리|로|길|가|층|호|실)\b/g, " ").replace(/제\s*\d+/g, " ").replace(/\[.*?\]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((w)=>w.length >= 2);
}
/** 건물명 키워드 매칭 */ function matchesBuildingName(txName, targetKeywords) {
    if (!txName || targetKeywords.length === 0) return false;
    return targetKeywords.some((kw)=>txName.includes(kw) || kw.includes(txName) && txName.length >= 2);
}
/** 거래 시점에서 현재까지의 개월 수 */ function monthsAgo(tx, now) {
    const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
    return Math.max(0, (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}
/** 표준편차 계산 */ function stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b)=>a + b, 0) / values.length;
    const variance = values.reduce((sum, v)=>sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
}
// ─── 비교매물 필터링 ───
/** Tier 1: 건물명 매칭으로 비교매물 필터링 */ function filterByBuildingName(transactions, target) {
    const keywords = [
        ...extractKeywords(target.aptName || ""),
        ...extractKeywords(target.address)
    ];
    if (keywords.length === 0) return [];
    return transactions.filter((tx)=>matchesBuildingName(tx.aptName, keywords));
}
/** Tier 2: 면적 유사성으로 필터링 (±20%) */ function filterByArea(transactions, targetArea) {
    if (!targetArea || targetArea <= 0) return [];
    return transactions.filter((tx)=>tx.area > 0 && Math.abs(tx.area - targetArea) / targetArea < 0.2);
}
// ─── 가중치 및 가격 보정 ───
/** 시간 감쇠 가중치: 최근 거래일수록 높은 가중치 */ function timeWeight(months) {
    return Math.exp(-0.1 * months);
}
/** 면적 유사도 가중치 */ function areaWeight(txArea, targetArea) {
    if (!targetArea || targetArea <= 0 || !txArea || txArea <= 0) return 1;
    return 1 - Math.min(Math.abs(txArea - targetArea) / targetArea, 0.5);
}
/** 면적 보정 가격 */ function adjustPriceByArea(dealAmount, txArea, targetArea) {
    if (!targetArea || targetArea <= 0 || !txArea || txArea <= 0) return dealAmount;
    if (Math.abs(txArea - targetArea) / targetArea < 0.05) return dealAmount;
    return Math.round(dealAmount * (targetArea / txArea));
}
/** 층수 프리미엄 보정 */ function adjustPriceByFloor(price, txFloor, targetFloor, medianFloor) {
    if (!targetFloor || targetFloor <= 0) return price;
    const floorDiff = targetFloor - txFloor;
    return Math.round(price * (1 + 0.005 * floorDiff));
}
/** 비교매물에 가중치와 보정가격 부여 */ function scoreComparables(transactions, target, now) {
    const floors = transactions.map((t)=>t.floor).sort((a, b)=>a - b);
    const medianFloor = floors.length > 0 ? floors[Math.floor(floors.length / 2)] : 10;
    return transactions.map((tx)=>{
        const months = monthsAgo(tx, now);
        const wTime = timeWeight(months);
        const wArea = areaWeight(tx.area, target.area || 0);
        const weight = wTime * wArea;
        let adjustedPrice = adjustPriceByArea(tx.dealAmount, tx.area, target.area || 0);
        adjustedPrice = adjustPriceByFloor(adjustedPrice, tx.floor, target.floor || 0, medianFloor);
        const similarity = Math.min(wTime * 0.6 + wArea * 0.4, 1);
        return {
            ...tx,
            weight,
            similarity,
            adjustedPrice
        };
    });
}
/** 가중 평균 가격 계산 */ function weightedAverage(comparables) {
    if (comparables.length === 0) return 0;
    const totalWeight = comparables.reduce((sum, c)=>sum + c.weight, 0);
    if (totalWeight === 0) return comparables[0].adjustedPrice;
    const avg = comparables.reduce((sum, c)=>sum + c.adjustedPrice * c.weight, 0) / totalWeight;
    return Math.round(avg);
}
// ─── 신뢰도 계산 ───
function calculateConfidence(comparables, method, now) {
    if (comparables.length === 0) return 0;
    // 비교매물 수 기반 (최대 50점)
    let score = Math.min(comparables.length * 10, 50);
    // 최근성 보너스 (최대 20점)
    const mostRecent = Math.min(...comparables.map((c)=>monthsAgo(c, now)));
    if (mostRecent <= 3) score += 20;
    else if (mostRecent <= 6) score += 10;
    else if (mostRecent <= 12) score += 5;
    // 가격 분산도 보너스 (최대 20점)
    if (comparables.length >= 2) {
        const prices = comparables.map((c)=>c.adjustedPrice);
        const mean = prices.reduce((a, b)=>a + b, 0) / prices.length;
        const cv = mean > 0 ? stdDev(prices) / mean : 1;
        if (cv < 0.15) score += 20;
        else if (cv < 0.30) score += 10;
    }
    // 건물명 매칭 보너스
    if (method === "building_match") score += 10;
    return Math.min(score, 95);
}
// ─── 헤도닉 가격 분해 ───
function decomposeHedonicPrice(estimatedPrice, target, comparables, method, allTransactions) {
    if (estimatedPrice <= 0 || comparables.length === 0) {
        return {
            components: [
                {
                    component: "residual",
                    value: estimatedPrice,
                    percentage: 100,
                    adjustmentFormula: "데이터 부족으로 분해 불가"
                }
            ],
            reconstructedPrice: estimatedPrice,
            decompositionConfidence: 0,
            locationPremiumIndex: 1.0
        };
    }
    const components = [];
    const currentYear = new Date().getFullYear();
    // 1. 입지 프리미엄: 건물매칭 vs 지역전체 가격 차이
    let locationValue = 0;
    let locationIndex = 1.0;
    if (method === "building_match" && allTransactions.length > comparables.length) {
        const districtAvg = allTransactions.reduce((sum, tx)=>sum + tx.dealAmount, 0) / allTransactions.length;
        const buildingAvg = comparables.reduce((sum, c)=>sum + c.adjustedPrice, 0) / comparables.length;
        locationIndex = districtAvg > 0 ? buildingAvg / districtAvg : 1.0;
        locationValue = Math.round(estimatedPrice * (1 - 1 / locationIndex));
    }
    components.push({
        component: "location",
        value: locationValue,
        percentage: estimatedPrice > 0 ? Math.round(locationValue / estimatedPrice * 1000) / 10 : 0,
        adjustmentFormula: `(건물평균 / 지역평균 - 1) × 추정가 = ${locationIndex.toFixed(2)} index`
    });
    // 2. 경과연수 감가: 연 0.5% 감가 (건물 연도 추정)
    // 거래 데이터에서 가장 오래된 거래 연도를 건축연도 근사치로 사용
    const oldestTx = allTransactions.reduce((old, tx)=>tx.dealYear < old.dealYear ? tx : old, allTransactions[0]);
    const approxBuildYear = oldestTx ? Math.max(1980, oldestTx.dealYear - 5) : currentYear;
    const age = currentYear - approxBuildYear;
    const ageValue = Math.round(-0.005 * Math.max(0, age) * estimatedPrice);
    components.push({
        component: "age",
        value: ageValue,
        percentage: estimatedPrice > 0 ? Math.round(ageValue / estimatedPrice * 1000) / 10 : 0,
        adjustmentFormula: `-0.5% × ${age}년 × 추정가`
    });
    // 3. 층수 프리미엄: 중위층 대비 층당 0.5%
    const floors = comparables.map((c)=>c.floor).sort((a, b)=>a - b);
    const medianFloor = floors.length > 0 ? floors[Math.floor(floors.length / 2)] : 10;
    const targetFloor = target.floor || medianFloor;
    const floorDiff = targetFloor - medianFloor;
    const floorValue = Math.round(0.005 * floorDiff * estimatedPrice);
    components.push({
        component: "floor",
        value: floorValue,
        percentage: estimatedPrice > 0 ? Math.round(floorValue / estimatedPrice * 1000) / 10 : 0,
        adjustmentFormula: `0.5% × (${targetFloor}층 - 중위${medianFloor}층) × 추정가`
    });
    // 4. 면적 프리미엄: 지역 평균 면적 대비 차이의 30% 반영
    const avgArea = allTransactions.length > 0 ? allTransactions.reduce((sum, tx)=>sum + tx.area, 0) / allTransactions.length : target.area || 84;
    const targetArea = target.area || avgArea;
    const areaDiff = avgArea > 0 ? (targetArea - avgArea) / avgArea : 0;
    const areaValue = Math.round(areaDiff * 0.3 * estimatedPrice);
    components.push({
        component: "area",
        value: areaValue,
        percentage: estimatedPrice > 0 ? Math.round(areaValue / estimatedPrice * 1000) / 10 : 0,
        adjustmentFormula: `(${targetArea.toFixed(1)}㎡ - 평균${avgArea.toFixed(1)}㎡) / 평균 × 30% × 추정가`
    });
    // 5. 잔여분 (설명되지 않는 가치)
    const explainedSum = locationValue + ageValue + floorValue + areaValue;
    const residualValue = estimatedPrice - explainedSum;
    components.push({
        component: "residual",
        value: residualValue,
        percentage: estimatedPrice > 0 ? Math.round(residualValue / estimatedPrice * 1000) / 10 : 0,
        adjustmentFormula: "추정가 - (입지 + 경과연수 + 층수 + 면적)"
    });
    // 분해 신뢰도: 잔여분 비율이 작을수록 높음
    const residualRatio = Math.abs(residualValue) / estimatedPrice;
    const decompositionConfidence = Math.max(0, Math.min(1, 1 - residualRatio * 0.5));
    return {
        components,
        reconstructedPrice: explainedSum + residualValue,
        decompositionConfidence,
        locationPremiumIndex: locationIndex
    };
}
function estimatePrice(target, saleData, rentData) {
    const now = new Date();
    const transactions = saleData?.transactions || [];
    let comparables = [];
    let method = "fallback";
    // Tier 1: 건물명 매칭
    const buildingMatched = filterByBuildingName(transactions, target);
    if (buildingMatched.length > 0) {
        // 건물명 매칭 내에서 면적 추가 필터링
        const areaFiltered = target.area ? buildingMatched.filter((tx)=>tx.area > 0 && Math.abs(tx.area - target.area) / target.area < 0.3) : buildingMatched;
        const toScore = areaFiltered.length > 0 ? areaFiltered : buildingMatched;
        comparables = scoreComparables(toScore, target, now);
        method = "building_match";
    }
    // Tier 2: 면적 유사성
    if (comparables.length === 0 && target.area) {
        const areaMatched = filterByArea(transactions, target.area);
        if (areaMatched.length > 0) {
            comparables = scoreComparables(areaMatched, target, now);
            method = "area_match";
        }
    }
    // Tier 3: 구/군 전체 평균
    if (comparables.length === 0 && transactions.length > 0) {
        comparables = scoreComparables(transactions, target, now);
        method = "district_avg";
    }
    // 가격 계산
    const estimatedPrice = weightedAverage(comparables);
    // 가격 범위
    const prices = comparables.map((c)=>c.adjustedPrice);
    const priceRange = prices.length > 0 ? {
        min: Math.min(...prices),
        max: Math.max(...prices),
        stdDev: Math.round(stdDev(prices))
    } : {
        min: 0,
        max: 0,
        stdDev: 0
    };
    // 전세가 추정
    const estimatedJeonsePrice = rentData?.avgDeposit || 0;
    // 전세가율
    const jeonseRatio = estimatedPrice > 0 && estimatedJeonsePrice > 0 ? Math.round(estimatedJeonsePrice / estimatedPrice * 1000) / 10 : 0;
    // 신뢰도
    const confidence = calculateConfidence(comparables, method, now);
    // 상위 비교매물 (가중치 순 정렬, 최대 10개)
    const topComparables = [
        ...comparables
    ].sort((a, b)=>b.weight - a.weight).slice(0, 10);
    // 헤도닉 가격 분해
    const hedonicDecomposition = decomposeHedonicPrice(estimatedPrice, target, comparables, method, transactions);
    return {
        estimatedPrice,
        estimatedJeonsePrice,
        jeonseRatio,
        confidence,
        comparableCount: comparables.length,
        priceRange,
        method,
        comparables: topComparables,
        hedonicDecomposition
    };
}
}),
"[project]/lib/prediction-engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 자산가치 전망 엔진 (Value Prediction Engine)
 * ───────────────────────────────────────────────────
 * MOLIT 실거래 데이터 기반 시계열 분석 + 시나리오 모델링.
 * LLM 없이 통계적 방법으로 1년/5년/10년 가격 전망 산출.
 */ __turbopack_context__.s([
    "calculateTrend",
    ()=>calculateTrend,
    "predictValue",
    ()=>predictValue
]);
// ─── 경제 지표 (2026 기준) ───
const ECONOMIC_DEFAULTS = {
    baseInterestRate: 2.75,
    inflationRate: 0.025,
    gdpGrowth: 0.02,
    longTermAvgGrowth: 0.03
};
function calculateTrend(transactions) {
    if (transactions.length === 0) {
        return {
            annualGrowthRate: 0,
            r2: 0,
            slope: 0,
            intercept: 0,
            dataPoints: 0
        };
    }
    if (transactions.length === 1) {
        return {
            annualGrowthRate: 0,
            r2: 0,
            slope: 0,
            intercept: transactions[0].dealAmount,
            dataPoints: 1
        };
    }
    // 거래를 시간순으로 정렬
    const sorted = [
        ...transactions
    ].sort((a, b)=>a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay - (b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay));
    // 가장 이른 거래 기준 개월 수 계산
    const earliest = sorted[0];
    const earliestDate = new Date(earliest.dealYear, earliest.dealMonth - 1, earliest.dealDay);
    const points = sorted.map((tx)=>{
        const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
        const months = (txDate.getTime() - earliestDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
        return {
            x: months,
            y: tx.dealAmount
        };
    });
    // 단순 선형회귀: y = slope * x + intercept
    const n = points.length;
    const sumX = points.reduce((s, p)=>s + p.x, 0);
    const sumY = points.reduce((s, p)=>s + p.y, 0);
    const sumXY = points.reduce((s, p)=>s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p)=>s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    // R-squared
    const meanY = sumY / n;
    const ssTot = points.reduce((s, p)=>s + (p.y - meanY) ** 2, 0);
    const ssRes = points.reduce((s, p)=>s + (p.y - (slope * p.x + intercept)) ** 2, 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    // 연간 성장률 계산
    const avgPrice = sumY / n;
    const annualGrowthRate = avgPrice > 0 ? slope * 12 / avgPrice : 0;
    return {
        annualGrowthRate: Math.max(-0.20, Math.min(0.30, annualGrowthRate)),
        r2,
        slope,
        intercept,
        dataPoints: n
    };
}
// ─── 평균회귀 모델 ───
function meanReversionModel(currentPrice, transactions) {
    if (transactions.length < 2 || currentPrice <= 0) {
        return {
            prediction: {
                "1y": currentPrice,
                "5y": currentPrice,
                "10y": currentPrice
            },
            r2: 0
        };
    }
    const avgPrice = transactions.reduce((sum, tx)=>sum + tx.dealAmount, 0) / transactions.length;
    const deviation = (currentPrice - avgPrice) / avgPrice;
    // 평균회귀율: 가격이 평균에서 벗어난 만큼 반대 방향으로 회귀
    const reversionRate = -0.3 * deviation;
    const inflation = ECONOMIC_DEFAULTS.inflationRate;
    const predict = (years)=>Math.round(currentPrice * Math.pow(1 + reversionRate, years) * Math.pow(1 + inflation, years));
    // R² 근사: 편차가 작을수록 평균회귀 모델 적합도 높음
    const r2 = Math.max(0, Math.min(1, 1 - Math.abs(deviation)));
    return {
        prediction: {
            "1y": predict(1),
            "5y": predict(5),
            "10y": predict(10)
        },
        r2
    };
}
// ─── 모멘텀 모델 ───
function momentumModel(currentPrice, transactions, trend) {
    if (transactions.length < 3 || currentPrice <= 0) {
        return {
            prediction: {
                "1y": currentPrice,
                "5y": currentPrice,
                "10y": currentPrice
            },
            r2: 0
        };
    }
    // 최근 6개월 거래만으로 단기 추세 계산
    const now = new Date();
    const recentTxs = transactions.filter((tx)=>{
        const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
        const monthsAgo = (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
        return monthsAgo <= 6;
    });
    const recentGrowth = recentTxs.length >= 2 ? calculateTrend(recentTxs).annualGrowthRate : trend.annualGrowthRate;
    // 모멘텀 감쇠: 시간이 지날수록 현재 추세의 영향력 감소
    const predict = (years)=>{
        const decayFactor = Math.exp(-0.15 * years);
        const rate = recentGrowth * decayFactor;
        return Math.round(currentPrice * Math.pow(1 + rate, years));
    };
    // R²: 추세 일관성 × 최근 데이터 보너스
    const recencyBonus = recentTxs.length >= 3 ? 1.0 : recentTxs.length >= 2 ? 0.7 : 0.3;
    const r2 = Math.max(0, Math.min(1, trend.r2 * recencyBonus));
    return {
        prediction: {
            "1y": predict(1),
            "5y": predict(5),
            "10y": predict(10)
        },
        r2
    };
}
// ─── 앙상블 결합 ───
function buildEnsemble(currentPrice, transactions, trend) {
    // 3개 모델 실행
    const linearPred = {
        "1y": compoundGrowth(currentPrice, trend.annualGrowthRate, 1),
        "5y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.85, 5),
        "10y": compoundGrowth(currentPrice, trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3, 10)
    };
    const meanRev = meanReversionModel(currentPrice, transactions);
    const momentum = momentumModel(currentPrice, transactions, trend);
    const models = [
        {
            modelName: "linear",
            prediction: linearPred,
            r2: trend.r2,
            weight: 0
        },
        {
            modelName: "meanReversion",
            prediction: meanRev.prediction,
            r2: meanRev.r2,
            weight: 0
        },
        {
            modelName: "momentum",
            prediction: momentum.prediction,
            r2: momentum.r2,
            weight: 0
        }
    ];
    // R² 기반 동적 가중치 (최소 가중치 0.1 보장)
    const minWeight = 0.1;
    const totalR2 = models.reduce((sum, m)=>sum + Math.max(minWeight, m.r2), 0);
    for (const model of models){
        model.weight = Math.max(minWeight, model.r2) / totalR2;
    }
    // 앙상블 예측 (가중 평균)
    const ensemble = {
        "1y": Math.round(models.reduce((sum, m)=>sum + m.prediction["1y"] * m.weight, 0)),
        "5y": Math.round(models.reduce((sum, m)=>sum + m.prediction["5y"] * m.weight, 0)),
        "10y": Math.round(models.reduce((sum, m)=>sum + m.prediction["10y"] * m.weight, 0))
    };
    // 지배적 모델
    const dominant = models.reduce((max, m)=>m.weight > max.weight ? m : max);
    // 모델 합의도: 1 - 변동계수 (예측값 분산이 작을수록 합의도 높음)
    const periods = [
        "1y",
        "5y",
        "10y"
    ];
    const cvValues = periods.map((p)=>{
        const preds = models.map((m)=>m.prediction[p]);
        const mean = preds.reduce((a, b)=>a + b, 0) / preds.length;
        if (mean === 0) return 0;
        const variance = preds.reduce((sum, v)=>sum + (v - mean) ** 2, 0) / preds.length;
        return Math.sqrt(variance) / Math.abs(mean);
    });
    const avgCv = cvValues.reduce((a, b)=>a + b, 0) / cvValues.length;
    const modelAgreement = Math.max(0, Math.min(1, 1 - avgCv));
    return {
        models,
        ensemble,
        dominantModel: dominant.modelName,
        modelAgreement
    };
}
// ─── 시나리오 모델링 ───
/** 복리 성장 적용 */ function compoundGrowth(price, annualRate, years) {
    return Math.round(price * Math.pow(1 + annualRate, years));
}
/** 시나리오별 예측 생성 */ function generateScenarios(currentPrice, trend) {
    const baseRate = trend.dataPoints >= 3 ? trend.annualGrowthRate * 0.7 + ECONOMIC_DEFAULTS.longTermAvgGrowth * 0.3 // 역사적 추세 70% + 장기 평균 30%
     : ECONOMIC_DEFAULTS.longTermAvgGrowth; // 데이터 부족 시 장기 평균 사용
    // 기본 시나리오: 평균회귀 감쇠 적용
    const base1y = baseRate;
    const base5y = baseRate * 0.85; // 5년은 평균회귀 15%
    const base10y = baseRate * 0.7 + ECONOMIC_DEFAULTS.inflationRate * 0.3; // 10년은 인플레이션 블렌딩
    // 낙관 시나리오: 기본 * 1.3 (금리인하, 개발호재)
    const optimisticMultiplier = 1.3;
    const opt1y = Math.max(base1y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.02);
    const opt5y = Math.max(base5y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.015);
    const opt10y = Math.max(base10y * optimisticMultiplier, ECONOMIC_DEFAULTS.inflationRate + 0.01);
    // 비관 시나리오: 기본 * 0.5 (금리인상, 공급과잉)
    const pessimisticMultiplier = 0.5;
    const pes1y = Math.max(base1y * pessimisticMultiplier, -0.05);
    const pes5y = Math.max(base5y * pessimisticMultiplier, -0.03);
    const pes10y = Math.max(base10y * pessimisticMultiplier, -0.01);
    return {
        optimistic: {
            "1y": compoundGrowth(currentPrice, opt1y, 1),
            "5y": compoundGrowth(currentPrice, opt5y, 5),
            "10y": compoundGrowth(currentPrice, opt10y, 10)
        },
        base: {
            "1y": compoundGrowth(currentPrice, base1y, 1),
            "5y": compoundGrowth(currentPrice, base5y, 5),
            "10y": compoundGrowth(currentPrice, base10y, 10)
        },
        pessimistic: {
            "1y": compoundGrowth(currentPrice, pes1y, 1),
            "5y": compoundGrowth(currentPrice, pes5y, 5),
            "10y": compoundGrowth(currentPrice, pes10y, 10)
        }
    };
}
// ─── 영향 요인 분석 ───
function generateFactors(trend, transactionCount, jeonseRatio) {
    const factors = [];
    // 금리 전망
    if (ECONOMIC_DEFAULTS.baseInterestRate >= 3.0) {
        factors.push({
            name: "금리 전망",
            impact: "negative",
            description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 높은 수준이며, 대출 부담으로 매수세 약화 가능성`
        });
    } else if (ECONOMIC_DEFAULTS.baseInterestRate <= 2.0) {
        factors.push({
            name: "금리 전망",
            impact: "positive",
            description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 저금리 환경이 부동산 수요를 촉진`
        });
    } else {
        factors.push({
            name: "금리 전망",
            impact: "neutral",
            description: `현재 기준금리 ${ECONOMIC_DEFAULTS.baseInterestRate}%로 중립적 수준, 향후 금리 방향에 따라 변동 가능`
        });
    }
    // 지역 가격 추세
    if (trend.annualGrowthRate > 0.05) {
        factors.push({
            name: "지역 가격 추세",
            impact: "positive",
            description: `최근 실거래 기준 연 ${(trend.annualGrowthRate * 100).toFixed(1)}% 상승 추세로 가격 상승 모멘텀 존재`
        });
    } else if (trend.annualGrowthRate < -0.02) {
        factors.push({
            name: "지역 가격 추세",
            impact: "negative",
            description: `최근 실거래 기준 연 ${(trend.annualGrowthRate * 100).toFixed(1)}% 하락 추세로 가격 조정 중`
        });
    } else {
        factors.push({
            name: "지역 가격 추세",
            impact: "neutral",
            description: `최근 실거래 기준 가격 변동이 크지 않은 안정적 시세 (연 ${(trend.annualGrowthRate * 100).toFixed(1)}%)`
        });
    }
    // 거래량
    if (transactionCount >= 20) {
        factors.push({
            name: "거래 활성도",
            impact: "positive",
            description: `최근 12개월 ${transactionCount}건 거래로 유동성이 풍부한 시장`
        });
    } else if (transactionCount <= 5) {
        factors.push({
            name: "거래 활성도",
            impact: "negative",
            description: `최근 12개월 ${transactionCount}건 거래로 유동성이 낮아 매매 시 가격 협상력 제한`
        });
    } else {
        factors.push({
            name: "거래 활성도",
            impact: "neutral",
            description: `최근 12개월 ${transactionCount}건 거래로 보통 수준의 시장 유동성`
        });
    }
    // 전세가율 리스크
    if (jeonseRatio !== null && jeonseRatio > 0) {
        if (jeonseRatio >= 75) {
            factors.push({
                name: "전세가율 리스크",
                impact: "negative",
                description: `전세가율 ${jeonseRatio.toFixed(1)}%로 높은 수준, 역전세 리스크 및 가격 하방 압력`
            });
        } else if (jeonseRatio < 50) {
            factors.push({
                name: "전세가율 안정",
                impact: "positive",
                description: `전세가율 ${jeonseRatio.toFixed(1)}%로 안정적, 갭투자 매력도 낮아 실수요 중심 시장`
            });
        }
    }
    // 인플레이션 헤지
    factors.push({
        name: "인플레이션 헤지",
        impact: "positive",
        description: `연 ${(ECONOMIC_DEFAULTS.inflationRate * 100).toFixed(1)}% 물가상승률 대비 실물자산으로서의 가치 보존 효과`
    });
    return factors.slice(0, 6);
}
// ─── 신뢰도 계산 ───
function calculatePredictionConfidence(transactionCount, r2, transactions) {
    if (transactionCount === 0) return 0;
    // 거래 건수 기반 (최대 40점)
    let score = Math.min(transactionCount * 5, 40);
    // 추세 일관성 (R² 기반, 최대 30점)
    score += r2 * 30;
    // 데이터 최근성 (최대 15점)
    const now = new Date();
    const mostRecentTx = transactions.reduce((latest, tx)=>{
        const txVal = tx.dealYear * 10000 + tx.dealMonth * 100 + tx.dealDay;
        const latestVal = latest.dealYear * 10000 + latest.dealMonth * 100 + latest.dealDay;
        return txVal > latestVal ? tx : latest;
    }, transactions[0]);
    if (mostRecentTx) {
        const recentDate = new Date(mostRecentTx.dealYear, mostRecentTx.dealMonth - 1, mostRecentTx.dealDay);
        const monthsAgo = (now.getTime() - recentDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
        if (monthsAgo <= 3) score += 15;
        else if (monthsAgo <= 6) score += 10;
        else if (monthsAgo <= 12) score += 5;
    }
    // 최소 30 (데이터 있으면), 최대 90 (예측은 본질적으로 불확실)
    return Math.min(Math.max(Math.round(score), transactionCount > 0 ? 30 : 0), 90);
}
function predictValue(currentPrice, transactions, rentData, jeonseRatio) {
    // 추세 분석
    const trend = calculateTrend(transactions);
    // 시나리오 예측
    const predictions = generateScenarios(currentPrice, trend);
    // 영향 요인 분석
    const factors = generateFactors(trend, transactions.length, jeonseRatio);
    // 반영 변수
    const variables = [
        "기준금리",
        "인구변동",
        "공급물량",
        "정책변화",
        "경제성장률",
        "물가상승률"
    ];
    // 신뢰도
    const confidence = calculatePredictionConfidence(transactions.length, trend.r2, transactions);
    // 앙상블 예측
    const ensemble = buildEnsemble(currentPrice, transactions, trend);
    return {
        currentPrice,
        predictions,
        variables,
        factors,
        confidence,
        ensemble
    };
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/system-settings.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OAUTH_PROVIDERS",
    ()=>OAUTH_PROVIDERS,
    "PG_PROVIDERS",
    ()=>PG_PROVIDERS,
    "decrypt",
    ()=>decrypt,
    "deleteOAuthSetting",
    ()=>deleteOAuthSetting,
    "deletePGSetting",
    ()=>deletePGSetting,
    "encrypt",
    ()=>encrypt,
    "getOAuthSettingOrEnv",
    ()=>getOAuthSettingOrEnv,
    "getOAuthSettings",
    ()=>getOAuthSettings,
    "getPGSettings",
    ()=>getPGSettings,
    "invalidateOAuthCache",
    ()=>invalidateOAuthCache,
    "maskValue",
    ()=>maskValue,
    "setOAuthSetting",
    ()=>setOAuthSetting,
    "setPGSetting",
    ()=>setPGSetting
]);
/**
 * 시스템 설정 관리 (System Settings Manager)
 * ─────────────────────────────────────────────
 * DB에 암호화하여 저장된 시스템 설정(OAuth 키 등)을 관리.
 * AES-256-GCM 암호화 + 인메모리 캐시(TTL 60초).
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
;
;
// ─── 암호화 ───
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
function deriveKey() {
    const secret = process.env.AUTH_SECRET || "vestra-default-secret-change-me";
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].scryptSync(secret, "vestra-salt", 32);
}
function encrypt(plaintext) {
    const key = deriveKey();
    const iv = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(IV_LENGTH);
    const cipher = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    // iv(16) + tag(16) + ciphertext → base64
    return Buffer.concat([
        iv,
        tag,
        encrypted
    ]).toString("base64");
}
function decrypt(encoded) {
    const key = deriveKey();
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
}
function maskValue(value) {
    if (value.length <= 8) return "****";
    return value.slice(0, 4) + "****" + value.slice(-4);
}
// ─── 인메모리 캐시 ───
let oauthCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60초
function invalidateOAuthCache() {
    oauthCache = null;
    cacheTimestamp = 0;
}
async function getOAuthSettings() {
    if (oauthCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return oauthCache;
    }
    try {
        const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.findMany({
            where: {
                category: "oauth"
            }
        });
        const settings = {};
        for (const row of rows){
            try {
                settings[row.key] = decrypt(row.value);
            } catch  {
            // 복호화 실패 시 무시 (키 변경 등)
            }
        }
        oauthCache = settings;
        cacheTimestamp = Date.now();
        return settings;
    } catch  {
        // DB 접근 실패 시 빈 객체 반환
        return {};
    }
}
async function getOAuthSettingOrEnv(key) {
    const settings = await getOAuthSettings();
    return settings[key] || process.env[key] || undefined;
}
async function setOAuthSetting(key, value) {
    const encrypted = encrypt(value);
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.upsert({
        where: {
            key
        },
        update: {
            value: encrypted,
            category: "oauth"
        },
        create: {
            key,
            value: encrypted,
            category: "oauth"
        }
    });
    invalidateOAuthCache();
}
async function deleteOAuthSetting(key) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.deleteMany({
        where: {
            key
        }
    });
    invalidateOAuthCache();
}
const OAUTH_PROVIDERS = [
    {
        provider: "google",
        label: "Google",
        clientIdKey: "AUTH_GOOGLE_ID",
        clientSecretKey: "AUTH_GOOGLE_SECRET",
        devConsoleUrl: "https://console.cloud.google.com/apis/credentials",
        callbackPath: "/api/auth/callback/google"
    },
    {
        provider: "kakao",
        label: "카카오",
        clientIdKey: "KAKAO_CLIENT_ID",
        clientSecretKey: "KAKAO_CLIENT_SECRET",
        devConsoleUrl: "https://developers.kakao.com/console/app",
        callbackPath: "/api/auth/callback/kakao"
    },
    {
        provider: "naver",
        label: "네이버",
        clientIdKey: "NAVER_CLIENT_ID",
        clientSecretKey: "NAVER_CLIENT_SECRET",
        devConsoleUrl: "https://developers.naver.com/apps",
        callbackPath: "/api/auth/callback/naver"
    }
];
const PG_PROVIDERS = [
    {
        provider: "tosspayments",
        label: "토스페이먼츠",
        clientKeyName: "TOSS_CLIENT_KEY",
        secretKeyName: "TOSS_SECRET_KEY",
        devConsoleUrl: "https://developers.tosspayments.com",
        description: "카드, 계좌이체, 가상계좌, 간편결제 지원"
    },
    {
        provider: "inicis",
        label: "KG이니시스",
        clientKeyName: "INICIS_MID",
        secretKeyName: "INICIS_API_KEY",
        devConsoleUrl: "https://manual.inicis.com",
        description: "국내 1위 PG사, 다양한 결제수단 지원"
    },
    {
        provider: "kcp",
        label: "NHN KCP",
        clientKeyName: "KCP_SITE_CD",
        secretKeyName: "KCP_SITE_KEY",
        devConsoleUrl: "https://admin8.kcp.co.kr",
        description: "간편결제, 정기결제, 해외결제 지원"
    }
];
async function getPGSettings() {
    try {
        const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.findMany({
            where: {
                category: "pg"
            }
        });
        const settings = {};
        for (const row of rows){
            try {
                settings[row.key] = decrypt(row.value);
            } catch  {
            // 복호화 실패 시 무시
            }
        }
        return settings;
    } catch  {
        return {};
    }
}
async function setPGSetting(key, value) {
    const encrypted = encrypt(value);
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.upsert({
        where: {
            key
        },
        update: {
            value: encrypted,
            category: "pg"
        },
        create: {
            key,
            value: encrypted,
            category: "pg"
        }
    });
}
async function deletePGSetting(key) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.deleteMany({
        where: {
            key
        }
    });
}
}),
"[project]/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ROLE_LIMITS",
    ()=>ROLE_LIMITS,
    "auth",
    ()=>auth,
    "createDynamicAuth",
    ()=>createDynamicAuth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
/**
 * NextAuth v5 설정
 *
 * 소셜 로그인(Google/카카오/네이버) + JWT 세션 전략
 * Prisma 어댑터로 사용자/계정 DB 저장
 *
 * 동적 프로바이더: DB에 저장된 OAuth 키를 우선 사용하고,
 * 없으면 환경변수로 폴백. 관리자 대시보드에서 키 설정 가능.
 *
 * @module lib/auth
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/google.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/google.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$kakao$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/kakao.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$kakao$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/kakao.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$naver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/naver.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$naver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/naver.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/node_modules/@auth/core/providers/credentials.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/prisma-adapter/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$system$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/system-settings.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
const ROLE_LIMITS = {
    GUEST: 2,
    PERSONAL: 5,
    BUSINESS: 50,
    REALESTATE: 100,
    ADMIN: 9999
};
// ─── 공통 콜백 + 페이지 설정 ───
const authCallbacks = {
    async jwt ({ token, user, trigger, session }) {
        if (user) {
            token.id = user.id;
            const dbUser = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
                where: {
                    id: user.id
                },
                select: {
                    role: true,
                    dailyLimit: true,
                    verifyStatus: true
                }
            });
            token.role = dbUser?.role || "PERSONAL";
            token.dailyLimit = dbUser?.dailyLimit || ROLE_LIMITS.PERSONAL;
            token.verifyStatus = dbUser?.verifyStatus || "none";
        }
        if (trigger === "update" && session) {
            if (session.role) token.role = session.role;
            if (session.dailyLimit) token.dailyLimit = session.dailyLimit;
            if (session.verifyStatus) token.verifyStatus = session.verifyStatus;
        }
        return token;
    },
    async session ({ session, token }) {
        if (session.user) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.dailyLimit = token.dailyLimit;
            session.user.verifyStatus = token.verifyStatus;
        }
        return session;
    }
};
const credentialsProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
    name: "관리자 로그인",
    credentials: {
        email: {
            label: "이메일",
            type: "email"
        },
        password: {
            label: "비밀번호",
            type: "password"
        }
    },
    async authorize (credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
            where: {
                email: credentials.email
            }
        });
        if (!user?.password || user.role !== "ADMIN") return null;
        const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(credentials.password, user.password);
        if (!isValid) return null;
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            dailyLimit: user.dailyLimit,
            verifyStatus: user.verifyStatus
        };
    }
});
// ─── 동적 프로바이더 빌드 (DB 우선, env 폴백) ───
function buildProviders(settings) {
    const providers = [];
    const googleId = settings.AUTH_GOOGLE_ID || process.env.AUTH_GOOGLE_ID;
    const googleSecret = settings.AUTH_GOOGLE_SECRET || process.env.AUTH_GOOGLE_SECRET;
    if (googleId && googleSecret) {
        providers.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            clientId: googleId,
            clientSecret: googleSecret
        }));
    }
    const kakaoId = settings.KAKAO_CLIENT_ID || process.env.KAKAO_CLIENT_ID;
    const kakaoSecret = settings.KAKAO_CLIENT_SECRET || process.env.KAKAO_CLIENT_SECRET;
    if (kakaoId && kakaoSecret) {
        providers.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$kakao$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            clientId: kakaoId,
            clientSecret: kakaoSecret
        }));
    }
    const naverId = settings.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
    const naverSecret = settings.NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;
    if (naverId && naverSecret) {
        providers.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$node_modules$2f40$auth$2f$core$2f$providers$2f$naver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])({
            clientId: naverId,
            clientSecret: naverSecret
        }));
    }
    providers.push(credentialsProvider);
    return providers;
}
async function createDynamicAuth() {
    const settings = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$system$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getOAuthSettings"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
        adapter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PrismaAdapter"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"]),
        session: {
            strategy: "jwt"
        },
        providers: buildProviders(settings),
        pages: {
            signIn: "/login"
        },
        callbacks: authCallbacks
    });
}
const { handlers, auth, signIn, signOut } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
    adapter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$prisma$2d$adapter$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PrismaAdapter"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"]),
    session: {
        strategy: "jwt"
    },
    providers: buildProviders({}),
    pages: {
        signIn: "/login"
    },
    callbacks: authCallbacks
});
}),
"[project]/app/api/predict-value/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/openai.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prompts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rate-limit.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sanitize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$molit$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/molit-api.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$price$2d$estimation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/price-estimation.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prediction$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prediction-engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
/** 원 단위 숫자를 "X억 Y만원" 형태로 변환 */ function formatKoreanPrice(won) {
    if (won <= 0) return "없음";
    const eok = Math.floor(won / 100000000);
    const man = Math.round(won % 100000000 / 10000);
    if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
    if (eok > 0) return `${eok}억원`;
    if (man > 0) return `${man.toLocaleString()}만원`;
    return `${won.toLocaleString()}원`;
}
async function POST(req) {
    try {
        // 인증 + 역할 기반 제한
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        const userId = session?.user?.id;
        const dailyLimit = session?.user?.dailyLimit || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLE_LIMITS"].GUEST;
        const rl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`predict-value:${userId || ip}`, 30);
        if (!rl.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "요청 한도 초과. 잠시 후 다시 시도해주세요."
            }, {
                status: 429,
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimitHeaders"])(rl)
            });
        }
        const daily = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkDailyUsage"])(userId || `guest:${ip}`, dailyLimit);
        if (!daily.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요."
            }, {
                status: 429,
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimitHeaders"])(daily)
            });
        }
        // Cost Guard (일일 OpenAI 호출 제한)
        const costGuard = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkOpenAICostGuard"])(ip);
        if (!costGuard.allowed) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요."
            }, {
                status: 429
            });
        }
        const { address: rawAddress } = await req.json();
        const address = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sanitizeField"])(rawAddress || "", 200);
        if (!address) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "주소를 입력해주세요."
            }, {
                status: 400
            });
        }
        // 1단계: 종합 시세 데이터 조회 (12개월 - 추세 분석용)
        let comprehensive = null;
        try {
            comprehensive = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$molit$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchComprehensivePrices"])(address, 12);
        } catch (e) {
            console.warn("MOLIT API 종합 조회 실패:", e);
        }
        // 2단계: 자체 엔진으로 현재 시세 추정
        const priceEstimation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$price$2d$estimation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["estimatePrice"])({
            address,
            aptName: address
        }, comprehensive?.sale ?? null, comprehensive?.rent ?? null);
        const currentPrice = priceEstimation.estimatedPrice;
        // 3단계: 자체 엔진으로 가치 전망 산출
        const predictionResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prediction$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["predictValue"])(currentPrice, comprehensive?.sale?.transactions ?? [], comprehensive?.rent ?? null, comprehensive?.jeonseRatio ?? null);
        // 4단계: LLM으로 종합 의견만 생성
        let aiOpinion = "";
        try {
            const openai = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getOpenAIClient"])();
            const completion = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VALUE_PREDICTION_OPINION_PROMPT"]
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            address,
                            currentPrice,
                            formattedPrice: formatKoreanPrice(currentPrice),
                            predictions: predictionResult.predictions,
                            factors: predictionResult.factors,
                            confidence: predictionResult.confidence,
                            transactionCount: comprehensive?.sale?.transactionCount ?? 0,
                            jeonseRatio: comprehensive?.jeonseRatio ?? null
                        })
                    }
                ],
                temperature: 0.3,
                response_format: {
                    type: "json_object"
                }
            });
            const content = completion.choices[0]?.message?.content;
            if (content) {
                const parsed = JSON.parse(content);
                aiOpinion = parsed.aiOpinion || parsed.opinion || "";
            }
        } catch  {
            aiOpinion = "AI 의견 생성에 실패했습니다. 자체 분석 결과를 참고해주세요.";
        }
        // 5단계: 프론트엔드 호환 응답 생성
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ...predictionResult,
            aiOpinion,
            realTransactions: comprehensive?.sale?.transactions.slice(0, 20) ?? [],
            priceStats: comprehensive?.sale ? {
                avgPrice: comprehensive.sale.avgPrice,
                minPrice: comprehensive.sale.minPrice,
                maxPrice: comprehensive.sale.maxPrice,
                transactionCount: comprehensive.sale.transactionCount,
                period: comprehensive.sale.period
            } : null,
            rentStats: comprehensive?.rent ? {
                avgDeposit: comprehensive.rent.avgDeposit,
                jeonseCount: comprehensive.rent.jeonseCount,
                wolseCount: comprehensive.rent.wolseCount
            } : null,
            calculatedJeonseRatio: comprehensive?.jeonseRatio ?? null
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("Value prediction error:", message);
        if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
            }, {
                status: 401
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `예측 중 오류: ${message}`
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6e32fc48._.js.map