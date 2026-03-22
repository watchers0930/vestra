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
    // 개발 모드에서는 rate limit 바이패스
    if ("TURBOPACK compile-time truthy", 1) {
        return {
            success: true,
            remaining: limit,
            reset: Date.now() + windowMs
        };
    }
    //TURBOPACK unreachable
    ;
    const now = undefined;
    const resetTime = undefined;
}
async function checkDailyUsage(userId, dailyLimit) {
    // 개발 모드에서는 일일 사용량 제한 바이패스
    if ("TURBOPACK compile-time truthy", 1) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return {
            success: true,
            remaining: dailyLimit,
            reset: tomorrow.getTime()
        };
    }
    //TURBOPACK unreachable
    ;
    const today = undefined; // YYYY-MM-DD
    const id = undefined;
    const tomorrow = undefined;
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
"[project]/lib/court-api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 대법원 판례 API 클라이언트
 * ──────────────────────────────────
 * 법제처 Open API(law.go.kr)를 통해 부동산 관련 판례를 검색.
 * 계약서 분석, AI 상담 시 실제 판례를 참조하여 정확도 향상.
 *
 * API 키: LAW_API_KEY 환경변수 (법제처 Open API 인증키)
 * 미설정 시 graceful fallback (빈 배열 반환).
 */ __turbopack_context__.s([
    "searchCourtCases",
    ()=>searchCourtCases,
    "searchRelatedCases",
    ()=>searchRelatedCases
]);
/** XML에서 태그 값 추출 */ function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?\\s*</${tag}>`, "s");
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
}
async function searchCourtCases(query, maxResults = 5) {
    const apiKey = process.env.LAW_API_KEY;
    if (!apiKey) return [];
    const baseUrl = "http://www.law.go.kr/DRF/lawSearch.do";
    const params = new URLSearchParams({
        OC: apiKey,
        target: "prec",
        type: "XML",
        query,
        display: String(maxResults),
        sort: "ddes"
    });
    try {
        const res = await fetch(`${baseUrl}?${params.toString()}`, {
            headers: {
                Accept: "application/xml"
            }
        });
        if (!res.ok) {
            console.warn(`Court API error: ${res.status}`);
            return [];
        }
        const xml = await res.text();
        const cases = [];
        const itemRegex = /<prec>([\s\S]*?)<\/prec>/g;
        let match;
        while((match = itemRegex.exec(xml)) !== null && cases.length < maxResults){
            const item = match[1];
            const caseName = extractTag(item, "사건명");
            if (!caseName) continue;
            cases.push({
                caseNumber: extractTag(item, "사건번호"),
                caseName,
                courtName: extractTag(item, "법원명"),
                judgmentDate: extractTag(item, "선고일자"),
                summary: extractTag(item, "판시사항").slice(0, 300)
            });
        }
        return cases;
    } catch (error) {
        console.warn("Court API fetch error:", error);
        return [];
    }
}
async function searchRelatedCases(contractKeywords) {
    if (contractKeywords.length === 0) return [];
    // 최대 3개 키워드로 병렬 검색
    const queries = contractKeywords.slice(0, 3);
    const promises = queries.map((q)=>searchCourtCases(q, 3));
    const results = await Promise.all(promises);
    // 중복 제거 (사건번호 기준)
    const seen = new Set();
    const unique = [];
    for (const c of results.flat()){
        if (!seen.has(c.caseNumber)) {
            seen.add(c.caseNumber);
            unique.push(c);
        }
    }
    return unique.slice(0, 5);
}
}),
"[project]/lib/contract-analyzer.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 계약서 조항 분석 엔진 (Contract Clause Analysis Engine)
 * ──────────────────────────────────────────────────────────────
 * 한국 부동산 계약서를 규칙 기반으로 파싱하여 조항별 리스크 판정.
 * LLM 없이 법령 DB + 패턴 매칭으로 위험 요소 감지.
 */ __turbopack_context__.s([
    "analyzeContract",
    ()=>analyzeContract
]);
// ─── 조항 파싱 ───
/** 계약서 텍스트를 조항 단위로 분리 */ function parseContractSections(text) {
    const sections = [];
    // 제N조 패턴으로 분리
    const clausePattern = /제\s*(\d+)\s*조\s*[\(（]([^)）]+)[\)）]/g;
    const matches = [];
    let match;
    while((match = clausePattern.exec(text)) !== null){
        matches.push({
            index: match.index,
            title: match[2].trim(),
            num: parseInt(match[1])
        });
    }
    // 각 조항의 내용 추출
    for(let i = 0; i < matches.length; i++){
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const rawText = text.slice(start, end).trim();
        // 제목 줄을 제외한 본문
        const content = rawText.replace(/^제\s*\d+\s*조\s*[\(（][^)）]+[\)）]\s*/, "").trim();
        sections.push({
            title: `제${matches[i].num}조 (${matches[i].title})`,
            content,
            rawText
        });
    }
    // 제N조 패턴이 없는 경우 섹션 헤더로 분리 시도
    if (sections.length === 0) {
        const headerPattern = /\[([^\]]+)\]|【([^】]+)】/g;
        const headers = [];
        while((match = headerPattern.exec(text)) !== null){
            headers.push({
                index: match.index,
                title: (match[1] || match[2]).trim()
            });
        }
        for(let i = 0; i < headers.length; i++){
            const start = headers[i].index;
            const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
            const rawText = text.slice(start, end).trim();
            const content = rawText.replace(/^\[[^\]]+\]\s*|^【[^】]+】\s*/, "").trim();
            if (content.length > 10) {
                sections.push({
                    title: headers[i].title,
                    content,
                    rawText
                });
            }
        }
    }
    return sections;
}
const CLAUSE_RULES = [
    // 보증금 관련
    {
        id: "deposit",
        detectPatterns: [
            /보증금/,
            /보증금\s*지급/,
            /계약금/,
            /중도금/,
            /잔금/
        ],
        title: "보증금 지급",
        analyzeRisk: (content)=>{
            if (/보증금\s*반환/.test(content) && /기일|기한|이내/.test(content)) {
                return {
                    riskLevel: "safe",
                    analysis: "보증금 반환 기한이 명시되어 있어 분쟁 예방에 적절합니다"
                };
            }
            if (/계약금.*중도금.*잔금/.test(content) || /지급.*방법/.test(content)) {
                return {
                    riskLevel: "safe",
                    analysis: "보증금 분할 지급 조건이 구체적으로 명시되어 있습니다"
                };
            }
            if (/보증금/.test(content) && !/반환/.test(content)) {
                return {
                    riskLevel: "warning",
                    analysis: "보증금 반환 조건이 명시되어 있지 않아 분쟁 가능성이 있습니다"
                };
            }
            return {
                riskLevel: "safe",
                analysis: "보증금 관련 조항이 기본적으로 적절합니다"
            };
        },
        relatedLaw: "주택임대차보호법 제3조, 제3조의2"
    },
    // 계약기간
    {
        id: "period",
        detectPatterns: [
            /계약\s*기간/,
            /임대차\s*기간/,
            /임대\s*기간/
        ],
        title: "계약기간",
        analyzeRisk: (content)=>{
            const yearMatch = content.match(/(\d+)\s*년/);
            if (yearMatch) {
                const years = parseInt(yearMatch[1]);
                if (years < 2) {
                    return {
                        riskLevel: "warning",
                        analysis: `계약기간이 ${years}년으로 주택임대차보호법상 최소 보장기간(2년)보다 짧습니다. 법적으로 2년으로 간주됩니다.`
                    };
                }
                return {
                    riskLevel: "safe",
                    analysis: `계약기간 ${years}년으로 주택임대차보호법 최소 보장기간을 충족합니다`
                };
            }
            return {
                riskLevel: "warning",
                analysis: "계약기간이 불명확합니다. 구체적 기간을 명시해야 합니다"
            };
        },
        relatedLaw: "주택임대차보호법 제4조 (2년 최소 보장)"
    },
    // 계약 해지
    {
        id: "termination",
        detectPatterns: [
            /계약.*해지/,
            /계약.*해제/,
            /중도.*해지/,
            /해지.*사유/
        ],
        title: "계약 해지",
        analyzeRisk: (content)=>{
            if (/임대인.*일방.*해지|사유\s*없이.*해지/.test(content)) {
                return {
                    riskLevel: "high",
                    analysis: "임대인의 일방적 해지 조항은 임차인에게 매우 불리하며, 주택임대차보호법에 위반될 수 있습니다"
                };
            }
            if (/위약금|손해\s*배상/.test(content) && !/쌍방|상호|각/.test(content)) {
                return {
                    riskLevel: "warning",
                    analysis: "위약금 조항이 일방적으로 설정되어 있을 수 있으니 확인이 필요합니다"
                };
            }
            if (/2\s*회\s*이상.*연체|차임.*연체/.test(content)) {
                return {
                    riskLevel: "safe",
                    analysis: "차임 연체에 의한 해지 조건으로, 민법상 표준적인 조항입니다"
                };
            }
            return {
                riskLevel: "safe",
                analysis: "계약 해지 조건이 합리적으로 설정되어 있습니다"
            };
        },
        relatedLaw: "민법 제543조, 주택임대차보호법 제6조"
    },
    // 특약사항
    {
        id: "special_terms",
        detectPatterns: [
            /특약\s*사항/,
            /특약/
        ],
        title: "특약사항",
        analyzeRisk: (content)=>{
            const highRiskPatterns = [
                {
                    pattern: /모든\s*수리비.*임차인\s*부담|수리.*일체.*임차인/,
                    msg: "모든 수리비를 임차인에게 전가하는 조항은 민법 제623조(수선의무)에 위반될 수 있습니다"
                },
                {
                    pattern: /보증금.*포기|보증금.*반환.*청구.*불가/,
                    msg: "보증금 반환 청구권 포기 조항은 무효입니다"
                },
                {
                    pattern: /손해\s*배상.*무한|책임.*일체.*임차인/,
                    msg: "임차인에게 과도한 책임을 지우는 조항입니다"
                }
            ];
            for (const { pattern, msg } of highRiskPatterns){
                if (pattern.test(content)) {
                    return {
                        riskLevel: "high",
                        analysis: msg
                    };
                }
            }
            const warningPatterns = [
                {
                    pattern: /반려\s*동물.*금지/,
                    msg: "반려동물 사육 금지 특약이 포함되어 있습니다. 위반 시 계약 해지 사유가 될 수 있으니 확인하세요"
                },
                {
                    pattern: /현\s*시설\s*상태\s*그대로|현상.*인도/,
                    msg: "현 시설 상태 그대로 인도 조건입니다. 입주 전 하자 점검이 필요합니다"
                },
                {
                    pattern: /인테리어.*변경.*금지|시설.*변경.*불가/,
                    msg: "시설 변경 금지 조항이 있습니다. 필요한 변경사항이 있다면 사전 협의가 필요합니다"
                }
            ];
            for (const { pattern, msg } of warningPatterns){
                if (pattern.test(content)) {
                    return {
                        riskLevel: "warning",
                        analysis: msg
                    };
                }
            }
            return {
                riskLevel: "safe",
                analysis: "특약사항이 일반적인 범위 내에 있습니다"
            };
        },
        relatedLaw: "민법 제652조, 주택임대차보호법"
    },
    // 원상회복
    {
        id: "restoration",
        detectPatterns: [
            /원상\s*회복/,
            /원상\s*복구/,
            /반환\s*의무/
        ],
        title: "원상회복",
        analyzeRisk: (content)=>{
            if (/모든\s*시설.*교체|전면\s*수리|원상.*완벽/.test(content)) {
                return {
                    riskLevel: "high",
                    analysis: "과도한 원상회복 의무가 부과되어 있습니다. 통상적 사용에 의한 손모는 원상회복 대상이 아닙니다"
                };
            }
            return {
                riskLevel: "safe",
                analysis: "원상회복 조항이 표준적 수준입니다. 통상 사용에 의한 감가는 제외됩니다"
            };
        },
        relatedLaw: "민법 제654조, 제615조"
    },
    // 임대인 의무
    {
        id: "landlord_duty",
        detectPatterns: [
            /임대인.*의무/,
            /사용.*수익.*유지/,
            /인도.*의무/
        ],
        title: "임대인의 의무",
        analyzeRisk: (content)=>{
            if (/사용.*수익.*유지|상태.*유지/.test(content)) {
                return {
                    riskLevel: "safe",
                    analysis: "임대인의 목적물 유지 의무가 적절히 명시되어 있습니다"
                };
            }
            return {
                riskLevel: "safe",
                analysis: "임대인의 의무 조항이 포함되어 있습니다"
            };
        },
        relatedLaw: "민법 제623조 (임대인의 의무)"
    },
    // 임차인 의무
    {
        id: "tenant_duty",
        detectPatterns: [
            /임차인.*의무/,
            /선량한\s*관리자/,
            /전대.*금지/
        ],
        title: "임차인의 의무",
        analyzeRisk: (content)=>{
            if (/선량한\s*관리자/.test(content)) {
                return {
                    riskLevel: "safe",
                    analysis: "선관주의의무가 명시된 표준적 조항입니다"
                };
            }
            return {
                riskLevel: "safe",
                analysis: "임차인의 의무 조항이 표준적 범위 내에 있습니다"
            };
        },
        relatedLaw: "민법 제629조, 제374조"
    },
    // 차임 증감
    {
        id: "rent_increase",
        detectPatterns: [
            /차임.*증감/,
            /차임.*인상/,
            /임대료.*인상/,
            /보증금.*증액/
        ],
        title: "차임 증감",
        analyzeRisk: (content)=>{
            const percentMatch = content.match(/(\d+)\s*%/);
            if (percentMatch && parseInt(percentMatch[1]) > 5) {
                return {
                    riskLevel: "high",
                    analysis: `차임 증액 상한이 ${percentMatch[1]}%로 주택임대차보호법 제7조의 5% 상한을 초과합니다`
                };
            }
            return {
                riskLevel: "safe",
                analysis: "차임 증감 조항이 법적 상한 범위 내에 있습니다"
            };
        },
        relatedLaw: "주택임대차보호법 제7조 (5% 상한)"
    }
];
const REQUIRED_CLAUSES = [
    {
        id: "jeonse_registration",
        title: "전세권설정 관련 조항",
        importance: "high",
        description: "전세보증금 보호를 위해 전세권 설정 또는 확정일자 관련 조항이 필요합니다. 전세권 설정등기를 통해 보증금을 안전하게 보호할 수 있습니다.",
        detectPatterns: [
            /전세권\s*설정/,
            /전세권\s*등기/,
            /확정\s*일자/
        ]
    },
    {
        id: "deposit_protection",
        title: "보증금보호 관련 조항",
        importance: "high",
        description: "전세보증금반환보증(HUG, SGI 등) 가입 관련 조항 명시가 필요합니다. 임대인 부도 시 보증금 회수를 보장합니다.",
        detectPatterns: [
            /보증금\s*보호/,
            /보증\s*보험/,
            /HUG/,
            /주택도시보증공사/,
            /SGI/,
            /보증금\s*반환\s*보증/
        ]
    },
    {
        id: "renewal_right",
        title: "계약갱신청구권",
        importance: "medium",
        description: "주택임대차보호법 제6조의3에 따른 계약갱신청구권(1회, 2+2년) 관련 조항을 명시하면 분쟁을 예방할 수 있습니다.",
        detectPatterns: [
            /계약\s*갱신/,
            /갱신\s*청구/,
            /갱신\s*요구/,
            /갱신\s*거절/
        ]
    },
    {
        id: "implicit_renewal",
        title: "묵시적 갱신 조건",
        importance: "medium",
        description: "계약 만료 시 묵시적 갱신(자동 연장) 조건을 명시하면 임차인 보호와 분쟁 예방에 도움됩니다.",
        detectPatterns: [
            /묵시적\s*갱신/,
            /자동\s*갱신/,
            /자동\s*연장/
        ]
    },
    {
        id: "repair_responsibility",
        title: "수리비 부담 기준",
        importance: "medium",
        description: "대수선(구조적 보수)은 임대인, 소수선(일상 유지보수)은 임차인 부담 원칙을 명시하면 분쟁을 예방합니다.",
        detectPatterns: [
            /수리비\s*부담/,
            /수선\s*의무/,
            /하자\s*보수\s*책임/,
            /대수선/,
            /소수선/
        ]
    },
    {
        id: "brokerage_fee",
        title: "중개보수 부담",
        importance: "medium",
        description: "부동산 중개보수의 부담 주체(통상 쌍방 각 부담)를 명시하면 분쟁을 예방합니다.",
        detectPatterns: [
            /중개\s*보수/,
            /중개\s*수수료/,
            /복비/,
            /중개.*부담/
        ]
    },
    {
        id: "registry_maintenance",
        title: "등기 상태 유지 특약",
        importance: "high",
        description: "잔금일까지 등기부 상태를 현 상태 그대로 유지하고, 위반 시 계약 해제 및 배액 배상을 명시하는 특약이 필요합니다. 계약 후 잔금 지급 전에 근저당 추가 설정, 가압류 등이 발생하면 보증금을 잃을 수 있습니다.",
        detectPatterns: [
            /등기.*유지/,
            /등기.*상태.*유지/,
            /잔금.*등기/,
            /등기부.*변동.*금지/,
            /등기.*현\s*상태/,
            /권리.*변동.*금지/
        ]
    },
    {
        id: "tax_clearance",
        title: "세금 체납 확인 조항",
        importance: "high",
        description: "임대인(매도인)의 국세·지방세 완납증명원 제출을 요구하는 조항이 필요합니다. 체납 세금(당해세)은 근저당보다 우선 변제되어 보증금 회수에 직접 영향을 줍니다.",
        detectPatterns: [
            /완납\s*증명/,
            /세금\s*체납/,
            /국세.*완납/,
            /지방세.*완납/,
            /납세\s*증명/,
            /체납.*확인/
        ]
    }
];
// ─── F. 조항 상호작용 규칙 (특허 청구항: 교차 위험 분석) ───
const CLAUSE_INTERACTION_RULES = [
    {
        id: "missing_jeonse_high_deposit",
        clauseIds: [
            "jeonse_registration",
            "deposit"
        ],
        interactionType: "compound_warning",
        impactMultiplier: 1.5,
        description: "전세권설정 조항 누락 + 고액보증금(3억원 이상): 보증금 미보호 상태에서 고액 계약은 극히 위험"
    },
    {
        id: "unilateral_termination_penalty",
        clauseIds: [
            "termination",
            "special_terms"
        ],
        interactionType: "imbalanced",
        impactMultiplier: 2.0,
        description: "일방적 해지 조항 + 과도한 위약금: 임차인 계약 자유 심각하게 제한"
    },
    {
        id: "no_renewal_short_period",
        clauseIds: [
            "renewal_right",
            "period"
        ],
        interactionType: "compound_warning",
        impactMultiplier: 1.3,
        description: "갱신권 미명시 + 단기 계약(2년 이하): 주거 안정성 위협"
    },
    {
        id: "full_restoration_no_repair",
        clauseIds: [
            "restoration",
            "repair_responsibility"
        ],
        interactionType: "imbalanced",
        impactMultiplier: 1.4,
        description: "과도한 원상회복 의무 + 수리비 기준 미명시: 퇴거 시 과도한 비용 부담 위험"
    },
    {
        id: "no_registry_no_deposit_protection",
        clauseIds: [
            "registry_maintenance",
            "deposit_protection"
        ],
        interactionType: "compound_warning",
        impactMultiplier: 1.6,
        description: "등기 상태 유지 특약 누락 + 보증금보호 미명시: 계약 후 잔금일 전 등기 변동 시 보증금 전액 미보호 상태"
    },
    {
        id: "no_tax_clearance_high_deposit",
        clauseIds: [
            "tax_clearance",
            "deposit"
        ],
        interactionType: "compound_warning",
        impactMultiplier: 1.4,
        description: "세금 체납 확인 누락 + 고액보증금: 체납 세금이 보증금보다 우선 변제되어 전액 미회수 위험"
    }
];
/**
 * 조항 간 상호작용 분석 (특허 핵심: 개별 조항이 아닌 조항 조합의 교차 위험 탐지)
 *
 * 개별 조항 분석에서는 발견되지 않는 복합 위험을 식별:
 * - 누락 조항과 위험 조항의 결합 효과
 * - 조항 간 불균형(임대인 유리 편향)
 */ function analyzeClauseInteractions(clauses, missingClauses, fullText) {
    const interactions = [];
    const missingIds = new Set(REQUIRED_CLAUSES.filter((rc)=>missingClauses.some((mc)=>mc.title === rc.title)).map((rc)=>rc.id));
    const clauseRiskMap = new Map();
    for (const clause of clauses){
        for (const rule of CLAUSE_RULES){
            if (rule.detectPatterns.some((p)=>p.test(clause.title) || p.test(clause.content))) {
                clauseRiskMap.set(rule.id, clause.riskLevel);
            }
        }
    }
    for (const rule of CLAUSE_INTERACTION_RULES){
        let matched = false;
        const matchedClauses = [];
        if (rule.id === "missing_jeonse_high_deposit") {
            const jeonseNotSet = missingIds.has("jeonse_registration");
            // 보증금 3억원 이상 판정
            const highDeposit = /[3-9]\s*억|[1-9]\d\s*억|\d{3,}\s*백만/.test(fullText) || /보증금.*[3-9]억|보증금.*[1-9]\d억/.test(fullText);
            if (jeonseNotSet && highDeposit) {
                matched = true;
                matchedClauses.push("전세권설정 누락", "고액보증금");
            }
        }
        if (rule.id === "unilateral_termination_penalty") {
            const hasUnilateral = clauseRiskMap.get("termination") === "high";
            const hasExcessivePenalty = /위약금.*[2-9]배|위약금.*200%|과도.*위약/.test(fullText);
            if (hasUnilateral && hasExcessivePenalty) {
                matched = true;
                matchedClauses.push("일방적 해지", "과도한 위약금");
            }
        }
        if (rule.id === "no_renewal_short_period") {
            const noRenewal = missingIds.has("renewal_right");
            const shortPeriod = clauseRiskMap.get("period") === "warning";
            if (noRenewal && shortPeriod) {
                matched = true;
                matchedClauses.push("갱신권 미명시", "단기계약");
            }
        }
        if (rule.id === "full_restoration_no_repair") {
            const excessiveRestoration = clauseRiskMap.get("restoration") === "high";
            const noRepairStandard = missingIds.has("repair_responsibility");
            if (excessiveRestoration && noRepairStandard) {
                matched = true;
                matchedClauses.push("과도한 원상회복", "수리비 기준 없음");
            }
        }
        if (rule.id === "no_registry_no_deposit_protection") {
            const noRegistry = missingIds.has("registry_maintenance");
            const noDeposit = missingIds.has("deposit_protection");
            if (noRegistry && noDeposit) {
                matched = true;
                matchedClauses.push("등기 유지 특약 누락", "보증금보호 누락");
            }
        }
        if (rule.id === "no_tax_clearance_high_deposit") {
            const noTax = missingIds.has("tax_clearance");
            const highDeposit = /[3-9]\s*억|[1-9]\d\s*억|\d{3,}\s*백만/.test(fullText) || /보증금.*[3-9]억|보증금.*[1-9]\d억/.test(fullText);
            if (noTax && highDeposit) {
                matched = true;
                matchedClauses.push("세금 체납 확인 누락", "고액보증금");
            }
        }
        if (matched) {
            interactions.push({
                ruleId: rule.id,
                matchedClauses,
                impactScore: rule.impactMultiplier,
                description: rule.description
            });
        }
    }
    const totalInteractionImpact = interactions.reduce((sum, i)=>sum + (i.impactScore - 1) * 10, 0);
    return {
        interactions,
        totalInteractionImpact
    };
}
// ─── 분석 로직 ───
/** 파싱된 조항에 리스크 규칙 적용 */ function analyzeClauseRisk(section) {
    const fullText = section.rawText;
    for (const rule of CLAUSE_RULES){
        const matches = rule.detectPatterns.some((p)=>p.test(fullText));
        if (matches) {
            const { riskLevel, analysis } = rule.analyzeRisk(fullText);
            return {
                title: section.title,
                content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
                riskLevel,
                analysis,
                relatedLaw: rule.relatedLaw
            };
        }
    }
    // 매칭되지 않는 조항은 기본 safe
    return {
        title: section.title,
        content: section.content.slice(0, 200) + (section.content.length > 200 ? "..." : ""),
        riskLevel: "safe",
        analysis: "표준적인 계약 조항입니다",
        relatedLaw: "민법 제618조~제654조 (임대차)"
    };
}
/** 누락 조항 검사 */ function checkMissingClauses(fullText) {
    const missing = [];
    for (const check of REQUIRED_CLAUSES){
        const found = check.detectPatterns.some((p)=>p.test(fullText));
        if (!found) {
            missing.push({
                title: check.title,
                importance: check.importance,
                description: check.description
            });
        }
    }
    return missing;
}
/** 안전점수 계산 (조항 상호작용 감점 포함) */ function calculateSafetyScore(clauses, missingClauses, interactionImpact = 0) {
    let score = 100;
    for (const clause of clauses){
        if (clause.riskLevel === "high") score -= 15;
        else if (clause.riskLevel === "warning") score -= 5;
    }
    for (const mc of missingClauses){
        if (mc.importance === "high") score -= 10;
        else score -= 3;
    }
    // 조항 상호작용에 의한 비선형 추가 감점
    score -= interactionImpact;
    return Math.max(0, Math.min(100, score));
}
function analyzeContract(contractText) {
    // 조항 파싱
    const sections = parseContractSections(contractText);
    // 조항별 리스크 분석
    const clauses = [];
    for (const section of sections){
        const analyzed = analyzeClauseRisk(section);
        if ("TURBOPACK compile-time truthy", 1) {
            clauses.push(analyzed);
        }
    }
    // 전체 텍스트에서 규칙 매칭 (파싱 실패한 내용도 포함)
    if (clauses.length === 0) {
        // 조항이 하나도 파싱되지 않은 경우, 전체 텍스트를 하나의 조항으로 분석
        for (const rule of CLAUSE_RULES){
            const matches = rule.detectPatterns.some((p)=>p.test(contractText));
            if (matches) {
                const { riskLevel, analysis } = rule.analyzeRisk(contractText);
                clauses.push({
                    title: rule.title,
                    content: contractText.slice(0, 200) + (contractText.length > 200 ? "..." : ""),
                    riskLevel,
                    analysis,
                    relatedLaw: rule.relatedLaw
                });
            }
        }
    }
    // 누락 조항 검사
    const missingClauses = checkMissingClauses(contractText);
    // 조항 상호작용 분석 (특허: 교차 위험 탐지)
    const clauseInteractions = analyzeClauseInteractions(clauses, missingClauses, contractText);
    // 안전점수 계산 (상호작용 감점 포함)
    const safetyScore = calculateSafetyScore(clauses, missingClauses, clauseInteractions.totalInteractionImpact);
    return {
        clauses,
        missingClauses,
        safetyScore,
        clauseInteractions
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
"[project]/app/api/analyze-contract/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$court$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/court-api.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contract$2d$analyzer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/contract-analyzer.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
async function POST(req) {
    try {
        // 인증 + 역할 기반 제한
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        const userId = session?.user?.id;
        const dailyLimit = session?.user?.dailyLimit || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLE_LIMITS"].GUEST;
        const rl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`analyze-contract:${userId || ip}`, 30);
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
        const costGuard = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkOpenAICostGuard"])(userId || ip);
        if (!costGuard.allowed) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요."
            }, {
                status: 429
            });
        }
        const { contractText: rawText } = await req.json();
        const contractText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["truncateInput"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripHtml"])(rawText || ""), 50000);
        if (!contractText) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "계약서 내용을 입력해주세요."
            }, {
                status: 400
            });
        }
        // 1단계: 자체 엔진으로 계약서 분석
        const engineResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$contract$2d$analyzer$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["analyzeContract"])(contractText);
        // 2단계: 판례 검색 (LLM 의견 보강용)
        let courtContext = "";
        try {
            const keywords = extractContractKeywords(contractText);
            if (keywords.length > 0) {
                const cases = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$court$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["searchCourtCases"])(keywords[0], 3);
                if (cases.length > 0) {
                    courtContext = `\n\n관련 판례:\n${cases.map((c)=>`- [${c.caseNumber}] ${c.caseName} (${c.courtName}, ${c.judgmentDate})\n  판시사항: ${c.summary}`).join("\n")}`;
                }
            }
        } catch (e) {
            console.warn("판례 검색 실패:", e);
        }
        // 3단계: LLM으로 종합 의견만 생성
        let aiOpinion = "";
        try {
            const openai = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getOpenAIClient"])();
            const completion = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONTRACT_ANALYSIS_OPINION_PROMPT"]
                    },
                    {
                        role: "user",
                        content: JSON.stringify({
                            clauses: engineResult.clauses,
                            missingClauses: engineResult.missingClauses,
                            safetyScore: engineResult.safetyScore,
                            highRiskCount: engineResult.clauses.filter((c)=>c.riskLevel === "high").length,
                            warningCount: engineResult.clauses.filter((c)=>c.riskLevel === "warning").length,
                            courtContext: courtContext || "관련 판례 없음"
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            clauses: engineResult.clauses,
            missingClauses: engineResult.missingClauses,
            safetyScore: engineResult.safetyScore,
            aiOpinion
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("Contract analysis error:", message);
        if (message.includes("API key") || message.includes("api_key") || message.includes("환경변수")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
            }, {
                status: 401
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `분석 중 오류: ${message}`
        }, {
            status: 500
        });
    }
}
/** 계약서 텍스트에서 핵심 키워드 추출 */ function extractContractKeywords(text) {
    const keywordPatterns = [
        "전세보증금",
        "보증금 반환",
        "임대차",
        "근저당",
        "계약해지",
        "위약금",
        "손해배상",
        "특약사항",
        "원상회복",
        "권리금",
        "전세권",
        "임차권",
        "대항력",
        "우선변제"
    ];
    const found = keywordPatterns.filter((kw)=>text.includes(kw));
    if (found.length === 0) return [
        "부동산 계약 분쟁"
    ];
    return [
        found.slice(0, 2).join(" ")
    ];
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__761407c6._.js.map