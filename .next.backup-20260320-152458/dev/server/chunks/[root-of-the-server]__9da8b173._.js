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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/crypto.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptPII",
    ()=>decryptPII,
    "encryptPII",
    ()=>encryptPII,
    "hashForSearch",
    ()=>hashForSearch,
    "maskBusinessNumber",
    ()=>maskBusinessNumber,
    "maskEmail",
    ()=>maskEmail
]);
/**
 * PII 암호화/복호화 유틸리티
 * ─────────────────────────────
 * 개인정보(사업자등록번호 등)를 AES-256-GCM으로 암호화.
 * system-settings.ts의 암호화 패턴을 범용화한 버전.
 *
 * 주요 특징:
 * - AES-256-GCM (인증된 암호화)
 * - AUTH_SECRET 기반 키 파생 (PII 전용 salt)
 * - 검색용 해시 인덱스 지원 (SHA-256)
 *
 * @module lib/crypto
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
// ─── 상수 ───
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PII_SALT = "vestra-pii-salt"; // system-settings와 다른 salt 사용
// ─── 키 파생 ───
function getSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다. PII 암호화를 수행할 수 없습니다.");
    }
    return secret;
}
function derivePIIKey() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].scryptSync(getSecret(), PII_SALT, 32);
}
function encryptPII(plaintext) {
    if (!plaintext) return "";
    const key = derivePIIKey();
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
function decryptPII(encoded) {
    if (!encoded) return "";
    try {
        const key = derivePIIKey();
        const buf = Buffer.from(encoded, "base64");
        const iv = buf.subarray(0, IV_LENGTH);
        const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
        const decipher = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(ciphertext) + decipher.final("utf8");
    } catch  {
        // 복호화 실패 시 원본 반환 (미암호화 데이터 호환)
        return encoded;
    }
}
function hashForSearch(value) {
    if (!value) return "";
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHmac("sha256", getSecret()).update(value.trim().toLowerCase()).digest("hex");
}
function maskBusinessNumber(value) {
    if (!value || value.length < 6) return "****";
    return value.slice(0, 6) + "****";
}
function maskEmail(value) {
    const [local, domain] = value.split("@");
    if (!domain) return "****";
    const masked = local.length <= 2 ? "**" : local.slice(0, 2) + "****";
    return `${masked}@${domain}`;
}
}),
"[project]/lib/prisma.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/crypto.ts [app-route] (ecmascript)");
;
;
// ─── PII 자동 암호화/복호화 대상 필드 ───
const PII_FIELDS = {
    User: [
        "businessNumber"
    ],
    Analysis: [
        "address"
    ],
    Asset: [
        "address"
    ]
};
// ─── Prisma Client Extensions로 PII 자동 암/복호화 ───
function createExtendedClient() {
    const base = new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]();
    return base.$extends({
        query: {
            $allOperations ({ model, args, query }) {
                const fields = model ? PII_FIELDS[model] : undefined;
                if (!fields) return query(args);
                // 쓰기: data 내 PII 필드 암호화
                if (args && "data" in args && args.data) {
                    const data = args.data;
                    for (const field of fields){
                        if (typeof data[field] === "string" && data[field]) {
                            data[field] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encryptPII"])(data[field]);
                        }
                    }
                }
                // upsert: create/update 내 PII 필드 암호화
                if (args && "create" in args && args.create) {
                    const create = args.create;
                    for (const field of fields){
                        if (typeof create[field] === "string" && create[field]) {
                            create[field] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encryptPII"])(create[field]);
                        }
                    }
                }
                if (args && "update" in args && args.update) {
                    const update = args.update;
                    for (const field of fields){
                        if (typeof update[field] === "string" && update[field]) {
                            update[field] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encryptPII"])(update[field]);
                        }
                    }
                }
                // 쿼리 실행 후 결과 복호화
                return query(args).then((result)=>{
                    if (!result) return result;
                    const decryptObj = (obj)=>{
                        for (const field of fields){
                            if (typeof obj[field] === "string" && obj[field]) {
                                obj[field] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["decryptPII"])(obj[field]);
                            }
                        }
                    };
                    if (Array.isArray(result)) {
                        result.forEach((item)=>{
                            if (item && typeof item === "object") decryptObj(item);
                        });
                    } else if (typeof result === "object") {
                        decryptObj(result);
                    }
                    return result;
                });
            }
        }
    });
}
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || createExtendedClient();
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
    "FRAUD_RISK_EXPLANATION_PROMPT",
    ()=>FRAUD_RISK_EXPLANATION_PROMPT,
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
    ()=>VALUE_PREDICTION_PROMPT,
    "V_SCORE_EXPLANATION_PROMPT",
    ()=>V_SCORE_EXPLANATION_PROMPT
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
const V_SCORE_EXPLANATION_PROMPT = `당신은 VESTRA V-Score 분석 결과를 일반 사용자에게 설명하는 전문가입니다.

아래의 규칙 기반 분석 요약을 바탕으로, 비전문가도 이해할 수 있는 자연어 설명을 작성하세요.

작성 규칙:
1. 300자 이내로 핵심만 전달
2. 전문 용어 사용 시 괄호 안에 쉬운 설명 추가
3. 가장 위험한 요소부터 설명
4. 구체적인 수치를 포함
5. 마지막에 간단한 행동 권고 포함

반드시 아래 JSON 형식으로 응답:
{
  "explanation": "자연어 설명 텍스트",
  "actionItems": ["행동 권고 1", "행동 권고 2"]
}`;
const FRAUD_RISK_EXPLANATION_PROMPT = `당신은 VESTRA 전세사기 위험 분석 결과를 설명하는 전문가입니다.

피처 기여도 분석 결과를 바탕으로, 왜 이 물건이 전세사기 위험이 있는지(또는 없는지) 설명하세요.

작성 규칙:
1. 200자 이내 핵심 설명
2. 위험 요인 상위 3개를 구체적으로 언급
3. 유사 사기 사례가 있으면 거리와 함께 언급
4. 실행 가능한 예방 조치 제안

반드시 아래 JSON 형식으로 응답:
{
  "explanation": "위험 설명 텍스트",
  "preventionTips": ["예방 조치 1", "예방 조치 2"]
}`;
}),
"[project]/lib/registry-parser.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 등기부등본 자동 파싱 엔진
 * ─────────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 정규식 패턴 매칭 + 키워드 분류로 등기부등본 원문을 구조화된 데이터로 변환.
 *
 * 지원 형식: 인터넷등기소 텍스트, 법원등기 텍스트, OCR 추출 텍스트
 */ // ─── 타입 정의 ───
__turbopack_context__.s([
    "SAMPLE_REGISTRY_TEXT",
    ()=>SAMPLE_REGISTRY_TEXT,
    "extractAmount",
    ()=>extractAmount,
    "parseRegistry",
    ()=>parseRegistry
]);
// ─── 상수 ───
/** 갑구 권리 유형 → 위험도 매핑 */ const GAPGU_RISK_MAP = {
    소유권이전: "safe",
    소유권보존: "safe",
    가압류: "danger",
    압류: "danger",
    가처분: "danger",
    경매개시결정: "danger",
    임의경매개시결정: "danger",
    강제경매개시결정: "danger",
    신탁: "warning",
    신탁등기: "warning",
    가등기: "warning",
    소유권이전청구권가등기: "warning",
    환매등기: "warning",
    예고등기: "warning"
};
/** 을구 권리 유형 → 위험도 매핑 */ const EULGU_RISK_MAP = {
    근저당권설정: "warning",
    저당권설정: "warning",
    전세권설정: "info",
    지상권설정: "info",
    지역권설정: "info",
    임차권등기: "info",
    임차권설정: "info",
    가압류: "danger",
    압류: "danger",
    가등기: "warning",
    전세권이전: "info",
    근저당권이전: "warning",
    근저당권변경: "warning"
};
// ─── 유틸리티 함수 ───
/** 다양한 한국 날짜 형식을 통일 포맷으로 변환 */ function extractDate(text) {
    // "2023년 5월 15일", "2023년05월15일"
    const m1 = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (m1) return `${m1[1]}.${m1[2].padStart(2, "0")}.${m1[3].padStart(2, "0")}`;
    // "2023.05.15", "2023-05-15"
    const m2 = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (m2) return `${m2[1]}.${m2[2].padStart(2, "0")}.${m2[3].padStart(2, "0")}`;
    return "";
}
function extractAmount(text) {
    // "금 420,000,000원" → 420000000
    const m1 = text.match(/금\s*([\d,]+)\s*원/);
    if (m1) return parseInt(m1[1].replace(/,/g, ""), 10);
    // "금XXX,XXX,XXX원" (공백 없는 경우)
    const m1b = text.match(/([\d,]{4,})\s*원/);
    if (m1b) return parseInt(m1b[1].replace(/,/g, ""), 10);
    // "채권최고액 금3억5,000만원" → 350000000
    const m2 = text.match(/금\s*(\d+)\s*억\s*([\d,]*)\s*만/);
    if (m2) {
        const eok = parseInt(m2[1], 10) * 100000000;
        const man = m2[2] ? parseInt(m2[2].replace(/,/g, ""), 10) * 10000 : 0;
        return eok + man;
    }
    // "금3억원"
    const m3 = text.match(/금\s*(\d+)\s*억\s*원/);
    if (m3) return parseInt(m3[1], 10) * 100000000;
    // "금5,000만원"
    const m4 = text.match(/금\s*([\d,]+)\s*만\s*원/);
    if (m4) return parseInt(m4[1].replace(/,/g, ""), 10) * 10000;
    // 숫자만 있는 경우 (최소 6자리 이상)
    const m5 = text.match(/([\d,]{7,})/);
    if (m5) return parseInt(m5[1].replace(/,/g, ""), 10);
    return 0;
}
/** 텍스트에서 권리 유형 키워드 매칭 */ function classifyRightType(text, riskMap) {
    // 길이가 긴 키워드부터 매칭 (더 구체적인 것 우선)
    const sortedKeys = Object.keys(riskMap).sort((a, b)=>b.length - a.length);
    for (const key of sortedKeys){
        if (text.includes(key)) {
            return {
                type: key,
                risk: riskMap[key]
            };
        }
    }
    return {
        type: "기타",
        risk: "info"
    };
}
/** 말소 여부 판별 */ function isCancelled(text) {
    return /말소|말소기준등기|말소회복/.test(text);
}
/** 면적 추출 */ function extractArea(text) {
    const m = text.match(/([\d.]+)\s*㎡/);
    return m ? `${m[1]}㎡` : "";
}
/** 권리자/소유자 이름 추출 */ function extractHolder(text) {
    // 법인/기관명 (개인보다 먼저 체크 — 법인명이 더 긴 패턴)
    const corpPatterns = [
        /((?:주식회사|㈜)\s*[가-힣A-Za-z0-9\s]{1,30})/,
        /([가-힣]+(?:은행|보험|저축은행|캐피탈|신용협동조합|신탁|증권|자산관리|공사|조합|재단|학교법인|종교법인|사단법인|재단법인|유한회사|합자회사|합명회사)[가-힣\s]*)/,
        /((?:사\)|사\(|법인)[가-힣\s]{2,20})/
    ];
    for (const pattern of corpPatterns){
        const m = text.match(pattern);
        if (m) return m[1].trim();
    }
    // 한글 이름 패턴 (2~5글자 — 복성/긴 이름 지원)
    const m = text.match(/([가-힣]{2,5})\s*(?:\d{6}|[（(]|$)/);
    if (m) return m[1];
    return "";
}
function splitSections(text) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");
    // 섹션 헤더 패턴 (다양한 포맷 대응)
    const titlePattern = /【\s*표\s*제\s*부\s*】/;
    const gapguPattern = /【\s*갑\s*구\s*】/;
    const eulguPattern = /【\s*을\s*구\s*】/;
    // 대체 패턴 (괄호 형식)
    const titlePatternAlt = /\[\s*표\s*제\s*부\s*\]/;
    const gapguPatternAlt = /\[\s*갑\s*구\s*\]/;
    const eulguPatternAlt = /\[\s*을\s*구\s*\]/;
    // 일반 텍스트 패턴
    const titlePatternText = /표\s*제\s*부/;
    const gapguPatternText = /갑\s*구/;
    const eulguPatternText = /을\s*구/;
    function findIndex(patterns) {
        for (const p of patterns){
            const m = normalized.search(p);
            if (m !== -1) return m;
        }
        return -1;
    }
    const titleIdx = findIndex([
        titlePattern,
        titlePatternAlt,
        titlePatternText
    ]);
    const gapguIdx = findIndex([
        gapguPattern,
        gapguPatternAlt,
        gapguPatternText
    ]);
    const eulguIdx = findIndex([
        eulguPattern,
        eulguPatternAlt,
        eulguPatternText
    ]);
    const titleRaw = titleIdx !== -1 && gapguIdx !== -1 ? normalized.slice(titleIdx, gapguIdx) : titleIdx !== -1 ? normalized.slice(titleIdx, gapguIdx !== -1 ? gapguIdx : eulguIdx !== -1 ? eulguIdx : undefined) : "";
    const gapguRaw = gapguIdx !== -1 ? normalized.slice(gapguIdx, eulguIdx !== -1 ? eulguIdx : undefined) : "";
    const eulguRaw = eulguIdx !== -1 ? normalized.slice(eulguIdx) : "";
    return {
        titleRaw,
        gapguRaw,
        eulguRaw
    };
}
// ─── 표제부 파싱 ───
function parseTitle(raw) {
    const result = {
        address: "",
        buildingDetail: "",
        area: "",
        structure: "",
        purpose: "",
        landRightRatio: ""
    };
    if (!raw) return result;
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    for (const line of lines){
        // 소재지
        if (/소재지|소재지번/.test(line) || /[가-힣]+[시도]\s*[가-힣]+[시군구]/.test(line)) {
            const addrMatch = line.match(/([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구)[\s가-힣\d\-호동층]*)/);
            if (addrMatch) result.address = addrMatch[1].trim();
        }
        // 면적
        const area = extractArea(line);
        if (area && !result.area) result.area = area;
        // 구조
        if (/철근콘크리트|철골|벽돌|목조|경량철골|조적/.test(line)) {
            const structMatch = line.match(/((?:철근콘크리트|철골철근콘크리트|철골|벽돌|목조|경량철골|조적)[가-힣\s]*조)/);
            if (structMatch) result.structure = structMatch[1];
        }
        // 용도
        if (/아파트|다세대|다가구|단독주택|오피스텔|근린생활|업무시설|주거용/.test(line)) {
            const purposeMatch = line.match(/(아파트|다세대주택|다가구주택|단독주택|오피스텔|제[12]종근린생활시설|업무시설|공동주택)/);
            if (purposeMatch) result.purpose = purposeMatch[1];
        }
        // 대지권 비율
        if (/대지권\s*비율|대지권비율/.test(line)) {
            const ratioMatch = line.match(/([\d.]+분의\s*[\d.]+|[\d.]+\/[\d.]+)/);
            if (ratioMatch) result.landRightRatio = ratioMatch[1];
        }
        // 건물 내역 (면적 + 구조 + 용도가 함께 있는 줄)
        if (/㎡/.test(line) && !result.buildingDetail) {
            result.buildingDetail = line.replace(/^[\d\s|]+/, "").trim();
        }
    }
    return result;
}
// ─── 갑구 파싱 ───
function parseGapgu(raw) {
    if (!raw) return [];
    const entries = [];
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    // 헤더 라인 스킵
    let startIdx = 0;
    for(let i = 0; i < lines.length; i++){
        if (/순위번호|등기목적|접수/.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    let currentEntry = null;
    let orderCounter = 0;
    for(let i = startIdx; i < lines.length; i++){
        const line = lines[i];
        // 새 항목 시작 감지: 순위번호(숫자)로 시작하거나, 등기 키워드가 있는 줄
        const orderMatch = line.match(/^(\d+)\s/);
        const hasRightKeyword = Object.keys(GAPGU_RISK_MAP).some((k)=>line.includes(k));
        const hasDate = extractDate(line) !== "";
        if (orderMatch || hasRightKeyword && hasDate) {
            // 이전 엔트리 저장
            if (currentEntry && currentEntry.purpose) {
                entries.push(currentEntry);
            }
            orderCounter++;
            const date = extractDate(line);
            const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
            const cancelled = isCancelled(line);
            const holder = extractHolder(line);
            currentEntry = {
                order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
                date,
                purpose: type,
                detail: line,
                holder,
                isCancelled: cancelled,
                riskType: cancelled ? "info" : risk
            };
        } else if (currentEntry) {
            // 현재 엔트리에 추가 정보 누적
            currentEntry.detail += " " + line;
            // 추가 줄에서 정보 보완
            if (!currentEntry.date) {
                const d = extractDate(line);
                if (d) currentEntry.date = d;
            }
            if (!currentEntry.holder) {
                const h = extractHolder(line);
                if (h) currentEntry.holder = h;
            }
            if (currentEntry.purpose === "기타") {
                const { type, risk } = classifyRightType(line, GAPGU_RISK_MAP);
                if (type !== "기타") {
                    currentEntry.purpose = type;
                    currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
                }
            }
            if (isCancelled(line)) {
                currentEntry.isCancelled = true;
                currentEntry.riskType = "info";
            }
        }
    }
    // 마지막 엔트리 저장
    if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry);
    }
    return entries;
}
// ─── 을구 파싱 ───
function parseEulgu(raw) {
    if (!raw) return [];
    const entries = [];
    const lines = raw.split("\n").map((l)=>l.trim()).filter(Boolean);
    let startIdx = 0;
    for(let i = 0; i < lines.length; i++){
        if (/순위번호|등기목적|접수/.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    let currentEntry = null;
    let orderCounter = 0;
    for(let i = startIdx; i < lines.length; i++){
        const line = lines[i];
        const orderMatch = line.match(/^(\d+)\s/);
        const hasRightKeyword = Object.keys(EULGU_RISK_MAP).some((k)=>line.includes(k));
        const hasDate = extractDate(line) !== "";
        if (orderMatch || hasRightKeyword && hasDate) {
            if (currentEntry && currentEntry.purpose) {
                entries.push(currentEntry);
            }
            orderCounter++;
            const date = extractDate(line);
            const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
            const cancelled = isCancelled(line);
            const amount = extractAmount(line);
            const holder = extractHolder(line);
            currentEntry = {
                order: orderMatch ? parseInt(orderMatch[1], 10) : orderCounter,
                date,
                purpose: type,
                detail: line,
                amount,
                holder,
                isCancelled: cancelled,
                riskType: cancelled ? "info" : risk
            };
        } else if (currentEntry) {
            currentEntry.detail += " " + line;
            // 금액이 다음 줄에 있는 경우
            if (!currentEntry.amount || currentEntry.amount === 0) {
                const amt = extractAmount(line);
                if (amt > 0) currentEntry.amount = amt;
            }
            if (!currentEntry.date) {
                const d = extractDate(line);
                if (d) currentEntry.date = d;
            }
            if (!currentEntry.holder) {
                const h = extractHolder(line);
                if (h) currentEntry.holder = h;
            }
            if (currentEntry.purpose === "기타") {
                const { type, risk } = classifyRightType(line, EULGU_RISK_MAP);
                if (type !== "기타") {
                    currentEntry.purpose = type;
                    currentEntry.riskType = currentEntry.isCancelled ? "info" : risk;
                }
            }
            if (isCancelled(line)) {
                currentEntry.isCancelled = true;
                currentEntry.riskType = "info";
            }
        }
    }
    if (currentEntry && currentEntry.purpose) {
        entries.push(currentEntry);
    }
    return entries;
}
// ─── 요약 생성 ───
function buildSummary(gapgu, eulgu) {
    const activeGapgu = gapgu.filter((e)=>!e.isCancelled);
    const activeEulgu = eulgu.filter((e)=>!e.isCancelled);
    const totalMortgageAmount = activeEulgu.filter((e)=>/근저당|저당/.test(e.purpose)).reduce((sum, e)=>sum + e.amount, 0);
    const totalJeonseAmount = activeEulgu.filter((e)=>/전세권/.test(e.purpose)).reduce((sum, e)=>sum + e.amount, 0);
    return {
        totalGapguEntries: gapgu.length,
        totalEulguEntries: eulgu.length,
        activeGapguEntries: activeGapgu.length,
        activeEulguEntries: activeEulgu.length,
        cancelledEntries: gapgu.filter((e)=>e.isCancelled).length + eulgu.filter((e)=>e.isCancelled).length,
        totalMortgageAmount,
        totalJeonseAmount,
        hasSeizure: activeGapgu.some((e)=>e.purpose === "압류"),
        hasProvisionalSeizure: activeGapgu.some((e)=>e.purpose === "가압류"),
        hasProvisionalDisposition: activeGapgu.some((e)=>e.purpose === "가처분"),
        hasAuctionOrder: activeGapgu.some((e)=>/경매개시결정/.test(e.purpose)),
        hasTrust: activeGapgu.some((e)=>/신탁/.test(e.purpose)),
        hasProvisionalRegistration: [
            ...activeGapgu,
            ...activeEulgu
        ].some((e)=>e.purpose === "가등기"),
        hasLeaseRegistration: activeEulgu.some((e)=>/임차권등기|임차권설정/.test(e.purpose)),
        hasWarningRegistration: activeGapgu.some((e)=>e.purpose === "예고등기"),
        hasRedemptionRegistration: activeGapgu.some((e)=>/환매/.test(e.purpose)),
        ownershipTransferCount: gapgu.filter((e)=>e.purpose === "소유권이전" && !e.isCancelled).length,
        totalClaimsAmount: totalMortgageAmount + totalJeonseAmount
    };
}
function parseRegistry(rawText) {
    const { titleRaw, gapguRaw, eulguRaw } = splitSections(rawText);
    const title = parseTitle(titleRaw);
    const gapgu = parseGapgu(gapguRaw);
    const eulgu = parseEulgu(eulguRaw);
    const summary = buildSummary(gapgu, eulgu);
    return {
        title,
        gapgu,
        eulgu,
        summary,
        rawText
    };
}
const SAMPLE_REGISTRY_TEXT = `
──────────────────────────────────────────────────────
                    등 기 부 등 본 (건물)
                    고유번호: 1101-2024-012345
──────────────────────────────────────────────────────

【 표 제 부 】 (건물의 표시)

 표시번호 |  접  수  |     소재지번 및 건물번호     |        건물내역        | 등기원인 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     2019년3월15일  서울특별시 강남구 역삼동      철근콘크리트조           [대지권의 목적인 토지의 표시]
                        123-45 래미안레벤투스         지붕슬래브방수           서울특별시 강남구 역삼동
                        제101동 제15층 제1502호       아파트                   123-45
                                                     84.97㎡                  대지권비율 52718.4분의 84.97

【 갑 구 】 (소유권에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     소유권보존   2019년3월20일    2019년3월15일        소유자 대한건설주식회사
                      제12345호        보존등기              110111-0012345

    2     소유권이전   2019년8월10일    2019년8월5일         소유자 김영수
                      제23456호        매매                  850101-1234567
                                                            서울특별시 강남구 역삼로 123

    3     소유권이전   2022년5월20일    2022년5월15일        소유자 박지민
                      제34567호        매매                  900215-2345678
                                                            서울특별시 서초구 서초대로 456

    4     가압류      2024년8월15일    2024년8월14일         채권자 이상호
                      제45678호        서울중앙지방법원       청구금액 금 150,000,000원
                                      2024카단12345

    5     소유권이전   2025년1월10일    2025년1월8일         소유자 최현우
                      제56789호        매매                  880320-1456789
                                                            서울특별시 강남구 테헤란로 789
          가압류말소   2025년1월10일    해제
                      제56790호

【 을 구 】 (소유권 이외의 권리에 관한 사항)

 순위번호 |  등기목적  |     접  수     |      등기원인       |       권리자 및 기타사항
─────────────────────────────────────────────────────────────────────────────
    1     근저당권설정  2019년8월12일   2019년8월10일         채권최고액 금 480,000,000원
                      제23460호        설정계약              근저당권자 국민은행
                                                            채무자 김영수

    2     근저당권설정  2022년5월25일   2022년5월20일         채권최고액 금 360,000,000원
                      제34570호        설정계약              근저당권자 신한은행
                                                            채무자 박지민
          1번근저당권말소 2022년5월25일  해제
                      제34571호

    3     전세권설정   2023년3월10일    2023년3월8일          전세금 금 550,000,000원
                      제40001호        설정계약              전세권자 정민수
                                                            범위: 건물전부
                                                            존속기간: 2023년3월10일부터 2025년3월9일까지

    4     근저당권설정  2025년1월15일   2025년1월10일         채권최고액 금 540,000,000원
                      제56800호        설정계약              근저당권자 하나은행
                                                            채무자 최현우
          2번근저당권말소 2025년1월15일  해제
                      제56801호
`.trim();
}),
"[project]/lib/risk-scoring.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 리스크 스코어링 알고리즘
 * ──────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 등기부등본 파싱 결과를 입력받아 가중치 기반 정량적 위험도를 산출.
 *
 * 스코어링 모델: 100점 만점, 감점 방식
 * - 높은 점수 = 안전
 * - 낮은 점수 = 위험
 */ __turbopack_context__.s([
    "calculateRiskScore",
    ()=>calculateRiskScore
]);
const GRADE_MAP = {
    A: {
        label: "안전",
        color: "emerald"
    },
    B: {
        label: "양호",
        color: "blue"
    },
    C: {
        label: "주의",
        color: "amber"
    },
    D: {
        label: "위험",
        color: "orange"
    },
    F: {
        label: "매우위험",
        color: "red"
    }
};
function getGrade(score) {
    if (score >= 85) return "A";
    if (score >= 70) return "B";
    if (score >= 50) return "C";
    if (score >= 30) return "D";
    return "F";
}
// ─── 스코어링 규칙 ───
function evaluateMortgageRatio(parsed, estimatedPrice) {
    const factors = [];
    const { totalMortgageAmount } = parsed.summary;
    if (!estimatedPrice || estimatedPrice <= 0) {
        return {
            deduction: 0,
            ratio: 0,
            factors
        };
    }
    const ratio = totalMortgageAmount / estimatedPrice * 100;
    if (ratio > 120) {
        factors.push({
            id: "mortgage_extreme",
            category: "근저당",
            description: "근저당 비율 매우 위험",
            deduction: 30,
            severity: "critical",
            detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 120%를 초과합니다. 깡통주택 위험이 매우 높습니다.`
        });
        return {
            deduction: 30,
            ratio,
            factors
        };
    }
    if (ratio > 100) {
        factors.push({
            id: "mortgage_very_high",
            category: "근저당",
            description: "근저당 비율 초과위험",
            deduction: 25,
            severity: "critical",
            detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 깡통주택 위험이 높습니다.`
        });
        return {
            deduction: 25,
            ratio,
            factors
        };
    }
    if (ratio > 80) {
        factors.push({
            id: "mortgage_high",
            category: "근저당",
            description: "근저당 비율 위험",
            deduction: 20,
            severity: "high",
            detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 80%를 초과하여 보증금 회수 위험이 있습니다.`
        });
        return {
            deduction: 20,
            ratio,
            factors
        };
    }
    if (ratio > 70) {
        factors.push({
            id: "mortgage_elevated",
            category: "근저당",
            description: "근저당 비율 주의",
            deduction: 10,
            severity: "medium",
            detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 70%를 초과하여 주의가 필요합니다.`
        });
        return {
            deduction: 10,
            ratio,
            factors
        };
    }
    if (ratio > 50) {
        factors.push({
            id: "mortgage_moderate",
            category: "근저당",
            description: "근저당 비율 보통",
            deduction: 5,
            severity: "low",
            detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 일반적인 수준이나 모니터링이 필요합니다.`
        });
        return {
            deduction: 5,
            ratio,
            factors
        };
    }
    return {
        deduction: 0,
        ratio,
        factors
    };
}
function evaluateSeizure(parsed) {
    const factors = [];
    const { hasProvisionalSeizure, hasSeizure } = parsed.summary;
    if (hasSeizure) {
        const count = parsed.gapgu.filter((e)=>e.purpose === "압류" && !e.isCancelled).length;
        factors.push({
            id: "seizure",
            category: "압류",
            description: "압류 등기 존재",
            deduction: 25 * count,
            severity: "critical",
            detail: `현행 압류가 ${count}건 설정되어 있습니다. 소유권 행사에 심각한 제한이 있으며, 경매 진행 가능성이 높습니다.`
        });
    }
    if (hasProvisionalSeizure) {
        const count = parsed.gapgu.filter((e)=>e.purpose === "가압류" && !e.isCancelled).length;
        factors.push({
            id: "provisional_seizure",
            category: "가압류",
            description: "가압류 등기 존재",
            deduction: 20 * count,
            severity: "critical",
            detail: `현행 가압류가 ${count}건 설정되어 있습니다. 채무 분쟁이 있으며, 본압류로 전환될 수 있습니다.`
        });
    }
    return factors;
}
function evaluateDisposition(parsed) {
    const factors = [];
    if (parsed.summary.hasProvisionalDisposition) {
        const count = parsed.gapgu.filter((e)=>e.purpose === "가처분" && !e.isCancelled).length;
        factors.push({
            id: "disposition",
            category: "가처분",
            description: "가처분 등기 존재",
            deduction: 15 * count,
            severity: "high",
            detail: `처분금지 가처분이 ${count}건 설정되어 있습니다. 소유권 이전에 법적 분쟁이 있습니다.`
        });
    }
    return factors;
}
function evaluateAuction(parsed) {
    const factors = [];
    if (parsed.summary.hasAuctionOrder) {
        factors.push({
            id: "auction",
            category: "경매",
            description: "경매개시결정 존재",
            deduction: 30,
            severity: "critical",
            detail: "경매가 개시된 부동산입니다. 보증금 회수가 매우 어려울 수 있으며, 임차인 보호에 각별한 주의가 필요합니다."
        });
    }
    return factors;
}
function evaluateProvisionalRegistration(parsed) {
    const factors = [];
    if (parsed.summary.hasProvisionalRegistration) {
        factors.push({
            id: "provisional_reg",
            category: "가등기",
            description: "가등기 존재",
            deduction: 10,
            severity: "medium",
            detail: "가등기가 설정되어 있습니다. 본등기로 전환 시 후순위 권리가 말소될 수 있습니다."
        });
    }
    return factors;
}
function evaluateTrust(parsed) {
    const factors = [];
    if (parsed.summary.hasTrust) {
        factors.push({
            id: "trust",
            category: "신탁",
            description: "신탁등기 존재",
            deduction: 15,
            severity: "high",
            detail: "신탁등기가 설정된 부동산입니다. 수탁자의 동의 없이 처분이 불가하며, 신탁원부 확인이 필요합니다."
        });
    }
    return factors;
}
function evaluateOwnershipFrequency(parsed) {
    const factors = [];
    const { ownershipTransferCount } = parsed.summary;
    if (ownershipTransferCount >= 4) {
        factors.push({
            id: "ownership_freq_high",
            category: "소유권",
            description: "소유권 이전 빈도 매우 높음",
            deduction: 15,
            severity: "high",
            detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 잦은 거래는 투기 또는 하자 물건의 징후일 수 있습니다.`
        });
    } else if (ownershipTransferCount >= 3) {
        factors.push({
            id: "ownership_freq",
            category: "소유권",
            description: "소유권 이전 빈도 높음",
            deduction: 10,
            severity: "medium",
            detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 평균 이상의 거래 빈도로 주의가 필요합니다.`
        });
    }
    return factors;
}
function evaluateTotalClaims(parsed, estimatedPrice) {
    const factors = [];
    const { totalClaimsAmount } = parsed.summary;
    if (!estimatedPrice || estimatedPrice <= 0 || totalClaimsAmount <= 0) {
        return {
            deduction: 0,
            factors
        };
    }
    const ratio = totalClaimsAmount / estimatedPrice * 100;
    if (ratio > 100) {
        factors.push({
            id: "total_claims_critical",
            category: "선순위채권",
            description: "선순위채권 합산 초과",
            deduction: 25,
            severity: "critical",
            detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 보증금 전액 미회수 위험이 매우 높습니다.`
        });
        return {
            deduction: 25,
            factors
        };
    }
    if (ratio > 80) {
        factors.push({
            id: "total_claims_high",
            category: "선순위채권",
            description: "선순위채권 합산 위험",
            deduction: 15,
            severity: "high",
            detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 경매 시 보증금 전액 회수가 어려울 수 있습니다.`
        });
        return {
            deduction: 15,
            factors
        };
    }
    if (ratio > 60) {
        factors.push({
            id: "total_claims_moderate",
            category: "선순위채권",
            description: "선순위채권 합산 주의",
            deduction: 8,
            severity: "medium",
            detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 추가 채권 설정 시 위험 수준에 도달할 수 있습니다.`
        });
        return {
            deduction: 8,
            factors
        };
    }
    return {
        deduction: 0,
        factors
    };
}
function evaluateLeaseRegistration(parsed) {
    const factors = [];
    if (parsed.summary.hasLeaseRegistration) {
        const count = parsed.eulgu.filter((e)=>/임차권등기|임차권설정/.test(e.purpose) && !e.isCancelled).length;
        factors.push({
            id: "lease_registration",
            category: "임차권등기",
            description: "임차권등기명령 존재",
            deduction: 20,
            severity: "critical",
            detail: `임차권등기가 ${count}건 설정되어 있습니다. 이전 임차인이 보증금을 반환받지 못한 상태이며, 해당 물건의 보증금 미반환 이력을 의미합니다.`
        });
    }
    return factors;
}
function evaluateWarningRegistration(parsed) {
    const factors = [];
    if (parsed.summary.hasWarningRegistration) {
        factors.push({
            id: "warning_reg",
            category: "예고등기",
            description: "예고등기 존재",
            deduction: 12,
            severity: "high",
            detail: "예고등기가 설정되어 있습니다. 등기원인의 무효·취소 소송이 진행 중이며, 소유권 변동 가능성이 있습니다."
        });
    }
    return factors;
}
function evaluateRedemption(parsed) {
    const factors = [];
    if (parsed.summary.hasRedemptionRegistration) {
        factors.push({
            id: "redemption",
            category: "환매등기",
            description: "환매등기 존재",
            deduction: 10,
            severity: "medium",
            detail: "환매등기가 설정되어 있습니다. 매도인의 환매권 행사로 소유권이 원복될 수 있습니다."
        });
    }
    return factors;
}
function evaluateMultipleMortgages(parsed) {
    const factors = [];
    const activeMortgages = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && !e.isCancelled).length;
    if (activeMortgages >= 3) {
        factors.push({
            id: "multi_mortgage",
            category: "근저당",
            description: "다수 근저당 설정",
            deduction: 10,
            severity: "medium",
            detail: `현행 근저당이 ${activeMortgages}건 설정되어 있습니다. 다수의 채권자가 존재하여 권리관계가 복잡합니다.`
        });
    }
    return factors;
}
// ─── 용도 불일치 경고 ───
function evaluatePropertyPurpose(parsed) {
    const factors = [];
    const purpose = parsed.title?.purpose || "";
    if (!purpose) return factors;
    // 비주거용 용도인데 전세/임대차 계약 → 주택임대차보호법 미적용 위험
    const nonResidential = /근린생활시설|업무시설|제[12]종근린생활시설/.test(purpose);
    if (nonResidential) {
        factors.push({
            id: "non_residential_purpose",
            category: "용도",
            description: "등기부상 비주거용 건물",
            deduction: 15,
            severity: "high",
            detail: `등기부상 용도가 '${purpose}'입니다. 비주거용 건물은 전세자금 대출이 거부될 수 있으며, 전입신고 및 확정일자가 불가하여 주택임대차보호법에 의한 보호를 받지 못할 수 있습니다. 실제 용도와 등기부 용도가 일치하는지 반드시 확인하세요.`
        });
    }
    return factors;
}
// ─── 위험요소 상호작용 매트릭스 ───
const INTERACTION_RULES = [
    {
        id: "seizure_auction",
        factors: [
            "seizure",
            "auction"
        ],
        amplifier: 1.5,
        description: "압류 + 경매개시: 진행 중인 강제처분 절차",
        rationale: "압류와 경매가 동시 진행 시 소유권 상실이 거의 확정적이며, 보증금 회수 가능성이 급격히 하락합니다."
    },
    {
        id: "multi_mortgage_high_ratio",
        factors: [
            "multi_mortgage",
            "mortgage_high"
        ],
        amplifier: 1.3,
        description: "다수 근저당 + 높은 근저당비율: 과도한 채무부담",
        rationale: "복수 채권자에게 과도한 담보가 설정된 상태로, 채무불이행 시 연쇄적 권리행사가 발생합니다."
    },
    {
        id: "trust_mortgage",
        factors: [
            "trust",
            "multi_mortgage"
        ],
        amplifier: 1.4,
        description: "신탁 + 다수 근저당: 복잡한 권리관계",
        rationale: "신탁 부동산에 다수 근저당이 설정된 경우, 수탁자·위탁자·채권자 간 이해관계가 극히 복잡합니다."
    },
    {
        id: "seizure_lease",
        factors: [
            "seizure",
            "lease_registration"
        ],
        amplifier: 1.6,
        description: "압류 + 임차권등기: 임차인 최악 시나리오",
        rationale: "기존 임차인의 보증금 미반환(임차권등기)에 더해 압류까지 진행 중이면, 후순위 임차인의 보증금 회수가 극히 어렵습니다."
    },
    {
        id: "auction_extreme_mortgage",
        factors: [
            "auction",
            "mortgage_extreme"
        ],
        amplifier: 1.7,
        description: "경매 + 초과채권: 회수 불가능 상태",
        rationale: "경매가 진행 중이며 채권이 시세를 초과하여 배당으로도 보증금 회수가 불가능합니다."
    },
    {
        id: "seizure_disposition",
        factors: [
            "seizure",
            "disposition"
        ],
        amplifier: 1.3,
        description: "압류 + 가처분: 복합 법적 분쟁",
        rationale: "재산 압류와 처분 금지가 동시에 걸린 상태로, 복수의 법적 분쟁이 진행 중입니다."
    }
];
function evaluateInteractions(factors) {
    const factorIds = new Set(factors.map((f)=>f.id));
    const appliedRules = [];
    let totalPenalty = 0;
    for (const rule of INTERACTION_RULES){
        // mortgage_high 패턴: mortgage_로 시작하는 모든 팩터 매칭
        const matched = rule.factors.every((ruleFactorId)=>{
            if (ruleFactorId.includes("*")) {
                const prefix = ruleFactorId.replace("*", "");
                return factors.some((f)=>f.id.startsWith(prefix));
            }
            return factorIds.has(ruleFactorId);
        });
        if (!matched) continue;
        // 매칭된 팩터들의 감점 합산
        const matchedFactors = rule.factors.map((rf)=>{
            if (rf.includes("*")) {
                const prefix = rf.replace("*", "");
                return factors.find((f)=>f.id.startsWith(prefix));
            }
            return factors.find((f)=>f.id === rf);
        }).filter(Boolean);
        const baseDeduction = matchedFactors.reduce((sum, f)=>sum + f.deduction, 0);
        const amplifiedDeduction = Math.round(baseDeduction * rule.amplifier);
        const additional = amplifiedDeduction - baseDeduction;
        appliedRules.push({
            ruleId: rule.id,
            matchedFactors: matchedFactors.map((f)=>f.id),
            baseDeduction,
            amplifiedDeduction,
            additionalDeduction: additional,
            description: rule.description
        });
        totalPenalty += additional;
    }
    return {
        appliedRules,
        totalInteractionPenalty: totalPenalty
    };
}
// ─── 시계열 이상 패턴 탐지 ───
function dateToMonths(dateStr) {
    const parts = dateStr.split(".");
    if (parts.length < 3) return 0;
    return parseInt(parts[0], 10) * 12 + parseInt(parts[1], 10);
}
function monthsBetween(d1, d2) {
    return Math.abs(dateToMonths(d1) - dateToMonths(d2));
}
function detectTemporalPatterns(parsed) {
    const patterns = [];
    // 1. 급속 소유권이전: 5년(60개월) 내 3회 이상 이전
    const ownershipTransfers = parsed.gapgu.filter((e)=>e.purpose === "소유권이전" && !e.isCancelled && e.date).sort((a, b)=>dateToMonths(a.date) - dateToMonths(b.date));
    if (ownershipTransfers.length >= 3) {
        for(let i = 0; i <= ownershipTransfers.length - 3; i++){
            const span = monthsBetween(ownershipTransfers[i].date, ownershipTransfers[i + 2].date);
            if (span <= 60) {
                const transfersInWindow = ownershipTransfers.filter((t)=>{
                    const m = dateToMonths(t.date);
                    return m >= dateToMonths(ownershipTransfers[i].date) && m <= dateToMonths(ownershipTransfers[i].date) + 60;
                });
                patterns.push({
                    id: `rapid_transfer_${i}`,
                    patternType: "rapid_transfer",
                    severity: transfersInWindow.length >= 4 ? "critical" : "high",
                    confidence: Math.min(1, transfersInWindow.length / 5),
                    description: `${span}개월 내 소유권이 ${transfersInWindow.length}회 이전되었습니다. 투기성 거래 또는 하자 물건 의심.`,
                    evidence: transfersInWindow.map((t)=>({
                            date: t.date,
                            event: `소유권이전 → ${t.holder}`
                        })),
                    timespan: {
                        startDate: ownershipTransfers[i].date,
                        endDate: transfersInWindow[transfersInWindow.length - 1].date,
                        durationMonths: span
                    }
                });
                break; // 첫 번째 패턴만 감지
            }
        }
    }
    // 2. 압류 전 근저당 설정: 압류 6개월 이내에 근저당 추가
    const seizures = parsed.gapgu.filter((e)=>(e.purpose === "압류" || e.purpose === "가압류") && !e.isCancelled && e.date);
    const mortgages = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && !e.isCancelled && e.date);
    for (const seizure of seizures){
        const preMortgages = mortgages.filter((m)=>{
            const gap = monthsBetween(m.date, seizure.date);
            return gap <= 6 && dateToMonths(m.date) <= dateToMonths(seizure.date);
        });
        if (preMortgages.length > 0) {
            patterns.push({
                id: `pre_seizure_mortgage_${seizure.date}`,
                patternType: "pre_seizure_mortgage",
                severity: "critical",
                confidence: 0.9,
                description: `압류(${seizure.date}) 6개월 이내에 근저당 ${preMortgages.length}건이 설정되었습니다. 재산은닉 또는 채무가중 패턴.`,
                evidence: [
                    ...preMortgages.map((m)=>({
                            date: m.date,
                            event: `근저당 설정 (${m.holder})`
                        })),
                    {
                        date: seizure.date,
                        event: `${seizure.purpose} (${seizure.holder})`
                    }
                ],
                timespan: {
                    startDate: preMortgages[0].date,
                    endDate: seizure.date,
                    durationMonths: monthsBetween(preMortgages[0].date, seizure.date)
                }
            });
        }
    }
    // 3. 채권 가속: 12개월 내 2건 이상 압류/가압류
    if (seizures.length >= 2) {
        const sortedSeizures = [
            ...seizures
        ].sort((a, b)=>dateToMonths(a.date) - dateToMonths(b.date));
        for(let i = 0; i < sortedSeizures.length - 1; i++){
            const span = monthsBetween(sortedSeizures[i].date, sortedSeizures[i + 1].date);
            if (span <= 12) {
                const clusterCount = sortedSeizures.filter((s)=>{
                    const m = dateToMonths(s.date);
                    return m >= dateToMonths(sortedSeizures[i].date) && m <= dateToMonths(sortedSeizures[i].date) + 12;
                }).length;
                patterns.push({
                    id: `claim_acceleration_${i}`,
                    patternType: "claim_acceleration",
                    severity: clusterCount >= 3 ? "critical" : "high",
                    confidence: Math.min(1, clusterCount / 3),
                    description: `12개월 내 ${clusterCount}건의 압류/가압류가 집중 발생. 채무자의 재정위기 상태.`,
                    evidence: sortedSeizures.slice(i, i + clusterCount).map((s)=>({
                            date: s.date,
                            event: `${s.purpose} (${s.holder})`
                        })),
                    timespan: {
                        startDate: sortedSeizures[i].date,
                        endDate: sortedSeizures[Math.min(i + clusterCount - 1, sortedSeizures.length - 1)].date,
                        durationMonths: span
                    }
                });
                break;
            }
        }
    }
    // 4. 근저당 누적: 3개월 이내 연속 근저당 설정
    if (mortgages.length >= 2) {
        const sortedMortgages = [
            ...mortgages
        ].sort((a, b)=>dateToMonths(a.date) - dateToMonths(b.date));
        for(let i = 0; i < sortedMortgages.length - 1; i++){
            const gap = monthsBetween(sortedMortgages[i].date, sortedMortgages[i + 1].date);
            if (gap <= 3) {
                const cluster = sortedMortgages.filter((m)=>{
                    const mMonth = dateToMonths(m.date);
                    return mMonth >= dateToMonths(sortedMortgages[i].date) && mMonth <= dateToMonths(sortedMortgages[i].date) + 3;
                });
                if (cluster.length >= 2) {
                    patterns.push({
                        id: `mortgage_stacking_${i}`,
                        patternType: "mortgage_stacking",
                        severity: "high",
                        confidence: 0.8,
                        description: `3개월 이내 근저당 ${cluster.length}건이 연속 설정. 과잉 레버리지 패턴.`,
                        evidence: cluster.map((m)=>({
                                date: m.date,
                                event: `근저당 설정 (${m.holder}, ${(m.amount / 100_000_000).toFixed(1)}억원)`
                            })),
                        timespan: {
                            startDate: cluster[0].date,
                            endDate: cluster[cluster.length - 1].date,
                            durationMonths: monthsBetween(cluster[0].date, cluster[cluster.length - 1].date)
                        }
                    });
                    break;
                }
            }
        }
    }
    // 5. 의심스러운 근저당 말소: 설정 후 6개월 이내 말소 (위조 의심)
    const cancelledMortgages = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && e.isCancelled && e.date);
    // 말소된 근저당의 설정일과 말소일을 추정 (같은 순위번호의 설정-말소 쌍)
    const activeMortgagesAll = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && e.date);
    // 같은 순위에서 설정과 말소를 매칭
    for (const cancelled of cancelledMortgages){
        // 같은 순위의 원래 설정 항목 찾기 (말소되지 않은 동일 순위 or 동일 holder)
        const original = activeMortgagesAll.find((m)=>m.order === cancelled.order && !m.isCancelled && m.date);
        const setupDate = original?.date || cancelled.date;
        const cancelDate = cancelled.date;
        if (setupDate && cancelDate) {
            const gap = monthsBetween(setupDate, cancelDate);
            // 패턴 5a: 설정 후 6개월 이내 말소 → 비정상적으로 빠른 상환
            if (gap <= 6 && gap > 0 && cancelled.amount > 0) {
                patterns.push({
                    id: `suspicious_cancel_${cancelled.order}`,
                    patternType: "suspicious_cancellation",
                    severity: "high",
                    confidence: gap <= 3 ? 0.9 : 0.7,
                    description: `근저당(${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)이 설정 후 ${gap}개월 만에 말소되었습니다. 수억원 대출을 단기간에 상환하는 것은 통계적으로 드물며, 말소 서류 위조 가능성을 배제할 수 없습니다. 해당 금융기관에 직접 연락하여 정상 상환 여부를 확인하세요.`,
                    evidence: [
                        {
                            date: setupDate,
                            event: `근저당 설정 (${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)`
                        },
                        {
                            date: cancelDate,
                            event: `근저당 말소 (${gap}개월 만에 해제)`
                        }
                    ],
                    timespan: {
                        startDate: setupDate,
                        endDate: cancelDate,
                        durationMonths: gap
                    }
                });
            }
        }
    }
    // 6. 근저당 말소 직후 매매 (1개월 이내): "깨끗한 등기" 조작 의심
    for (const cancelled of cancelledMortgages){
        const cancelDate = cancelled.date;
        if (!cancelDate) continue;
        const salesAfterCancel = ownershipTransfers.filter((t)=>{
            const gap = monthsBetween(cancelDate, t.date);
            return gap <= 1 && dateToMonths(t.date) >= dateToMonths(cancelDate);
        });
        if (salesAfterCancel.length > 0) {
            patterns.push({
                id: `cancel_before_sale_${cancelled.order}`,
                patternType: "cancel_before_sale",
                severity: "high",
                confidence: 0.8,
                description: `근저당 말소(${cancelDate}) 직후 1개월 이내에 소유권이 이전되었습니다. 매매를 위해 등기부를 '깨끗하게' 만든 정황이므로, 해당 금융기관에 정상 상환 여부를 반드시 확인하세요.`,
                evidence: [
                    {
                        date: cancelDate,
                        event: `근저당 말소 (${cancelled.holder})`
                    },
                    ...salesAfterCancel.map((s)=>({
                            date: s.date,
                            event: `소유권이전 → ${s.holder}`
                        }))
                ],
                timespan: {
                    startDate: cancelDate,
                    endDate: salesAfterCancel[0].date,
                    durationMonths: monthsBetween(cancelDate, salesAfterCancel[0].date)
                }
            });
            break;
        }
    }
    // 7. 같은 날 복수 근저당 동시 말소: 여러 은행 대출 동시 상환은 비정상
    const cancelDates = cancelledMortgages.filter((e)=>e.date && e.amount > 0).map((e)=>e.date);
    const cancelDateCounts = {};
    for (const d of cancelDates){
        cancelDateCounts[d] = (cancelDateCounts[d] || 0) + 1;
    }
    for (const [date, count] of Object.entries(cancelDateCounts)){
        if (count >= 2) {
            const simultaneous = cancelledMortgages.filter((e)=>e.date === date);
            const totalAmount = simultaneous.reduce((s, e)=>s + e.amount, 0);
            patterns.push({
                id: `simultaneous_cancel_${date}`,
                patternType: "simultaneous_cancellation",
                severity: "high",
                confidence: 0.75,
                description: `같은 날(${date}) ${count}건의 근저당(합계 ${(totalAmount / 100_000_000).toFixed(1)}억원)이 동시에 말소되었습니다. 복수 금융기관 대출을 동시에 상환하는 것은 이례적이며, 말소 서류 일괄 위조 가능성이 있습니다.`,
                evidence: simultaneous.map((e)=>({
                        date: e.date,
                        event: `근저당 말소 (${e.holder}, ${(e.amount / 100_000_000).toFixed(1)}억원)`
                    })),
                timespan: {
                    startDate: date,
                    endDate: date,
                    durationMonths: 0
                }
            });
        }
    }
    // 8. 고액 근저당 말소인데 소유자 변경 없음: 자금 출처 의문
    const highValueCancelled = cancelledMortgages.filter((e)=>e.amount >= 200_000_000); // 2억 이상
    for (const cancelled of highValueCancelled){
        if (!cancelled.date) continue;
        // 말소 전후 6개월 내 소유권이전이 없으면 의심
        const nearbyTransfers = ownershipTransfers.filter((t)=>{
            const gap = monthsBetween(cancelled.date, t.date);
            return gap <= 6;
        });
        if (nearbyTransfers.length === 0) {
            patterns.push({
                id: `cancel_no_transfer_${cancelled.order}`,
                patternType: "cancel_without_transfer",
                severity: "medium",
                confidence: 0.6,
                description: `고액 근저당(${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)이 말소되었으나 전후 6개월 내 매매(소유권이전)가 없습니다. 매매 대금 없이 고액 대출을 상환한 자금 출처를 확인할 필요가 있습니다.`,
                evidence: [
                    {
                        date: cancelled.date,
                        event: `근저당 말소 (${cancelled.holder}, ${(cancelled.amount / 100_000_000).toFixed(1)}억원)`
                    }
                ],
                timespan: {
                    startDate: cancelled.date,
                    endDate: cancelled.date,
                    durationMonths: 0
                }
            });
        }
    }
    // 전체 시계열 위험도
    const severityWeight = {
        critical: 30,
        high: 15,
        medium: 5
    };
    const overallTemporalRisk = Math.min(100, patterns.reduce((sum, p)=>sum + (severityWeight[p.severity] || 0) * p.confidence, 0));
    // 이상치 점수: 패턴 수 × 평균 신뢰도
    const avgConfidence = patterns.length > 0 ? patterns.reduce((sum, p)=>sum + p.confidence, 0) / patterns.length : 0;
    const timelineAnomalyScore = Math.min(100, patterns.length * avgConfidence * 25);
    return {
        patterns,
        overallTemporalRisk,
        timelineAnomalyScore
    };
}
function calculateRiskScore(parsed, estimatedPrice) {
    const allFactors = [];
    let totalDeduction = 0;
    // 1. 근저당 비율 평가
    const mortgageEval = evaluateMortgageRatio(parsed, estimatedPrice || 0);
    allFactors.push(...mortgageEval.factors);
    totalDeduction += mortgageEval.deduction;
    // 2. 압류/가압류 평가
    const seizureFactors = evaluateSeizure(parsed);
    allFactors.push(...seizureFactors);
    totalDeduction += seizureFactors.reduce((s, f)=>s + f.deduction, 0);
    // 3. 가처분 평가
    const dispositionFactors = evaluateDisposition(parsed);
    allFactors.push(...dispositionFactors);
    totalDeduction += dispositionFactors.reduce((s, f)=>s + f.deduction, 0);
    // 4. 경매 평가
    const auctionFactors = evaluateAuction(parsed);
    allFactors.push(...auctionFactors);
    totalDeduction += auctionFactors.reduce((s, f)=>s + f.deduction, 0);
    // 5. 가등기 평가
    const provisionalFactors = evaluateProvisionalRegistration(parsed);
    allFactors.push(...provisionalFactors);
    totalDeduction += provisionalFactors.reduce((s, f)=>s + f.deduction, 0);
    // 6. 신탁 평가
    const trustFactors = evaluateTrust(parsed);
    allFactors.push(...trustFactors);
    totalDeduction += trustFactors.reduce((s, f)=>s + f.deduction, 0);
    // 7. 소유권 이전 빈도 평가
    const ownershipFactors = evaluateOwnershipFrequency(parsed);
    allFactors.push(...ownershipFactors);
    totalDeduction += ownershipFactors.reduce((s, f)=>s + f.deduction, 0);
    // 8. 다수 근저당 평가
    const multiMortgageFactors = evaluateMultipleMortgages(parsed);
    allFactors.push(...multiMortgageFactors);
    totalDeduction += multiMortgageFactors.reduce((s, f)=>s + f.deduction, 0);
    // 9. 선순위채권 합산 분석 (근저당+전세 vs 시세)
    const totalClaimsEval = evaluateTotalClaims(parsed, estimatedPrice || 0);
    allFactors.push(...totalClaimsEval.factors);
    totalDeduction += totalClaimsEval.deduction;
    // 10. 임차권등기명령 평가
    const leaseRegFactors = evaluateLeaseRegistration(parsed);
    allFactors.push(...leaseRegFactors);
    totalDeduction += leaseRegFactors.reduce((s, f)=>s + f.deduction, 0);
    // 11. 예고등기 평가
    const warningRegFactors = evaluateWarningRegistration(parsed);
    allFactors.push(...warningRegFactors);
    totalDeduction += warningRegFactors.reduce((s, f)=>s + f.deduction, 0);
    // 12. 환매등기 평가
    const redemptionFactors = evaluateRedemption(parsed);
    allFactors.push(...redemptionFactors);
    totalDeduction += redemptionFactors.reduce((s, f)=>s + f.deduction, 0);
    // 13. 용도 불일치 경고
    const purposeFactors = evaluatePropertyPurpose(parsed);
    allFactors.push(...purposeFactors);
    totalDeduction += purposeFactors.reduce((s, f)=>s + f.deduction, 0);
    // 14. 위험요소 상호작용 평가 (비선형 증폭)
    const interactionPenalties = evaluateInteractions(allFactors);
    totalDeduction += interactionPenalties.totalInteractionPenalty;
    // 15. 시계열 이상 패턴 탐지
    const temporalPatterns = detectTemporalPatterns(parsed);
    // 시계열 위험도를 감점에 반영 (최대 20점 추가 감점)
    const temporalDeduction = Math.min(20, Math.round(temporalPatterns.overallTemporalRisk * 0.2));
    totalDeduction += temporalDeduction;
    // 최종 점수 계산 (최소 0점)
    const totalScore = Math.max(0, 100 - totalDeduction);
    const grade = getGrade(totalScore);
    const { label: gradeLabel, color: gradeColor } = GRADE_MAP[grade];
    // 요약 생성
    const summary = generateSummary(totalScore, grade, gradeLabel, allFactors, parsed);
    return {
        totalScore,
        grade,
        gradeLabel,
        gradeColor,
        factors: allFactors.sort((a, b)=>b.deduction - a.deduction),
        mortgageRatio: mortgageEval.ratio,
        totalDeduction,
        summary,
        interactionPenalties,
        temporalPatterns
    };
}
function generateSummary(score, grade, gradeLabel, factors, parsed) {
    const parts = [];
    parts.push(`종합 안전등급 ${grade}등급 (${gradeLabel}, ${score}점/100점).`);
    const criticalCount = factors.filter((f)=>f.severity === "critical").length;
    const highCount = factors.filter((f)=>f.severity === "high").length;
    if (criticalCount > 0) {
        parts.push(`치명적 위험요소 ${criticalCount}건 발견.`);
    }
    if (highCount > 0) {
        parts.push(`고위험 요소 ${highCount}건 발견.`);
    }
    if (factors.length === 0) {
        parts.push("특이 위험요소가 발견되지 않았습니다.");
    }
    const { activeGapguEntries, activeEulguEntries } = parsed.summary;
    parts.push(`현행 갑구 ${activeGapguEntries}건, 을구 ${activeEulguEntries}건.`);
    return parts.join(" ");
}
}),
"[project]/lib/validation-engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 데이터 검증 엔진
 * ───────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 등기부등본 파싱 결과를 4단계로 검증하여 데이터 신뢰도를 정량 평가.
 *
 * 4단계 검증 체계:
 *  1. 포맷 및 타입 검증 (Format & Type)
 *  2. 합계 및 산술 검증 (Sum & Arithmetic)
 *  3. 문맥 및 규칙 검증 (Context & Rule)
 *  4. 크로스체크 검증 (Cross-Check)
 */ __turbopack_context__.s([
    "validateParsedRegistry",
    ()=>validateParsedRegistry
]);
// ─── 상수 ───
const VALID_RISK_TYPES = [
    "danger",
    "warning",
    "safe",
    "info"
];
const MIN_REASONABLE_PRICE = 50_000_000; // 5천만원
const MAX_REASONABLE_PRICE = 50_000_000_000; // 500억원
const MIN_REASONABLE_AMOUNT = 1_000_000; // 100만원
const MAX_REASONABLE_AMOUNT = 50_000_000_000; // 500억원
const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 2035;
// ─── A1. 포맷 및 타입 검증 ───
/** 날짜 형식 검증 (YYYY.MM.DD, 합리적 범위) */ function validateDateFormat(date, field) {
    if (!date || date === "") {
        return {
            id: "FMT_DATE_EMPTY",
            category: "format",
            severity: "warning",
            field,
            message: `${field}: 날짜가 비어 있습니다.`,
            expected: "YYYY.MM.DD 형식",
            actual: "(빈 값)"
        };
    }
    const m = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
    if (!m) {
        return {
            id: "FMT_DATE_PATTERN",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 날짜 형식이 올바르지 않습니다.`,
            expected: "YYYY.MM.DD",
            actual: date
        };
    }
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (year < MIN_DATE_YEAR || year > MAX_DATE_YEAR) {
        return {
            id: "FMT_DATE_YEAR",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 연도(${year})가 합리적 범위(${MIN_DATE_YEAR}~${MAX_DATE_YEAR}) 밖입니다.`,
            expected: `${MIN_DATE_YEAR}~${MAX_DATE_YEAR}`,
            actual: String(year)
        };
    }
    if (month < 1 || month > 12) {
        return {
            id: "FMT_DATE_MONTH",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 월(${month})이 유효하지 않습니다.`,
            expected: "01~12",
            actual: String(month)
        };
    }
    if (day < 1 || day > 31) {
        return {
            id: "FMT_DATE_DAY",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 일(${day})이 유효하지 않습니다.`,
            expected: "01~31",
            actual: String(day)
        };
    }
    return null;
}
/** 금액 형식 검증 (양수, 합리적 범위) */ function validateAmountFormat(amount, field) {
    if (amount === 0) return null; // 0은 미설정으로 허용
    if (amount < 0) {
        return {
            id: "FMT_AMOUNT_NEGATIVE",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 금액이 음수(${amount.toLocaleString()}원)입니다.`,
            expected: "0 이상",
            actual: String(amount)
        };
    }
    if (amount > 0 && amount < MIN_REASONABLE_AMOUNT) {
        return {
            id: "FMT_AMOUNT_TOO_LOW",
            category: "format",
            severity: "warning",
            field,
            message: `${field}: 금액(${amount.toLocaleString()}원)이 부동산 등기로서 비정상적으로 낮습니다.`,
            expected: `${MIN_REASONABLE_AMOUNT.toLocaleString()}원 이상`,
            actual: `${amount.toLocaleString()}원`
        };
    }
    if (amount > MAX_REASONABLE_AMOUNT) {
        return {
            id: "FMT_AMOUNT_TOO_HIGH",
            category: "format",
            severity: "warning",
            field,
            message: `${field}: 금액(${(amount / 100_000_000).toFixed(1)}억원)이 비정상적으로 높습니다.`,
            expected: `${(MAX_REASONABLE_AMOUNT / 100_000_000).toFixed(0)}억원 이하`,
            actual: `${(amount / 100_000_000).toFixed(1)}억원`
        };
    }
    return null;
}
/** 순위번호 순차 검증 */ function validateEntryOrder(entries, section) {
    const issues = [];
    if (entries.length === 0) return issues;
    const orders = entries.map((e)=>e.order);
    // 중복 순위번호 검사
    const seen = new Set();
    for (const order of orders){
        if (seen.has(order)) {
            issues.push({
                id: "FMT_ORDER_DUPLICATE",
                category: "format",
                severity: "warning",
                field: `${section}.order`,
                message: `${section}: 순위번호 ${order}이(가) 중복됩니다.`,
                expected: "고유한 순위번호",
                actual: `${order} (중복)`
            });
        }
        seen.add(order);
    }
    // 음수 또는 0 순위번호
    for (const order of orders){
        if (order <= 0) {
            issues.push({
                id: "FMT_ORDER_INVALID",
                category: "format",
                severity: "error",
                field: `${section}.order`,
                message: `${section}: 순위번호(${order})가 유효하지 않습니다.`,
                expected: "1 이상 양수",
                actual: String(order)
            });
        }
    }
    return issues;
}
/** 권리자명 검증 */ function validateHolderName(holder, field) {
    if (!holder || holder === "") {
        return {
            id: "FMT_HOLDER_EMPTY",
            category: "format",
            severity: "info",
            field,
            message: `${field}: 권리자명이 추출되지 않았습니다.`
        };
    }
    if (holder.length < 2) {
        return {
            id: "FMT_HOLDER_SHORT",
            category: "format",
            severity: "warning",
            field,
            message: `${field}: 권리자명(${holder})이 너무 짧습니다.`,
            expected: "2자 이상",
            actual: `${holder.length}자`
        };
    }
    if (holder.length > 30) {
        return {
            id: "FMT_HOLDER_LONG",
            category: "format",
            severity: "warning",
            field,
            message: `${field}: 권리자명이 비정상적으로 깁니다 (${holder.length}자).`,
            expected: "30자 이내",
            actual: `${holder.length}자`
        };
    }
    return null;
}
/** 위험유형 열거값 검증 */ function validateRiskType(riskType, field) {
    if (!VALID_RISK_TYPES.includes(riskType)) {
        return {
            id: "FMT_RISKTYPE_INVALID",
            category: "format",
            severity: "error",
            field,
            message: `${field}: 위험유형(${riskType})이 유효하지 않습니다.`,
            expected: VALID_RISK_TYPES.join(" | "),
            actual: String(riskType)
        };
    }
    return null;
}
/** 섹션 완전성 검증 */ function validateSectionCompleteness(parsed) {
    const issues = [];
    // 표제부 주소 필수
    if (!parsed.title.address || parsed.title.address.trim() === "") {
        issues.push({
            id: "FMT_SECTION_NO_ADDRESS",
            category: "format",
            severity: "warning",
            field: "title.address",
            message: "표제부에서 소재지 주소를 추출하지 못했습니다."
        });
    }
    // 갑구가 비어있는 경우
    if (parsed.gapgu.length === 0) {
        issues.push({
            id: "FMT_SECTION_NO_GAPGU",
            category: "format",
            severity: "warning",
            field: "gapgu",
            message: "갑구(소유권) 항목이 없습니다. 파싱이 실패했을 수 있습니다."
        });
    }
    return issues;
}
// ─── A2. 합계 및 산술 검증 ───
/** 근저당 합계 재계산 검증 */ function validateMortgageSum(parsed) {
    const issues = [];
    const recalculated = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && !e.isCancelled).reduce((sum, e)=>sum + e.amount, 0);
    if (recalculated !== parsed.summary.totalMortgageAmount) {
        issues.push({
            id: "ARITH_MORTGAGE_SUM",
            category: "arithmetic",
            severity: "error",
            field: "summary.totalMortgageAmount",
            message: `근저당 합계 불일치: 요약값(${parsed.summary.totalMortgageAmount.toLocaleString()}) ≠ 재계산값(${recalculated.toLocaleString()})`,
            expected: recalculated.toLocaleString(),
            actual: parsed.summary.totalMortgageAmount.toLocaleString()
        });
    }
    return issues;
}
/** 전세권 합계 재계산 검증 */ function validateJeonseSum(parsed) {
    const issues = [];
    const recalculated = parsed.eulgu.filter((e)=>/전세권/.test(e.purpose) && !e.isCancelled).reduce((sum, e)=>sum + e.amount, 0);
    if (recalculated !== parsed.summary.totalJeonseAmount) {
        issues.push({
            id: "ARITH_JEONSE_SUM",
            category: "arithmetic",
            severity: "error",
            field: "summary.totalJeonseAmount",
            message: `전세권 합계 불일치: 요약값(${parsed.summary.totalJeonseAmount.toLocaleString()}) ≠ 재계산값(${recalculated.toLocaleString()})`,
            expected: recalculated.toLocaleString(),
            actual: parsed.summary.totalJeonseAmount.toLocaleString()
        });
    }
    return issues;
}
/** 총채권액 = 근저당 + 전세 검증 */ function validateTotalClaims(parsed) {
    const issues = [];
    const expected = parsed.summary.totalMortgageAmount + parsed.summary.totalJeonseAmount;
    if (parsed.summary.totalClaimsAmount !== expected) {
        issues.push({
            id: "ARITH_TOTAL_CLAIMS",
            category: "arithmetic",
            severity: "error",
            field: "summary.totalClaimsAmount",
            message: `총채권액 불일치: 요약값(${parsed.summary.totalClaimsAmount.toLocaleString()}) ≠ 근저당(${parsed.summary.totalMortgageAmount.toLocaleString()}) + 전세(${parsed.summary.totalJeonseAmount.toLocaleString()})`,
            expected: expected.toLocaleString(),
            actual: parsed.summary.totalClaimsAmount.toLocaleString()
        });
    }
    return issues;
}
/** 근저당비율 재계산 교차검증 */ function validateMortgageRatio(parsed, estimatedPrice, riskScore) {
    const issues = [];
    if (!estimatedPrice || estimatedPrice <= 0 || !riskScore) return issues;
    const recalcRatio = parsed.summary.totalMortgageAmount / estimatedPrice * 100;
    const diff = Math.abs(recalcRatio - riskScore.mortgageRatio);
    if (diff > 0.1) {
        issues.push({
            id: "ARITH_MORTGAGE_RATIO",
            category: "arithmetic",
            severity: "warning",
            field: "riskScore.mortgageRatio",
            message: `근저당비율 불일치: 스코어링값(${riskScore.mortgageRatio.toFixed(1)}%) ≠ 재계산값(${recalcRatio.toFixed(1)}%)`,
            expected: `${recalcRatio.toFixed(1)}%`,
            actual: `${riskScore.mortgageRatio.toFixed(1)}%`
        });
    }
    return issues;
}
/** 활성 건수 재계산 검증 */ function validateActiveEntryCounts(parsed) {
    const issues = [];
    // 갑구 활성건수
    const recalcActiveGapgu = parsed.gapgu.filter((e)=>!e.isCancelled).length;
    if (recalcActiveGapgu !== parsed.summary.activeGapguEntries) {
        issues.push({
            id: "ARITH_ACTIVE_GAPGU",
            category: "arithmetic",
            severity: "error",
            field: "summary.activeGapguEntries",
            message: `갑구 활성건수 불일치: 요약값(${parsed.summary.activeGapguEntries}) ≠ 재계산값(${recalcActiveGapgu})`,
            expected: String(recalcActiveGapgu),
            actual: String(parsed.summary.activeGapguEntries)
        });
    }
    // 을구 활성건수
    const recalcActiveEulgu = parsed.eulgu.filter((e)=>!e.isCancelled).length;
    if (recalcActiveEulgu !== parsed.summary.activeEulguEntries) {
        issues.push({
            id: "ARITH_ACTIVE_EULGU",
            category: "arithmetic",
            severity: "error",
            field: "summary.activeEulguEntries",
            message: `을구 활성건수 불일치: 요약값(${parsed.summary.activeEulguEntries}) ≠ 재계산값(${recalcActiveEulgu})`,
            expected: String(recalcActiveEulgu),
            actual: String(parsed.summary.activeEulguEntries)
        });
    }
    // 전체건수 = 갑구.length + 을구.length
    if (parsed.summary.totalGapguEntries !== parsed.gapgu.length) {
        issues.push({
            id: "ARITH_TOTAL_GAPGU",
            category: "arithmetic",
            severity: "error",
            field: "summary.totalGapguEntries",
            message: `갑구 전체건수 불일치: 요약값(${parsed.summary.totalGapguEntries}) ≠ 배열길이(${parsed.gapgu.length})`,
            expected: String(parsed.gapgu.length),
            actual: String(parsed.summary.totalGapguEntries)
        });
    }
    if (parsed.summary.totalEulguEntries !== parsed.eulgu.length) {
        issues.push({
            id: "ARITH_TOTAL_EULGU",
            category: "arithmetic",
            severity: "error",
            field: "summary.totalEulguEntries",
            message: `을구 전체건수 불일치: 요약값(${parsed.summary.totalEulguEntries}) ≠ 배열길이(${parsed.eulgu.length})`,
            expected: String(parsed.eulgu.length),
            actual: String(parsed.summary.totalEulguEntries)
        });
    }
    return issues;
}
/** 소유권이전 횟수 재계산 검증 */ function validateOwnershipTransferCount(parsed) {
    const issues = [];
    const recalculated = parsed.gapgu.filter((e)=>e.purpose === "소유권이전" && !e.isCancelled).length;
    if (recalculated !== parsed.summary.ownershipTransferCount) {
        issues.push({
            id: "ARITH_OWNERSHIP_COUNT",
            category: "arithmetic",
            severity: "error",
            field: "summary.ownershipTransferCount",
            message: `소유권이전 횟수 불일치: 요약값(${parsed.summary.ownershipTransferCount}) ≠ 재계산값(${recalculated})`,
            expected: String(recalculated),
            actual: String(parsed.summary.ownershipTransferCount)
        });
    }
    return issues;
}
// ─── A3. 문맥 및 규칙 검증 ───
/** 등기 날짜 시간순 검증 */ function validateChronologicalOrder(entries, section) {
    const issues = [];
    const dated = entries.filter((e)=>e.date && e.date.length === 10);
    for(let i = 1; i < dated.length; i++){
        // 같은 날짜도 허용 (같은 날 접수 가능)
        if (dated[i].date < dated[i - 1].date) {
            issues.push({
                id: "CTX_CHRONOLOGICAL",
                category: "context",
                severity: "warning",
                field: `${section}[${dated[i].order}].date`,
                message: `${section} ${dated[i].order}번 항목(${dated[i].date})이 이전 항목(${dated[i - 1].date})보다 앞선 날짜입니다.`,
                expected: `${dated[i - 1].date} 이후`,
                actual: dated[i].date
            });
        }
    }
    return issues;
}
/** 말소등기 대응 원본 존재 검증 */ function validateCancellationLogic(parsed) {
    const issues = [];
    // 을구에서 말소 항목 확인
    for (const entry of parsed.eulgu){
        if (entry.isCancelled && entry.detail) {
            // "1번근저당권말소" 패턴에서 원본 순위번호 추출
            const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
            if (refMatch) {
                const refOrder = parseInt(refMatch[1], 10);
                const original = parsed.eulgu.find((e)=>e.order === refOrder);
                if (!original) {
                    issues.push({
                        id: "CTX_CANCEL_NO_ORIGINAL",
                        category: "context",
                        severity: "warning",
                        field: `을구[${entry.order}]`,
                        message: `을구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본 항목을 찾을 수 없습니다.`,
                        expected: `을구 ${refOrder}번 항목 존재`,
                        actual: "미발견"
                    });
                }
            }
        }
    }
    // 갑구에서도 동일
    for (const entry of parsed.gapgu){
        if (entry.isCancelled && entry.detail) {
            const refMatch = entry.detail.match(/(\d+)번[가-힣]*말소/);
            if (refMatch) {
                const refOrder = parseInt(refMatch[1], 10);
                // 갑구 말소는 자체 내 또는 을구 참조 가능
                const originalGapgu = parsed.gapgu.find((e)=>e.order === refOrder);
                const originalEulgu = parsed.eulgu.find((e)=>e.order === refOrder);
                if (!originalGapgu && !originalEulgu) {
                    issues.push({
                        id: "CTX_CANCEL_NO_ORIGINAL",
                        category: "context",
                        severity: "info",
                        field: `갑구[${entry.order}]`,
                        message: `갑구 ${entry.order}번 말소등기가 참조하는 ${refOrder}번 원본을 찾을 수 없습니다.`
                    });
                }
            }
        }
    }
    return issues;
}
/** 소유권 체인 일관성 검증 */ function validateOwnershipChain(parsed) {
    const issues = [];
    // 최종 활성 소유권이전 항목 찾기
    const ownershipEntries = parsed.gapgu.filter((e)=>(e.purpose === "소유권이전" || e.purpose === "소유권보존") && !e.isCancelled).sort((a, b)=>a.order - b.order);
    if (ownershipEntries.length === 0 && parsed.gapgu.length > 0) {
        issues.push({
            id: "CTX_NO_OWNER",
            category: "context",
            severity: "error",
            field: "gapgu",
            message: "활성 소유권(보존/이전) 항목이 없습니다. 현재 소유자를 확인할 수 없습니다."
        });
    }
    return issues;
}
/** 압류 후 근저당 설정 경고 */ function validateMortgageAfterSeizure(parsed) {
    const issues = [];
    // 활성 압류/가압류 날짜 수집
    const seizureDates = parsed.gapgu.filter((e)=>(e.purpose === "압류" || e.purpose === "가압류") && !e.isCancelled && e.date).map((e)=>e.date);
    if (seizureDates.length === 0) return issues;
    const earliestSeizure = seizureDates.sort()[0];
    // 압류 이후 설정된 근저당 확인
    const mortgagesAfterSeizure = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && !e.isCancelled && e.date && e.date > earliestSeizure);
    for (const mortgage of mortgagesAfterSeizure){
        issues.push({
            id: "CTX_MORTGAGE_AFTER_SEIZURE",
            category: "context",
            severity: "warning",
            field: `을구[${mortgage.order}]`,
            message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 압류(${earliestSeizure}) 이후에 설정되었습니다. 비정상적 거래 패턴입니다.`,
            expected: `압류(${earliestSeizure}) 이전`,
            actual: mortgage.date
        });
    }
    return issues;
}
/** 신탁 후 근저당 충돌 검증 */ function validateTrustMortgageConflict(parsed) {
    const issues = [];
    // 활성 신탁 항목
    const trustEntries = parsed.gapgu.filter((e)=>/신탁/.test(e.purpose) && !e.isCancelled && e.date);
    if (trustEntries.length === 0) return issues;
    const trustDate = trustEntries[0].date;
    // 신탁 이후 설정된 근저당 (수탁자 동의 없이는 불가)
    const mortgagesAfterTrust = parsed.eulgu.filter((e)=>/근저당|저당/.test(e.purpose) && !e.isCancelled && e.date && e.date > trustDate);
    for (const mortgage of mortgagesAfterTrust){
        issues.push({
            id: "CTX_TRUST_MORTGAGE_CONFLICT",
            category: "context",
            severity: "warning",
            field: `을구[${mortgage.order}]`,
            message: `을구 ${mortgage.order}번 근저당(${mortgage.date})이 신탁등기(${trustDate}) 이후에 설정되었습니다. 수탁자 동의 여부를 확인하세요.`,
            expected: "신탁 이전 또는 수탁자 동의",
            actual: `신탁(${trustDate}) 후 근저당(${mortgage.date})`
        });
    }
    return issues;
}
/** 갑구 1번 항목 규칙 검증 */ function validateFirstEntryRule(parsed) {
    const issues = [];
    if (parsed.gapgu.length === 0) return issues;
    const first = parsed.gapgu[0];
    const isValidFirst = first.purpose === "소유권보존" || first.purpose === "소유권이전";
    if (!isValidFirst) {
        issues.push({
            id: "CTX_FIRST_ENTRY",
            category: "context",
            severity: "warning",
            field: "갑구[1]",
            message: `갑구 1번 항목이 '${first.purpose}'입니다. 일반적으로 '소유권보존' 또는 '소유권이전'이어야 합니다.`,
            expected: "소유권보존 또는 소유권이전",
            actual: first.purpose
        });
    }
    return issues;
}
/** 소유권 없이 을구만 있는 경우 검증 */ function validateEulguWithoutOwnership(parsed) {
    const issues = [];
    if (parsed.eulgu.length === 0) return issues;
    const hasOwnership = parsed.gapgu.some((e)=>(e.purpose === "소유권이전" || e.purpose === "소유권보존") && !e.isCancelled);
    if (!hasOwnership) {
        issues.push({
            id: "CTX_EULGU_NO_OWNER",
            category: "context",
            severity: "error",
            field: "을구",
            message: "활성 소유권 항목이 없는데 을구(권리) 항목이 존재합니다. 등기부 구조가 비정상적입니다."
        });
    }
    return issues;
}
// ─── A4. 크로스체크 검증 ───
/** ParseSummary 불리언 플래그 vs 실제 엔트리 교차검증 */ function validateSummaryFlags(parsed) {
    const issues = [];
    const activeGapgu = parsed.gapgu.filter((e)=>!e.isCancelled);
    const activeEulgu = parsed.eulgu.filter((e)=>!e.isCancelled);
    const flagChecks = [
        {
            flag: "hasSeizure",
            label: "압류",
            actual: parsed.summary.hasSeizure,
            expected: activeGapgu.some((e)=>e.purpose === "압류")
        },
        {
            flag: "hasProvisionalSeizure",
            label: "가압류",
            actual: parsed.summary.hasProvisionalSeizure,
            expected: activeGapgu.some((e)=>e.purpose === "가압류")
        },
        {
            flag: "hasProvisionalDisposition",
            label: "가처분",
            actual: parsed.summary.hasProvisionalDisposition,
            expected: activeGapgu.some((e)=>e.purpose === "가처분")
        },
        {
            flag: "hasAuctionOrder",
            label: "경매개시결정",
            actual: parsed.summary.hasAuctionOrder,
            expected: activeGapgu.some((e)=>/경매개시결정/.test(e.purpose))
        },
        {
            flag: "hasTrust",
            label: "신탁",
            actual: parsed.summary.hasTrust,
            expected: activeGapgu.some((e)=>/신탁/.test(e.purpose))
        },
        {
            flag: "hasProvisionalRegistration",
            label: "가등기",
            actual: parsed.summary.hasProvisionalRegistration,
            expected: [
                ...activeGapgu,
                ...activeEulgu
            ].some((e)=>e.purpose === "가등기")
        },
        {
            flag: "hasLeaseRegistration",
            label: "임차권등기",
            actual: parsed.summary.hasLeaseRegistration,
            expected: activeEulgu.some((e)=>/임차권등기|임차권설정/.test(e.purpose))
        },
        {
            flag: "hasWarningRegistration",
            label: "예고등기",
            actual: parsed.summary.hasWarningRegistration,
            expected: activeGapgu.some((e)=>e.purpose === "예고등기")
        },
        {
            flag: "hasRedemptionRegistration",
            label: "환매등기",
            actual: parsed.summary.hasRedemptionRegistration,
            expected: activeGapgu.some((e)=>/환매/.test(e.purpose))
        }
    ];
    for (const check of flagChecks){
        if (check.actual !== check.expected) {
            issues.push({
                id: `XCHK_FLAG_${String(check.flag).toUpperCase()}`,
                category: "crosscheck",
                severity: "error",
                field: `summary.${String(check.flag)}`,
                message: `${check.label} 플래그 불일치: 요약값(${check.actual}) ≠ 실제 엔트리 기반(${check.expected})`,
                expected: String(check.expected),
                actual: String(check.actual)
            });
        }
    }
    return issues;
}
/** 추정가격 합리성 검증 */ function validateEstimatedPriceSanity(estimatedPrice) {
    const issues = [];
    if (estimatedPrice <= 0) return issues;
    if (estimatedPrice < MIN_REASONABLE_PRICE) {
        issues.push({
            id: "XCHK_PRICE_SANITY",
            category: "crosscheck",
            severity: "error",
            field: "estimatedPrice",
            message: `추정가격(${(estimatedPrice / 10000).toLocaleString()}만원)이 한국 부동산으로서 비정상적으로 낮습니다.`,
            expected: `${(MIN_REASONABLE_PRICE / 100_000_000).toFixed(1)}억원 이상`,
            actual: `${(estimatedPrice / 100_000_000).toFixed(2)}억원`
        });
    }
    if (estimatedPrice > MAX_REASONABLE_PRICE) {
        issues.push({
            id: "XCHK_PRICE_SANITY",
            category: "crosscheck",
            severity: "warning",
            field: "estimatedPrice",
            message: `추정가격(${(estimatedPrice / 100_000_000).toFixed(0)}억원)이 비정상적으로 높습니다.`,
            expected: `${(MAX_REASONABLE_PRICE / 100_000_000).toFixed(0)}억원 이하`,
            actual: `${(estimatedPrice / 100_000_000).toFixed(0)}억원`
        });
    }
    return issues;
}
/** 리스크 스코어 팩터 vs 파싱 데이터 일치 검증 */ function validateRiskScoreConsistency(parsed, riskScore) {
    const issues = [];
    // 팩터 ID → 요약 플래그 매핑
    const factorFlagMap = [
        {
            factorId: "seizure",
            flagKey: "hasSeizure",
            label: "압류"
        },
        {
            factorId: "provisional_seizure",
            flagKey: "hasProvisionalSeizure",
            label: "가압류"
        },
        {
            factorId: "disposition",
            flagKey: "hasProvisionalDisposition",
            label: "가처분"
        },
        {
            factorId: "auction",
            flagKey: "hasAuctionOrder",
            label: "경매"
        },
        {
            factorId: "trust",
            flagKey: "hasTrust",
            label: "신탁"
        },
        {
            factorId: "provisional_reg",
            flagKey: "hasProvisionalRegistration",
            label: "가등기"
        },
        {
            factorId: "lease_registration",
            flagKey: "hasLeaseRegistration",
            label: "임차권등기"
        },
        {
            factorId: "warning_reg",
            flagKey: "hasWarningRegistration",
            label: "예고등기"
        },
        {
            factorId: "redemption",
            flagKey: "hasRedemptionRegistration",
            label: "환매등기"
        }
    ];
    for (const map of factorFlagMap){
        const hasFactor = riskScore.factors.some((f)=>f.id === map.factorId);
        const hasFlag = parsed.summary[map.flagKey];
        // 팩터는 있는데 플래그는 false → 비정상
        if (hasFactor && !hasFlag) {
            issues.push({
                id: `XCHK_FACTOR_${map.factorId.toUpperCase()}`,
                category: "crosscheck",
                severity: "error",
                field: `riskScore.factors.${map.factorId}`,
                message: `${map.label} 리스크 팩터가 존재하지만 파싱 요약에서는 false입니다.`,
                expected: `summary.${String(map.flagKey)} === true`,
                actual: "false"
            });
        }
        // 플래그는 true인데 팩터 없음 → 스코어링 누락 가능
        if (hasFlag && !hasFactor) {
            issues.push({
                id: `XCHK_MISSING_FACTOR_${map.factorId.toUpperCase()}`,
                category: "crosscheck",
                severity: "info",
                field: `riskScore.factors`,
                message: `${map.label}이(가) 파싱에서 감지되었으나 리스크 팩터에 포함되지 않았습니다.`
            });
        }
    }
    // 총감점 검증
    const recalcDeduction = riskScore.factors.reduce((sum, f)=>sum + f.deduction, 0);
    if (recalcDeduction !== riskScore.totalDeduction) {
        issues.push({
            id: "XCHK_DEDUCTION_SUM",
            category: "crosscheck",
            severity: "error",
            field: "riskScore.totalDeduction",
            message: `총감점 불일치: 기록값(${riskScore.totalDeduction}) ≠ 팩터합산(${recalcDeduction})`,
            expected: String(recalcDeduction),
            actual: String(riskScore.totalDeduction)
        });
    }
    // 점수 = 100 - 감점 검증
    const expectedScore = Math.max(0, 100 - riskScore.totalDeduction);
    if (riskScore.totalScore !== expectedScore) {
        issues.push({
            id: "XCHK_SCORE_CALC",
            category: "crosscheck",
            severity: "error",
            field: "riskScore.totalScore",
            message: `점수 계산 불일치: 기록값(${riskScore.totalScore}) ≠ max(0, 100-${riskScore.totalDeduction})=${expectedScore}`,
            expected: String(expectedScore),
            actual: String(riskScore.totalScore)
        });
    }
    return issues;
}
/** AI 의견 관련성 검증 (소프트 체크) */ function validateAiOpinionRelevance(parsed, aiOpinion) {
    const issues = [];
    if (!aiOpinion || aiOpinion.length < 10) return issues;
    const criticalChecks = [
        {
            flag: "hasSeizure",
            keywords: [
                "압류"
            ],
            label: "압류"
        },
        {
            flag: "hasAuctionOrder",
            keywords: [
                "경매"
            ],
            label: "경매"
        },
        {
            flag: "hasTrust",
            keywords: [
                "신탁"
            ],
            label: "신탁"
        },
        {
            flag: "hasLeaseRegistration",
            keywords: [
                "임차권",
                "임차권등기"
            ],
            label: "임차권등기"
        }
    ];
    for (const check of criticalChecks){
        if (parsed.summary[check.flag]) {
            const mentioned = check.keywords.some((kw)=>aiOpinion.includes(kw));
            if (!mentioned) {
                issues.push({
                    id: `XCHK_AI_MISSING_${check.label}`,
                    category: "crosscheck",
                    severity: "info",
                    field: "aiOpinion",
                    message: `AI 의견에서 '${check.label}' 관련 위험이 언급되지 않았습니다. (감지됨: ${check.label})`
                });
            }
        }
    }
    return issues;
}
function validateParsedRegistry(parsed, estimatedPrice, riskScore, aiOpinion) {
    const issues = [];
    let totalChecks = 0;
    // ══════════════════════════════════════
    // A1: 포맷 및 타입 검증
    // ══════════════════════════════════════
    // 갑구 항목별 검증
    for (const entry of parsed.gapgu){
        totalChecks++;
        const dateIssue = validateDateFormat(entry.date, `갑구[${entry.order}].date`);
        if (dateIssue) issues.push(dateIssue);
        totalChecks++;
        const holderIssue = validateHolderName(entry.holder, `갑구[${entry.order}].holder`);
        if (holderIssue) issues.push(holderIssue);
        totalChecks++;
        const riskIssue = validateRiskType(entry.riskType, `갑구[${entry.order}].riskType`);
        if (riskIssue) issues.push(riskIssue);
    }
    // 을구 항목별 검증
    for (const entry of parsed.eulgu){
        totalChecks++;
        const dateIssue = validateDateFormat(entry.date, `을구[${entry.order}].date`);
        if (dateIssue) issues.push(dateIssue);
        totalChecks++;
        const amountIssue = validateAmountFormat(entry.amount, `을구[${entry.order}].amount`);
        if (amountIssue) issues.push(amountIssue);
        totalChecks++;
        const holderIssue = validateHolderName(entry.holder, `을구[${entry.order}].holder`);
        if (holderIssue) issues.push(holderIssue);
        totalChecks++;
        const riskIssue = validateRiskType(entry.riskType, `을구[${entry.order}].riskType`);
        if (riskIssue) issues.push(riskIssue);
    }
    // 순위번호 검증
    totalChecks++;
    issues.push(...validateEntryOrder(parsed.gapgu, "갑구"));
    totalChecks++;
    issues.push(...validateEntryOrder(parsed.eulgu, "을구"));
    // 섹션 완전성
    totalChecks++;
    issues.push(...validateSectionCompleteness(parsed));
    // ══════════════════════════════════════
    // A2: 합계 및 산술 검증
    // ══════════════════════════════════════
    totalChecks++;
    issues.push(...validateMortgageSum(parsed));
    totalChecks++;
    issues.push(...validateJeonseSum(parsed));
    totalChecks++;
    issues.push(...validateTotalClaims(parsed));
    totalChecks++;
    issues.push(...validateActiveEntryCounts(parsed));
    totalChecks++;
    issues.push(...validateOwnershipTransferCount(parsed));
    if (estimatedPrice && riskScore) {
        totalChecks++;
        issues.push(...validateMortgageRatio(parsed, estimatedPrice, riskScore));
    }
    // ══════════════════════════════════════
    // A3: 문맥 및 규칙 검증
    // ══════════════════════════════════════
    totalChecks++;
    issues.push(...validateChronologicalOrder(parsed.gapgu, "갑구"));
    totalChecks++;
    issues.push(...validateChronologicalOrder(parsed.eulgu, "을구"));
    totalChecks++;
    issues.push(...validateCancellationLogic(parsed));
    totalChecks++;
    issues.push(...validateOwnershipChain(parsed));
    totalChecks++;
    issues.push(...validateMortgageAfterSeizure(parsed));
    totalChecks++;
    issues.push(...validateTrustMortgageConflict(parsed));
    totalChecks++;
    issues.push(...validateFirstEntryRule(parsed));
    totalChecks++;
    issues.push(...validateEulguWithoutOwnership(parsed));
    // ══════════════════════════════════════
    // A4: 크로스체크 검증
    // ══════════════════════════════════════
    totalChecks++;
    issues.push(...validateSummaryFlags(parsed));
    if (estimatedPrice) {
        totalChecks++;
        issues.push(...validateEstimatedPriceSanity(estimatedPrice));
    }
    if (riskScore) {
        totalChecks++;
        issues.push(...validateRiskScoreConsistency(parsed, riskScore));
    }
    if (aiOpinion) {
        totalChecks++;
        issues.push(...validateAiOpinionRelevance(parsed, aiOpinion));
    }
    // ══════════════════════════════════════
    // 결과 집계
    // ══════════════════════════════════════
    const errors = issues.filter((i)=>i.severity === "error").length;
    const warnings = issues.filter((i)=>i.severity === "warning").length;
    const infos = issues.filter((i)=>i.severity === "info").length;
    const passed = totalChecks - errors - warnings;
    const score = totalChecks > 0 ? Math.round(Math.max(0, passed) / totalChecks * 100) : 100;
    return {
        isValid: errors === 0,
        score,
        issues,
        summary: {
            totalChecks,
            passed: Math.max(0, passed),
            errors,
            warnings,
            infos
        },
        timestamp: new Date().toISOString()
    };
}
}),
"[project]/lib/api-cache.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * API 응답 캐시 (인메모리 LRU)
 *
 * OpenAI / MOLIT / Court API 중복 호출 방지.
 * 동일 요청 키에 대해 TTL 내 캐시된 결과 반환.
 *
 * Vercel Serverless 환경에서는 함수 인스턴스 수명 동안 유지.
 * (cold start 시 리셋되므로 별도 외부 캐시 불필요)
 */ __turbopack_context__.s([
    "APICache",
    ()=>APICache,
    "apiCache",
    ()=>apiCache
]);
const DEFAULT_TTL = 10 * 60 * 1000; // 10분
const MAX_ENTRIES = 200;
class APICache {
    cache = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttl = DEFAULT_TTL) {
        // LRU: 최대 크기 초과 시 가장 오래된 항목 제거
        if (this.cache.size >= MAX_ENTRIES) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl
        });
    }
    /** 캐시 키 생성 (prefix + 입력값 해시) */ static makeKey(prefix, ...args) {
        const str = JSON.stringify(args);
        // 간단한 해시 (djb2)
        let hash = 5381;
        for(let i = 0; i < str.length; i++){
            hash = (hash << 5) + hash + str.charCodeAt(i) | 0;
        }
        return `${prefix}:${hash.toString(36)}`;
    }
}
const apiCache = new APICache();
}),
"[project]/lib/molit-api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

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
/**
 * VESTRA 국토교통부 실거래가 API 클라이언트
 * ─────────────────────────────────────────
 * 공공데이터포털(data.go.kr)의 국토교통부 아파트 실거래가 API를 호출.
 * XML 응답을 파싱하여 구조화된 거래 데이터로 변환.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api-cache.ts [app-route] (ecmascript)");
;
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
        // 금액 유효성: 0 이하 또는 100억 초과는 데이터 오류로 판단
        if (isNaN(dealAmount) || dealAmount <= 0 || dealAmount > 10_000_000_000) continue;
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
    // 캐시 확인 (실거래 데이터는 30분 캐시)
    const cacheKey = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["APICache"].makeKey("molit-trade", lawdCd, dealYmd);
    const cached = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiCache"].get(cacheKey);
    if (cached) return cached;
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
    const result = parseTransactions(xml);
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2d$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["apiCache"].set(cacheKey, result, 30 * 60 * 1000); // 30분
    return result;
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
    // 명시적으로 RATE_LIMIT_BYPASS=true 설정 시에만 바이패스 (로컬 개발용)
    if (process.env.RATE_LIMIT_BYPASS === "true") {
        return {
            success: true,
            remaining: limit,
            reset: Date.now() + windowMs
        };
    }
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
    // 명시적으로 RATE_LIMIT_BYPASS=true 설정 시에만 바이패스 (로컬 개발용)
    if (process.env.RATE_LIMIT_BYPASS === "true") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return {
            success: true,
            remaining: dailyLimit,
            reset: tomorrow.getTime()
        };
    }
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
    "sanitizeString",
    ()=>sanitizeString,
    "stripHtml",
    ()=>stripHtml,
    "truncateInput",
    ()=>truncateInput,
    "validateMagicBytes",
    ()=>validateMagicBytes,
    "validateRequiredFields",
    ()=>validateRequiredFields
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
function validateRequiredFields(body, requiredFields) {
    return requiredFields.filter((field)=>body[field] === undefined || body[field] === null || body[field] === "");
}
function sanitizeString(value, maxLen = 500) {
    if (value === null || value === undefined) return "";
    const str = typeof value === "string" ? value : String(value);
    return sanitizeField(str, maxLen);
}
// ---------------------------------------------------------------------------
// 파일 매직바이트 검증 (MIME 스푸핑 방어)
// ---------------------------------------------------------------------------
/** 알려진 파일 시그니처 (매직바이트) */ const FILE_SIGNATURES = {
    "application/pdf": [
        [
            0x25,
            0x50,
            0x44,
            0x46
        ]
    ],
    "image/jpeg": [
        [
            0xff,
            0xd8,
            0xff
        ]
    ],
    "image/png": [
        [
            0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a
        ]
    ],
    "image/gif": [
        [
            0x47,
            0x49,
            0x46,
            0x38,
            0x37,
            0x61
        ],
        [
            0x47,
            0x49,
            0x46,
            0x38,
            0x39,
            0x61
        ]
    ],
    "image/webp": [
        [
            0x52,
            0x49,
            0x46,
            0x46
        ]
    ]
};
function validateMagicBytes(buffer, declaredMime) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const signatures = FILE_SIGNATURES[declaredMime];
    if (!signatures) {
        // 알려지지 않은 MIME: 매직바이트 검증 스킵 (MIME 타입 체크는 별도로)
        return true;
    }
    return signatures.some((sig)=>sig.every((byte, i)=>bytes[i] === byte));
}
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
    "SCHOLAR_PROVIDERS",
    ()=>SCHOLAR_PROVIDERS,
    "decrypt",
    ()=>decrypt,
    "deleteOAuthSetting",
    ()=>deleteOAuthSetting,
    "deletePGSetting",
    ()=>deletePGSetting,
    "deleteScholarSetting",
    ()=>deleteScholarSetting,
    "encrypt",
    ()=>encrypt,
    "getOAuthSettingOrEnv",
    ()=>getOAuthSettingOrEnv,
    "getOAuthSettings",
    ()=>getOAuthSettings,
    "getPGSettings",
    ()=>getPGSettings,
    "getScholarSettings",
    ()=>getScholarSettings,
    "invalidateOAuthCache",
    ()=>invalidateOAuthCache,
    "maskValue",
    ()=>maskValue,
    "setOAuthSetting",
    ()=>setOAuthSetting,
    "setPGSetting",
    ()=>setPGSetting,
    "setScholarSetting",
    ()=>setScholarSetting
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
const SCHOLAR_PROVIDERS = [
    {
        provider: "semantic_scholar",
        label: "Semantic Scholar",
        apiKeyName: "SEMANTIC_SCHOLAR_API_KEY",
        baseUrl: "https://api.semanticscholar.org",
        description: "영문 학술논문 검색 (무료, 100req/5min)"
    },
    {
        provider: "riss",
        label: "RISS (학술연구정보서비스)",
        apiKeyName: "RISS_API_KEY",
        baseUrl: "http://openapi.riss.kr",
        description: "국내 학술논문 검색 (무료, 기관신청)"
    },
    {
        provider: "kci",
        label: "KCI (한국학술지인용색인)",
        apiKeyName: "KCI_API_KEY",
        baseUrl: "https://open.kci.go.kr",
        description: "한국연구재단 논문 검색 (무료, 신청발급)"
    }
];
async function getScholarSettings() {
    try {
        const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.findMany({
            where: {
                category: "scholar"
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
async function setScholarSetting(key, value) {
    const encrypted = encrypt(value);
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.upsert({
        where: {
            key
        },
        update: {
            value: encrypted,
            category: "scholar"
        },
        create: {
            key,
            value: encrypted,
            category: "scholar"
        }
    });
}
async function deleteScholarSetting(key) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].systemSetting.deleteMany({
        where: {
            key
        }
    });
}
}),
"[project]/lib/audit-log.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAuditLog",
    ()=>createAuditLog,
    "getAuditLogs",
    ()=>getAuditLogs,
    "getRequestMeta",
    ()=>getRequestMeta,
    "logAudit",
    ()=>logAudit,
    "logAuditWithRequest",
    ()=>logAuditWithRequest
]);
/**
 * 감사 로그 (Audit Trail) 시스템
 * ─────────────────────────────────
 * 공공사업 감리 기준 대응: 누가/언제/무엇을/어디서 모든 주요 액션을 기록.
 * - 비동기 fire-and-forget 패턴 (요청 흐름 차단 없음)
 * - 민감정보 자동 마스킹
 * - rate-limit.ts와 동일한 Prisma 패턴 사용
 *
 * @module lib/audit-log
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$system$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/system-settings.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
;
;
;
// ---------------------------------------------------------------------------
// 민감정보 마스킹 헬퍼
// ---------------------------------------------------------------------------
const SENSITIVE_KEYS = [
    "password",
    "secret",
    "token",
    "apiKey",
    "api_key",
    "clientSecret",
    "secretKey"
];
function maskSensitiveFields(obj) {
    const masked = {};
    for (const [key, value] of Object.entries(obj)){
        if (SENSITIVE_KEYS.some((sk)=>key.toLowerCase().includes(sk.toLowerCase()))) {
            masked[key] = typeof value === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$system$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["maskValue"])(value) : "****";
        } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            masked[key] = maskSensitiveFields(value);
        } else {
            masked[key] = value;
        }
    }
    return masked;
}
async function getRequestMeta() {
    try {
        const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
        // Vercel 제공 헤더 우선 (스푸핑 방지), 그 외 프록시 헤더 폴백
        const ipAddress = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const userAgent = h.get("user-agent") || "unknown";
        return {
            ipAddress,
            userAgent
        };
    } catch  {
        return {
            ipAddress: "unknown",
            userAgent: "unknown"
        };
    }
}
function logAudit(params) {
    const { userId, action, target, detail, ipAddress, userAgent } = params;
    // 민감정보 마스킹
    const safeDetail = detail ? maskSensitiveFields(detail) : null;
    // fire-and-forget: await 하지 않음
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].auditLog.create({
        data: {
            userId: userId || null,
            action,
            target: target || null,
            detail: safeDetail ? JSON.stringify(safeDetail) : null,
            ipAddress: ipAddress || null,
            userAgent: userAgent ? userAgent.slice(0, 500) : null
        }
    }).catch((err)=>{
        // 감사 로그 실패가 서비스에 영향을 주면 안 됨
        console.error("[AuditLog] 기록 실패:", err);
    });
}
async function logAuditWithRequest(params) {
    const meta = await getRequestMeta();
    logAudit({
        ...params,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
    });
}
function createAuditLog(params) {
    const { req, userId, action, target, detail } = params;
    let ipAddress = "unknown";
    let userAgent = "unknown";
    if (req) {
        const h = req.headers;
        ipAddress = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        userAgent = h.get("user-agent") || "unknown";
    }
    logAudit({
        userId,
        action,
        target,
        detail,
        ipAddress,
        userAgent
    });
}
async function getAuditLogs(options) {
    const { page = 1, limit = 50, action, userId, from, to } = options;
    const where = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
        where.createdAt = {
            ...from ? {
                gte: from
            } : {},
            ...to ? {
                lte: to
            } : {}
        };
    }
    const [logs, total] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].auditLog.findMany({
            where,
            orderBy: {
                createdAt: "desc"
            },
            skip: (page - 1) * limit,
            take: limit
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].auditLog.count({
            where
        })
    ]);
    return {
        logs,
        total
    };
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/audit-log.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
// AUTH_SECRET 필수 검증 (런타임 요청 시 fail-fast)
if (("TURBOPACK compile-time value", "undefined") === "undefined" && !process.env.AUTH_SECRET && !process.env.NEXT_PHASE) {
    throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다. " + "`openssl rand -base64 32`로 생성 후 .env에 추가하세요.");
}
const ROLE_LIMITS = {
    GUEST: 2,
    PERSONAL: 5,
    BUSINESS: 50,
    REALESTATE: 100,
    ADMIN: 9999
};
// ─── 공통 이벤트 (감사 로그) ───
const authEvents = {
    async signIn ({ user, account }) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])({
            userId: user.id,
            action: "LOGIN",
            detail: {
                provider: account?.provider || "credentials",
                email: user.email
            }
        });
    },
    async signOut (message) {
        // NextAuth v5: signOut receives { session } or { token } depending on strategy
        const token = "token" in message ? message.token : null;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])({
            userId: token?.id,
            action: "LOGOUT"
        });
    },
    async createUser ({ user }) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])({
            userId: user.id,
            action: "SIGNUP",
            detail: {
                email: user.email
            }
        });
    }
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
        if (!user?.password || user.role !== "ADMIN") {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])({
                action: "LOGIN_FAILED",
                detail: {
                    email: credentials.email,
                    reason: "invalid_user_or_role"
                }
            });
            return null;
        }
        const isValid = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].compare(credentials.password, user.password);
        if (!isValid) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$audit$2d$log$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logAudit"])({
                userId: user.id,
                action: "LOGIN_FAILED",
                detail: {
                    email: credentials.email,
                    reason: "invalid_password"
                }
            });
            return null;
        }
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
        callbacks: authCallbacks,
        events: authEvents
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
    callbacks: authCallbacks,
    events: authEvents
});
}),
"[project]/lib/redemption-simulator.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 경매 배당 시뮬레이터 (Auction Redemption Simulator)
 * ─────────────────────────────────────────────────────────
 * 등기부등본의 권리순위(접수일 기반)에 따라 경매 시 배당을 시뮬레이션.
 * 추정가의 70%/80%/90% 시나리오에서 각 채권자의 회수율을 산출.
 *
 * 특허 핵심: 접수일 기반 법정 우선순위 결정 → 소액임차인 최우선변제 적용
 *           → 다중 가격 시나리오 배당 시뮬레이션 → 보증금 회수율 산출
 */ __turbopack_context__.s([
    "simulateRedemption",
    ()=>simulateRedemption
]);
const PREFERENTIAL_THRESHOLDS = [
    {
        region: "서울",
        depositThreshold: 165_000_000,
        maxPreferential: 55_000_000
    },
    {
        region: "과밀억제권역",
        depositThreshold: 145_000_000,
        maxPreferential: 48_000_000
    },
    {
        region: "광역시",
        depositThreshold: 80_000_000,
        maxPreferential: 27_000_000
    },
    {
        region: "기타",
        depositThreshold: 70_000_000,
        maxPreferential: 23_000_000
    }
];
const AUCTION_COST_RATE = 0.05;
const DEFAULT_SCENARIOS = [
    0.7,
    0.8,
    0.9
];
// ─── 지역 판별 ───
function detectRegion(address) {
    if (/서울/.test(address)) return PREFERENTIAL_THRESHOLDS[0];
    if (/과천|성남|하남|고양|광명|부천|안양/.test(address)) return PREFERENTIAL_THRESHOLDS[1];
    if (/부산|대구|인천|광주|대전|울산|세종/.test(address)) return PREFERENTIAL_THRESHOLDS[2];
    return PREFERENTIAL_THRESHOLDS[3];
}
// ─── 날짜 비교 유틸리티 ───
function dateToNum(date) {
    return parseInt(date.replace(/\./g, ""), 10) || 0;
}
// ─── 권리 추출 및 우선순위 정렬 ───
function buildClaimPriorityList(parsed, tenantDeposit, address) {
    const claims = [];
    const region = detectRegion(address);
    // 을구: 근저당, 전세권
    for (const entry of parsed.eulgu){
        if (entry.isCancelled) continue;
        if (/근저당|저당/.test(entry.purpose)) {
            claims.push({
                order: 0,
                type: "근저당",
                holder: entry.holder || "채권자",
                amount: entry.amount,
                date: entry.date,
                isPreferential: false
            });
        }
        if (/전세권/.test(entry.purpose)) {
            claims.push({
                order: 0,
                type: "전세권",
                holder: entry.holder || "전세권자",
                amount: entry.amount,
                date: entry.date,
                isPreferential: false
            });
        }
    }
    // 갑구: 압류, 가압류
    for (const entry of parsed.gapgu){
        if (entry.isCancelled) continue;
        if (entry.purpose === "압류" || entry.purpose === "가압류") {
            const amountMatch = entry.detail.match(/금\s*([\d,]+)\s*원/);
            const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;
            claims.push({
                order: 0,
                type: entry.purpose === "압류" ? "압류" : "가압류",
                holder: entry.holder || "채권자",
                amount,
                date: entry.date,
                isPreferential: false
            });
        }
    }
    // 임차인 보증금 (사용자 입력)
    if (tenantDeposit > 0) {
        const isPreferential = tenantDeposit <= region.depositThreshold;
        claims.push({
            order: 0,
            type: "임차권",
            holder: "임차인(본인)",
            amount: tenantDeposit,
            date: "9999.99.99",
            isPreferential
        });
    }
    // 접수일 기준 정렬 (같은 날짜면 원래 순서 유지)
    claims.sort((a, b)=>dateToNum(a.date) - dateToNum(b.date));
    // 순위 번호 부여
    claims.forEach((c, i)=>{
        c.order = i + 1;
    });
    return claims;
}
// ─── 배당 시뮬레이션 ───
function simulateAuction(claims, estimatedPrice, auctionPriceRatio, address, tenantDeposit) {
    const auctionPrice = Math.round(estimatedPrice * auctionPriceRatio);
    const region = detectRegion(address);
    // 경매비용 공제
    let remaining = Math.round(auctionPrice * (1 - AUCTION_COST_RATE));
    // 1단계: 소액임차인 최우선변제 (경매가의 1/2 한도 내)
    const maxPreferentialPool = Math.round(auctionPrice * 0.5);
    let preferentialUsed = 0;
    const preferentialClaims = claims.filter((c)=>c.isPreferential);
    const normalClaims = claims.filter((c)=>!c.isPreferential);
    const distributions = [];
    // 최우선변제 배당
    for (const claim of preferentialClaims){
        const maxRecoverable = Math.min(region.maxPreferential, claim.amount, maxPreferentialPool - preferentialUsed, remaining);
        const recovered = Math.max(0, maxRecoverable);
        preferentialUsed += recovered;
        remaining -= recovered;
        distributions.push({
            claimOrder: claim.order,
            holder: claim.holder,
            claimAmount: claim.amount,
            recoveredAmount: recovered,
            recoveryRate: claim.amount > 0 ? recovered / claim.amount : 0,
            shortfall: claim.amount - recovered
        });
    }
    // 2단계: 일반 채권 접수일 순 배당
    for (const claim of normalClaims){
        const recovered = Math.min(claim.amount, Math.max(0, remaining));
        remaining -= recovered;
        distributions.push({
            claimOrder: claim.order,
            holder: claim.holder,
            claimAmount: claim.amount,
            recoveredAmount: recovered,
            recoveryRate: claim.amount > 0 ? recovered / claim.amount : 0,
            shortfall: claim.amount - recovered
        });
    }
    // 3단계: 최우선변제 잔여분 (최우선변제로 다 못 받은 경우, 일반 순위로 추가 배당)
    for (const claim of preferentialClaims){
        if (remaining <= 0) break;
        const dist = distributions.find((d)=>d.claimOrder === claim.order);
        if (dist && dist.shortfall > 0) {
            const additional = Math.min(dist.shortfall, remaining);
            dist.recoveredAmount += additional;
            dist.shortfall -= additional;
            dist.recoveryRate = claim.amount > 0 ? dist.recoveredAmount / claim.amount : 0;
            remaining -= additional;
        }
    }
    // 순서 재정렬
    distributions.sort((a, b)=>a.claimOrder - b.claimOrder);
    // 임차인 배당 결과 추출
    const tenantDist = distributions.find((d)=>d.holder === "임차인(본인)");
    return {
        auctionPriceRatio,
        auctionPrice,
        distributions,
        tenantDeposit,
        tenantRecovery: tenantDist?.recoveredAmount ?? 0,
        tenantRecoveryRate: tenantDist?.recoveryRate ?? 0
    };
}
// ─── 추천 문구 생성 ───
function generateRecommendation(scenarios, claims) {
    const parts = [];
    const worst = scenarios[0]; // 70%
    const mid = scenarios[1]; // 80%
    const best = scenarios[2]; // 90%
    if (worst.tenantRecoveryRate >= 1) {
        parts.push("모든 시나리오에서 보증금 전액 회수가 가능합니다.");
    } else if (mid.tenantRecoveryRate >= 1) {
        parts.push(`경매가 80% 이상 시 보증금 전액 회수 가능하나, 70% 시나리오에서는 회수율이 ${(worst.tenantRecoveryRate * 100).toFixed(1)}%입니다.`);
    } else if (best.tenantRecoveryRate >= 1) {
        parts.push(`경매가 90% 시에만 보증금 전액 회수 가능합니다. 70% 시나리오 회수율: ${(worst.tenantRecoveryRate * 100).toFixed(1)}%.`);
    } else {
        parts.push(`어떤 시나리오에서도 보증금 전액 회수가 불가합니다. 최선 시나리오(90%) 회수율: ${(best.tenantRecoveryRate * 100).toFixed(1)}%.`);
    }
    const totalClaims = claims.reduce((sum, c)=>sum + c.amount, 0);
    const claimCount = claims.filter((c)=>c.type !== "임차권").length;
    if (claimCount > 0) {
        parts.push(`선순위 채권 ${claimCount}건, 총 ${(totalClaims / 100_000_000).toFixed(1)}억원이 설정되어 있습니다.`);
    }
    const preferential = claims.filter((c)=>c.isPreferential);
    if (preferential.length > 0) {
        parts.push("소액임차인 최우선변제 대상으로 판정되어 일부 우선 변제를 받을 수 있습니다.");
    }
    return parts.join(" ");
}
function simulateRedemption(parsed, estimatedPrice, tenantDeposit, address) {
    const addr = address || parsed.title.address || "";
    const deposit = tenantDeposit ?? parsed.summary.totalJeonseAmount;
    if (estimatedPrice <= 0) {
        return {
            claims: [],
            scenarios: [],
            worstCaseRecovery: 0,
            bestCaseRecovery: 0,
            recommendation: "추정 시세가 없어 배당 시뮬레이션을 수행할 수 없습니다."
        };
    }
    // 권리 목록 구축
    const claims = buildClaimPriorityList(parsed, deposit, addr);
    // 3개 시나리오 시뮬레이션
    const scenarios = DEFAULT_SCENARIOS.map((ratio)=>simulateAuction(claims, estimatedPrice, ratio, addr, deposit));
    const worstCaseRecovery = scenarios[0].tenantRecoveryRate;
    const bestCaseRecovery = scenarios[scenarios.length - 1].tenantRecoveryRate;
    const recommendation = generateRecommendation(scenarios, claims);
    return {
        claims,
        scenarios,
        worstCaseRecovery,
        bestCaseRecovery,
        recommendation
    };
}
}),
"[project]/lib/confidence-engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 신뢰도 전파 프레임워크 (Confidence Propagation Engine)
 * ─────────────────────────────────────────────────────────────
 * 다단계 분석 파이프라인의 각 단계에서 신뢰도를 계산하고,
 * 가중 기하평균으로 복합 신뢰도를 산출하여 분석 결과의 투명한 신뢰 체인을 형성.
 *
 * 특허 핵심: 각 분석 단계의 데이터 품질 지표 → 단계별 신뢰도 점수 →
 *           가중 기하평균 복합 신뢰도 → 병목 단계 자동 식별
 */ __turbopack_context__.s([
    "calculateParserConfidence",
    ()=>calculateParserConfidence,
    "calculatePriceConfidence",
    ()=>calculatePriceConfidence,
    "calculateRiskScoringConfidence",
    ()=>calculateRiskScoringConfidence,
    "calculateValidationConfidence",
    ()=>calculateValidationConfidence,
    "propagateConfidence",
    ()=>propagateConfidence
]);
// ─── 단계별 가중치 (합=1.0) ───
const STAGE_WEIGHTS = {
    parser: 0.25,
    riskScoring: 0.30,
    priceEstimation: 0.25,
    validation: 0.20
};
// ─── 데이터 품질 등급 판정 ───
function classifyDataQuality(confidence) {
    if (confidence >= 0.7) return "high";
    if (confidence >= 0.4) return "medium";
    return "low";
}
function calculateParserConfidence(parsed) {
    const factors = [];
    // 1. 섹션 탐지율: 3개 섹션(표제부, 갑구, 을구) 중 데이터가 있는 비율
    const sectionCount = [
        parsed.title.address ? 1 : 0,
        parsed.gapgu.length > 0 ? 1 : 0,
        parsed.eulgu.length > 0 ? 1 : 0
    ].reduce((a, b)=>a + b, 0);
    const sectionDetection = sectionCount / 3;
    factors.push({
        name: "섹션탐지율",
        value: sectionDetection,
        weight: 0.35
    });
    // 2. 필드 완전성: 각 항목의 핵심 필드가 채워진 비율
    const allEntries = [
        ...parsed.gapgu,
        ...parsed.eulgu
    ];
    if (allEntries.length > 0) {
        const completeness = allEntries.reduce((sum, entry)=>{
            let filled = 0;
            let total = 3; // date, purpose, holder
            if (entry.date) filled++;
            if (entry.purpose && entry.purpose !== "기타") filled++;
            if (entry.holder) filled++;
            return sum + filled / total;
        }, 0) / allEntries.length;
        factors.push({
            name: "필드완전성",
            value: completeness,
            weight: 0.35
        });
    } else {
        factors.push({
            name: "필드완전성",
            value: 0,
            weight: 0.35
        });
    }
    // 3. 항목 파싱률: 날짜가 있는 항목의 비율 (파싱 성공 지표)
    const parsedEntries = allEntries.filter((e)=>e.date && e.date.length >= 8);
    const parsability = allEntries.length > 0 ? parsedEntries.length / allEntries.length : 0;
    factors.push({
        name: "항목파싱률",
        value: parsability,
        weight: 0.30
    });
    const confidence = factors.reduce((sum, f)=>sum + f.value * f.weight, 0);
    return {
        stage: "parser",
        confidence: Math.max(0, Math.min(1, confidence)),
        factors,
        dataQuality: classifyDataQuality(confidence)
    };
}
function calculateRiskScoringConfidence(parsed, riskScore, estimatedPrice, validation) {
    const factors = [];
    // 1. 데이터 가용성: 최소 기대 항목 수 대비 실제 파싱 항목
    const expectedMinEntries = 3;
    const totalEntries = parsed.gapgu.length + parsed.eulgu.length;
    const dataAvailability = Math.min(1, totalEntries / expectedMinEntries);
    factors.push({
        name: "데이터가용성",
        value: dataAvailability,
        weight: 0.30
    });
    // 2. 가격 데이터 존재: 추정가가 있으면 근저당비율 등 핵심 계산 가능
    const pricePresence = estimatedPrice > 0 ? 1 : 0.3;
    factors.push({
        name: "가격데이터존재",
        value: pricePresence,
        weight: 0.35
    });
    // 3. 검증 통과율: 검증 엔진의 오류/경고가 적을수록 데이터 품질 높음
    const validationErrorRate = validation.summary.totalChecks > 0 ? validation.summary.errors / validation.summary.totalChecks : 0;
    const validationHealth = 1 - validationErrorRate;
    factors.push({
        name: "검증통과율",
        value: validationHealth,
        weight: 0.35
    });
    const confidence = factors.reduce((sum, f)=>sum + f.value * f.weight, 0);
    return {
        stage: "riskScoring",
        confidence: Math.max(0, Math.min(1, confidence)),
        factors,
        dataQuality: classifyDataQuality(confidence)
    };
}
function calculatePriceConfidence(priceConfidenceScore) {
    // 기존 price-estimation.ts의 confidence(0~95)를 0~1로 정규화
    const normalized = Math.min(1, Math.max(0, priceConfidenceScore / 95));
    return {
        stage: "priceEstimation",
        confidence: normalized,
        factors: [
            {
                name: "비교매물신뢰도",
                value: normalized,
                weight: 1.0
            }
        ],
        dataQuality: classifyDataQuality(normalized)
    };
}
function calculateValidationConfidence(validation) {
    const factors = [];
    // 검증 점수 (0~100 → 0~1)
    const scoreNormalized = validation.score / 100;
    factors.push({
        name: "검증점수",
        value: scoreNormalized,
        weight: 0.50
    });
    // 오류 없음 여부
    const noErrors = validation.summary.errors === 0 ? 1 : 0;
    factors.push({
        name: "오류없음",
        value: noErrors,
        weight: 0.30
    });
    // 검사 범위 (최소 10개 검사 기대)
    const coverage = Math.min(1, validation.summary.totalChecks / 10);
    factors.push({
        name: "검사범위",
        value: coverage,
        weight: 0.20
    });
    const confidence = factors.reduce((sum, f)=>sum + f.value * f.weight, 0);
    return {
        stage: "validation",
        confidence: Math.max(0, Math.min(1, confidence)),
        factors,
        dataQuality: classifyDataQuality(confidence)
    };
}
// ─── 복합 신뢰도 계산 (가중 기하평균) ───
function computeCompositeReliability(stages) {
    // 가중 기하평균: exp(Σ(w_i × ln(c_i)) / Σw_i)
    // ln(0)을 방지하기 위해 최소값 0.01 적용
    let weightedLogSum = 0;
    let totalWeight = 0;
    for (const stage of stages){
        const weight = STAGE_WEIGHTS[stage.stage] ?? 0.1;
        const safeConfidence = Math.max(0.01, stage.confidence);
        weightedLogSum += weight * Math.log(safeConfidence);
        totalWeight += weight;
    }
    if (totalWeight === 0) return 0;
    return Math.max(0, Math.min(1, Math.exp(weightedLogSum / totalWeight)));
}
// ─── 신뢰 체인 구축 ───
function buildTrustChain(stages) {
    const chain = [];
    const stageOrder = [
        "parser",
        "riskScoring",
        "priceEstimation",
        "validation"
    ];
    for(let i = 0; i < stageOrder.length - 1; i++){
        const from = stages.find((s)=>s.stage === stageOrder[i]);
        const to = stages.find((s)=>s.stage === stageOrder[i + 1]);
        if (from && to) {
            // 전파된 신뢰도 = 이전 단계 신뢰도 × 현재 단계 신뢰도
            chain.push({
                from: from.stage,
                to: to.stage,
                propagatedConfidence: from.confidence * to.confidence
            });
        }
    }
    return chain;
}
// ─── 병목 단계 식별 ───
function identifyBottleneck(stages) {
    if (stages.length === 0) {
        return {
            stage: "unknown",
            confidence: 0,
            reason: "분석 단계 정보 없음"
        };
    }
    const weakest = stages.reduce((min, s)=>s.confidence < min.confidence ? s : min);
    const reasons = {
        parser: "등기부등본 파싱 품질이 낮습니다. 원문 데이터 형식을 확인하세요.",
        riskScoring: "리스크 스코어링에 필요한 데이터가 부족합니다. 추정 시세 또는 등기 항목을 확인하세요.",
        priceEstimation: "비교매물이 부족하여 가격 추정 신뢰도가 낮습니다.",
        validation: "데이터 검증에서 오류가 발견되었습니다. 파싱 결과를 재확인하세요."
    };
    return {
        stage: weakest.stage,
        confidence: weakest.confidence,
        reason: reasons[weakest.stage] || "분석 데이터 품질이 낮습니다."
    };
}
function propagateConfidence(parsed, riskScore, estimatedPrice, priceConfidenceScore, validation) {
    const stages = [
        calculateParserConfidence(parsed),
        calculateRiskScoringConfidence(parsed, riskScore, estimatedPrice, validation),
        calculatePriceConfidence(priceConfidenceScore),
        calculateValidationConfidence(validation)
    ];
    const compositeReliability = computeCompositeReliability(stages);
    const trustChain = buildTrustChain(stages);
    const bottleneck = identifyBottleneck(stages);
    return {
        stages,
        compositeReliability,
        trustChain,
        bottleneck
    };
}
}),
"[project]/lib/self-verification.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 자기검증 루프 (Self-Verification Engine)
 * ──────────────────────────────────────────────
 * AI 생성 의견과 결정론적 분석 결과를 교차검증하여
 * 불일치를 감지하고 복합 신뢰도를 산출.
 *
 * 특허 핵심: 생성형 AI 출력을 규칙 기반 결정론적 결과와 자동 교차검증하여
 *           분석 파이프라인의 자기 교정(self-correction) 능력을 구현.
 */ __turbopack_context__.s([
    "selfVerify",
    ()=>selfVerify
]);
// ─── AI 위험수준 추출 ───
function extractAiRiskLevel(aiOpinion) {
    if (/매우\s*위험|극히\s*위험|즉시/.test(aiOpinion)) return "F";
    if (/위험|주의\s*필요|신중/.test(aiOpinion)) return "D";
    if (/주의|유의|확인\s*필요/.test(aiOpinion)) return "C";
    if (/양호|비교적\s*안전/.test(aiOpinion)) return "B";
    if (/안전|문제\s*없/.test(aiOpinion)) return "A";
    return "unknown";
}
// ─── AI 가격 참조 추출 ───
function extractAiPrice(aiOpinion) {
    // "약 X억원", "X억 Y만원" 패턴
    const eokMatch = aiOpinion.match(/약?\s*(\d+)\s*억\s*(\d{1,4})?\s*만?\s*원/);
    if (eokMatch) {
        const eok = parseInt(eokMatch[1], 10) * 100_000_000;
        const man = eokMatch[2] ? parseInt(eokMatch[2], 10) * 10_000 : 0;
        return eok + man;
    }
    const manMatch = aiOpinion.match(/약?\s*(\d{1,5})\s*만\s*원/);
    if (manMatch) return parseInt(manMatch[1], 10) * 10_000;
    return null;
}
// ─── 검증 체크 목록 ───
function checkRiskLevelConsistency(aiOpinion, riskScore) {
    const aiLevel = extractAiRiskLevel(aiOpinion);
    const grade = riskScore.grade;
    // 등급 거리 계산 (A=0, B=1, C=2, D=3, F=4)
    const gradeMap = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
        F: 4
    };
    const aiGradeNum = gradeMap[aiLevel] ?? -1;
    const detGradeNum = gradeMap[grade] ?? -1;
    let isConsistent = true;
    let discrepancyLevel = "none";
    let discrepancyDetail;
    if (aiGradeNum >= 0 && detGradeNum >= 0) {
        const diff = Math.abs(aiGradeNum - detGradeNum);
        if (diff >= 3) {
            isConsistent = false;
            discrepancyLevel = "major";
            discrepancyDetail = `AI는 '${aiLevel}' 수준으로 평가했으나, 정량 스코어링은 '${grade}'등급입니다. 3등급 이상 차이.`;
        } else if (diff >= 2) {
            isConsistent = false;
            discrepancyLevel = "minor";
            discrepancyDetail = `AI는 '${aiLevel}' 수준으로 평가했으나, 정량 스코어링은 '${grade}'등급입니다.`;
        }
    }
    return {
        checkId: "risk_level_consistency",
        description: "AI 위험 평가 vs 정량 스코어링 등급 일치 여부",
        aiValue: aiLevel,
        deterministicValue: grade,
        isConsistent,
        discrepancyLevel,
        discrepancyDetail
    };
}
function checkCriticalRiskMentions(aiOpinion, riskScore) {
    const criticalFactors = riskScore.factors.filter((f)=>f.severity === "critical");
    const mentionedKeywords = {
        seizure: [
            "압류"
        ],
        provisional_seizure: [
            "가압류"
        ],
        auction: [
            "경매"
        ],
        lease_registration: [
            "임차권등기",
            "임차권"
        ],
        mortgage_extreme: [
            "근저당",
            "채권최고액"
        ],
        mortgage_very_high: [
            "근저당",
            "시세 초과"
        ]
    };
    const unmentioned = [];
    for (const factor of criticalFactors){
        const keywords = mentionedKeywords[factor.id] || [
            factor.category
        ];
        const mentioned = keywords.some((kw)=>aiOpinion.includes(kw));
        if (!mentioned) {
            unmentioned.push(factor.description);
        }
    }
    return {
        checkId: "critical_risk_mentions",
        description: "AI가 모든 치명적 위험요소를 언급했는지",
        aiValue: `${criticalFactors.length - unmentioned.length}/${criticalFactors.length} 언급`,
        deterministicValue: `${criticalFactors.length}건 치명적 위험`,
        isConsistent: unmentioned.length === 0,
        discrepancyLevel: unmentioned.length > 0 ? unmentioned.length >= 2 ? "major" : "minor" : "none",
        discrepancyDetail: unmentioned.length > 0 ? `AI가 언급하지 않은 치명적 위험: ${unmentioned.join(", ")}` : undefined
    };
}
function checkPriceConsistency(aiOpinion, estimatedPrice) {
    const aiPrice = extractAiPrice(aiOpinion);
    if (aiPrice === null || estimatedPrice <= 0) {
        return {
            checkId: "price_consistency",
            description: "AI 언급 가격 vs 추정 시세 일치 여부",
            aiValue: aiPrice ?? "미언급",
            deterministicValue: estimatedPrice,
            isConsistent: true,
            discrepancyLevel: "none"
        };
    }
    const deviation = Math.abs(aiPrice - estimatedPrice) / estimatedPrice;
    return {
        checkId: "price_consistency",
        description: "AI 언급 가격 vs 추정 시세 일치 여부 (±20% 허용)",
        aiValue: aiPrice,
        deterministicValue: estimatedPrice,
        isConsistent: deviation <= 0.2,
        discrepancyLevel: deviation > 0.4 ? "major" : deviation > 0.2 ? "minor" : "none",
        discrepancyDetail: deviation > 0.2 ? `AI 언급 가격이 추정 시세 대비 ${(deviation * 100).toFixed(1)}% 차이납니다.` : undefined
    };
}
function checkValidationAlertConsistency(aiOpinion, validation) {
    const hasErrors = validation.summary.errors > 0;
    const aiSaysReliable = /신뢰.*할\s*수\s*있|데이터.*정확|검증.*통과/.test(aiOpinion);
    return {
        checkId: "validation_alert",
        description: "검증 오류 존재 시 AI가 데이터 신뢰성을 과대평가하는지",
        aiValue: aiSaysReliable ? "신뢰할 수 있다고 평가" : "신뢰성 미언급",
        deterministicValue: `${validation.summary.errors}건 오류`,
        isConsistent: !(hasErrors && aiSaysReliable),
        discrepancyLevel: hasErrors && aiSaysReliable ? "major" : "none",
        discrepancyDetail: hasErrors && aiSaysReliable ? `검증에서 ${validation.summary.errors}건 오류가 있으나 AI는 데이터를 신뢰할 수 있다고 평가했습니다.` : undefined
    };
}
function checkConfidenceRiskAlignment(riskScore, compositeReliability) {
    // 신뢰도가 낮은데(< 0.4) 위험도도 낮으면(A/B) → 거짓 안전 경고
    const lowConfidence = compositeReliability < 0.4;
    const lowRisk = riskScore.grade === "A" || riskScore.grade === "B";
    const falseSafety = lowConfidence && lowRisk;
    return {
        checkId: "confidence_risk_alignment",
        description: "분석 신뢰도가 낮은 상태에서의 안전 등급 경고",
        aiValue: `신뢰도 ${(compositeReliability * 100).toFixed(0)}%`,
        deterministicValue: `${riskScore.grade}등급 (${riskScore.totalScore}점)`,
        isConsistent: !falseSafety,
        discrepancyLevel: falseSafety ? "major" : "none",
        discrepancyDetail: falseSafety ? `분석 신뢰도가 ${(compositeReliability * 100).toFixed(0)}%로 낮은 상태에서 ${riskScore.grade}등급이 산출되었습니다. 데이터 부족으로 인한 거짓 안전 가능성이 있습니다.` : undefined
    };
}
// ─── 추천 문구 생성 ───
function generateRecommendation(checks, overallConsistency) {
    const majorCount = checks.filter((c)=>c.discrepancyLevel === "major").length;
    const minorCount = checks.filter((c)=>c.discrepancyLevel === "minor").length;
    if (majorCount === 0 && minorCount === 0) {
        return "AI 의견과 정량 분석 결과가 일관됩니다. 분석 결과를 신뢰할 수 있습니다.";
    }
    if (majorCount > 0) {
        return `AI 의견과 정량 분석 사이에 ${majorCount}건의 중대 불일치가 발견되었습니다. 분석 결과를 주의 깊게 검토하세요.`;
    }
    return `AI 의견과 정량 분석 사이에 ${minorCount}건의 경미한 불일치가 있습니다. 참고사항으로 확인하세요.`;
}
function selfVerify(aiOpinion, riskScore, estimatedPrice, validation, compositeReliability) {
    const checks = [];
    if (aiOpinion && aiOpinion.length >= 10) {
        checks.push(checkRiskLevelConsistency(aiOpinion, riskScore));
        checks.push(checkCriticalRiskMentions(aiOpinion, riskScore));
        checks.push(checkPriceConsistency(aiOpinion, estimatedPrice));
        checks.push(checkValidationAlertConsistency(aiOpinion, validation));
    }
    checks.push(checkConfidenceRiskAlignment(riskScore, compositeReliability));
    const consistentCount = checks.filter((c)=>c.isConsistent).length;
    const overallConsistency = checks.length > 0 ? consistentCount / checks.length : 1;
    const discrepancyCount = checks.filter((c)=>c.discrepancyLevel !== "none").length;
    const finalReliability = overallConsistency * compositeReliability;
    const recommendation = generateRecommendation(checks, overallConsistency);
    return {
        checks,
        overallConsistency,
        discrepancyCount,
        compositeReliability: finalReliability,
        recommendation
    };
}
}),
"[project]/lib/v-score.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA V-Score 통합 위험도 점수화 알고리즘
 * ──────────────────────────────────────────
 * 특허 핵심: 이질적 데이터(등기부등본 권리관계 + 전세가율 + 시세 변동성 +
 * 임대인 재무 위험 지표 + 지역 위험도)를 복합 분석하여 단일 수치(0~100)로
 * 통합 산출하는 고유 알고리즘.
 *
 * 순수 TypeScript 구현. AI/LLM 호출 없음 (설명 생성은 별도 프롬프트 레이어).
 * 알고리즘 ID: VESTRA-VSCORE-v1.0.0
 */ __turbopack_context__.s([
    "calculateVScore",
    ()=>calculateVScore
]);
// ─── 가중치 벡터 (특허 청구항 핵심) ───
const SOURCE_WEIGHTS = {
    registry: 0.30,
    price: 0.25,
    contract: 0.20,
    landlord: 0.15,
    region: 0.10
};
const INTERACTION_RULES = [
    {
        id: "registry_price_compound",
        sourceA: "registry",
        sourceB: "price",
        condition: (a, b)=>a < 50 && b < 50,
        adjustment: (a, b)=>-Math.round((100 - a) * (100 - b) / 200),
        type: "compound",
        description: "등기 위험 + 시세 불안정 복합 위험 증폭"
    },
    {
        id: "registry_contract_amplify",
        sourceA: "registry",
        sourceB: "contract",
        condition: (a, b)=>a < 40 && b < 40,
        adjustment: ()=>-8,
        type: "amplify",
        description: "등기 위험 + 계약서 위험 동시 발생 시 위험 증폭"
    },
    {
        id: "price_region_amplify",
        sourceA: "price",
        sourceB: "region",
        condition: (a, b)=>a < 50 && b < 40,
        adjustment: ()=>-6,
        type: "amplify",
        description: "시세 불안정 + 사기 다발 지역 복합 위험"
    },
    {
        id: "landlord_registry_amplify",
        sourceA: "landlord",
        sourceB: "registry",
        condition: (a, b)=>a < 40 && b < 50,
        adjustment: ()=>-5,
        type: "amplify",
        description: "임대인 위험 + 등기 위험 복합"
    },
    {
        id: "contract_price_mitigate",
        sourceA: "contract",
        sourceB: "price",
        condition: (a, b)=>a >= 80 && b >= 70,
        adjustment: ()=>3,
        type: "mitigate",
        description: "계약서 안전 + 시세 안정 시 위험 경감"
    },
    {
        id: "all_high_risk_cascade",
        sourceA: "registry",
        sourceB: "price",
        condition: (a, b)=>a < 30 && b < 30,
        adjustment: ()=>-10,
        type: "compound",
        description: "다중 소스 고위험 캐스케이드"
    }
];
// ─── 등급 매핑 ───
const GRADE_MAP = [
    {
        min: 85,
        grade: "A",
        label: "안전"
    },
    {
        min: 70,
        grade: "B",
        label: "양호"
    },
    {
        min: 50,
        grade: "C",
        label: "주의"
    },
    {
        min: 30,
        grade: "D",
        label: "위험"
    },
    {
        min: 0,
        grade: "F",
        label: "매우위험"
    }
];
function getGradeInfo(score) {
    for (const g of GRADE_MAP){
        if (score >= g.min) return {
            grade: g.grade,
            label: g.label
        };
    }
    return {
        grade: "F",
        label: "매우위험"
    };
}
// ─── 개별 소스 점수 산출 함수 ───
/**
 * 1. 등기 권리관계 점수 (0-100)
 * risk-scoring.ts의 결정론적 결과를 직접 사용
 */ function calculateRegistryScore(riskScore) {
    if (!riskScore) {
        return {
            score: 50,
            available: false,
            details: "등기분석 데이터 없음 (기본값 50)"
        };
    }
    const score = riskScore.totalScore;
    const factorCount = riskScore.factors.length;
    const criticals = riskScore.factors.filter((f)=>f.severity === "critical").length;
    return {
        score,
        available: true,
        details: `위험요소 ${factorCount}건 (심각 ${criticals}건), 등급 ${riskScore.grade}`
    };
}
/**
 * 2. 전세가율/시세 점수 (0-100)
 * 전세가율, 시세 변동성, 예측 신뢰도를 종합
 */ function calculatePriceScore(jeonseRatio, prediction, priceConfidence) {
    const factors = [];
    const detailParts = [];
    // 전세가율 점수 (0-100)
    if (jeonseRatio !== undefined && jeonseRatio > 0) {
        let ratioScore;
        if (jeonseRatio <= 60) ratioScore = 95;
        else if (jeonseRatio <= 70) ratioScore = 80;
        else if (jeonseRatio <= 80) ratioScore = 55;
        else if (jeonseRatio <= 90) ratioScore = 30;
        else ratioScore = 10;
        factors.push(ratioScore);
        detailParts.push(`전세가율 ${jeonseRatio.toFixed(1)}% → ${ratioScore}점`);
    }
    // 시세 변동성 점수
    if (prediction?.confidence !== undefined) {
        const stabilityScore = Math.min(100, Math.round(prediction.confidence * 100));
        factors.push(stabilityScore);
        detailParts.push(`예측 신뢰도 ${stabilityScore}점`);
    }
    // 가격 데이터 신뢰도
    if (priceConfidence !== undefined) {
        const confScore = Math.min(100, Math.round(priceConfidence * 100));
        factors.push(confScore);
    }
    if (factors.length === 0) {
        return {
            score: 50,
            available: false,
            details: "시세 데이터 없음 (기본값 50)"
        };
    }
    const score = Math.round(factors.reduce((a, b)=>a + b, 0) / factors.length);
    return {
        score,
        available: true,
        details: detailParts.join(", ")
    };
}
/**
 * 3. 계약서 위험도 점수 (0-100)
 */ function calculateContractScore(contractResult) {
    if (!contractResult) {
        return {
            score: 50,
            available: false,
            details: "계약분석 데이터 없음 (기본값 50)"
        };
    }
    // safetyScore는 0-100 (높을수록 안전)
    const score = contractResult.safetyScore;
    const riskCount = contractResult.clauses.filter((c)=>c.riskLevel === "high" || c.riskLevel === "warning").length;
    const missingCount = contractResult.missingClauses.length;
    return {
        score,
        available: true,
        details: `안전점수 ${score}, 위험조항 ${riskCount}건, 누락 ${missingCount}건`
    };
}
/**
 * 4. 임대인 위험지표 점수 (0-100)
 * 등기부등본에서 추출 가능한 간접 지표 + 신용정보 (mock)
 */ function calculateLandlordScore(riskScore, creditScore, isMultiHomeOwner, isCorporate) {
    let score = 70; // 기본값
    const detailParts = [];
    // 소유권 이전 빈도 (투기성)
    if (riskScore) {
        const transferPattern = riskScore.temporalPatterns?.patterns.find((p)=>p.patternType === "rapid_transfer");
        if (transferPattern) {
            score -= 20;
            detailParts.push("잦은 소유권 이전 -20");
        }
        // 다중 근저당 (재무 부담 추정)
        const mortgageCount = riskScore.factors.filter((f)=>f.category === "mortgage" || f.id.includes("mortgage")).length;
        if (mortgageCount >= 3) {
            score -= 15;
            detailParts.push(`다중 근저당 ${mortgageCount}건 -15`);
        }
    }
    // 신용정보 (mock 연동)
    if (creditScore !== undefined) {
        if (creditScore >= 700) score += 10;
        else if (creditScore < 500) score -= 15;
        detailParts.push(`신용점수 ${creditScore}`);
    }
    // 다주택자/법인
    if (isMultiHomeOwner) {
        score -= 10;
        detailParts.push("다주택자 -10");
    }
    if (isCorporate) {
        score -= 5;
        detailParts.push("법인 임대 -5");
    }
    score = Math.max(0, Math.min(100, score));
    return {
        score,
        available: detailParts.length > 0,
        details: detailParts.length > 0 ? detailParts.join(", ") : "임대인 정보 제한적 (기본값 70)"
    };
}
/**
 * 5. 지역 위험도 점수 (0-100)
 * 전세사기 피해사례 밀도 + 경매 발생률
 */ function calculateRegionScore(fraudRisk, regionFraudRate, auctionRate) {
    let score = 70; // 기본값
    const detailParts = [];
    // 전세사기 위험 평가 결과 반영
    if (fraudRisk) {
        // fraudScore는 0-100 (높을수록 위험) → 반전
        const fraudSafety = 100 - fraudRisk.fraudScore;
        score = Math.round(fraudSafety * 0.7 + score * 0.3);
        detailParts.push(`사기위험 ${fraudRisk.fraudScore}점`);
    }
    // 지역 사기 발생률
    if (regionFraudRate !== undefined) {
        if (regionFraudRate > 5) score -= 20;
        else if (regionFraudRate > 2) score -= 10;
        else if (regionFraudRate > 1) score -= 5;
        detailParts.push(`사기발생률 ${regionFraudRate.toFixed(1)}%`);
    }
    // 경매 발생률
    if (auctionRate !== undefined) {
        if (auctionRate > 3) score -= 15;
        else if (auctionRate > 1.5) score -= 8;
        detailParts.push(`경매율 ${auctionRate.toFixed(1)}%`);
    }
    score = Math.max(0, Math.min(100, score));
    return {
        score,
        available: detailParts.length > 0,
        details: detailParts.length > 0 ? detailParts.join(", ") : "지역 데이터 제한적 (기본값 70)"
    };
}
// ─── 상호작용 계산 ───
function calculateInteractions(sources) {
    const interactions = [];
    for (const rule of INTERACTION_RULES){
        const a = sources.get(rule.sourceA);
        const b = sources.get(rule.sourceB);
        if (a === undefined || b === undefined) continue;
        if (rule.condition(a, b)) {
            interactions.push({
                sourceA: rule.sourceA,
                sourceB: rule.sourceB,
                interactionType: rule.type,
                adjustment: rule.adjustment(a, b),
                description: rule.description
            });
        }
    }
    return interactions;
}
// ─── 규칙 기반 설명 트리 ───
function generateRuleBasedExplanation(sources, interactions, finalScore) {
    const sortedSources = [
        ...sources
    ].sort((a, b)=>a.score - b.score); // 낮은 점수(위험한) 순
    const topRiskFactors = sortedSources.filter((s)=>s.score < 70).slice(0, 5).map((s)=>({
            factor: s.name,
            impact: Math.round((100 - s.score) * s.weight),
            source: s.id
        }));
    // 구조화 설명 생성
    const parts = [];
    const { grade, label } = getGradeInfo(finalScore);
    parts.push(`V-Score ${finalScore}점 (${grade}등급: ${label}).`);
    // 가장 위험한 소스 설명
    const weakest = sortedSources[0];
    if (weakest && weakest.score < 70) {
        parts.push(`가장 주의가 필요한 영역: ${weakest.name} (${weakest.score}점). ${weakest.details}`);
    }
    // 상호작용 설명
    const negativeInteractions = interactions.filter((i)=>i.adjustment < 0);
    if (negativeInteractions.length > 0) {
        parts.push(`복합 위험 ${negativeInteractions.length}건 감지: ${negativeInteractions.map((i)=>i.description).join("; ")}`);
    }
    // 데이터 가용성
    const unavailable = sources.filter((s)=>!s.dataAvailable);
    if (unavailable.length > 0) {
        parts.push(`※ ${unavailable.map((s)=>s.name).join(", ")} 데이터 미확보 — 추가 자료 확보 시 정확도 향상 가능.`);
    }
    return {
        ruleBasedSummary: parts.join(" "),
        naturalLanguage: "",
        topRiskFactors
    };
}
function calculateVScore(input) {
    // Step 1: 개별 소스 점수 산출
    const registryResult = calculateRegistryScore(input.riskScore);
    const priceResult = calculatePriceScore(input.jeonseRatio, input.prediction, input.priceConfidence);
    const contractResult = calculateContractScore(input.contractResult);
    const landlordResult = calculateLandlordScore(input.riskScore, input.creditScore, input.isMultiHomeOwner, input.isCorporate);
    const regionResult = calculateRegionScore(input.fraudRisk, input.regionFraudRate, input.auctionRate);
    // Step 2: 가중 합산
    const sourceMap = [
        {
            id: "registry",
            name: "등기 권리관계",
            result: registryResult
        },
        {
            id: "price",
            name: "전세가율/시세",
            result: priceResult
        },
        {
            id: "contract",
            name: "계약서 위험도",
            result: contractResult
        },
        {
            id: "landlord",
            name: "임대인 위험지표",
            result: landlordResult
        },
        {
            id: "region",
            name: "지역 위험도",
            result: regionResult
        }
    ];
    let weightedSum = 0;
    let totalWeight = 0;
    const scoreMap = new Map();
    const sources = sourceMap.map(({ id, name, result })=>{
        const weight = SOURCE_WEIGHTS[id];
        const weightedScore = result.score * weight;
        weightedSum += weightedScore;
        totalWeight += weight;
        scoreMap.set(id, result.score);
        return {
            id,
            name,
            score: result.score,
            weight,
            weightedScore: Math.round(weightedScore * 10) / 10,
            contribution: 0,
            dataAvailable: result.available,
            details: result.details
        };
    });
    // Step 3: 기본 V-Score (가중 합산)
    let baseScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    // Step 4: 상호작용 보정 (비선형)
    const interactions = calculateInteractions(scoreMap);
    const interactionAdjustment = interactions.reduce((sum, i)=>sum + i.adjustment, 0);
    const adjustedScore = Math.max(0, Math.min(100, baseScore + interactionAdjustment));
    // Step 5: 신뢰도 보정
    const confidenceLevel = input.compositeReliability ?? 0.7;
    // 신뢰도가 낮으면 점수를 중간값(50)에 수렴시킴
    const finalScore = Math.round(adjustedScore * confidenceLevel + 50 * (1 - confidenceLevel));
    // Step 6: 기여도 계산 (%)
    const totalAbsContribution = sources.reduce((sum, s)=>sum + Math.abs(100 - s.score) * s.weight, 0);
    for (const source of sources){
        source.contribution = totalAbsContribution > 0 ? Math.round(Math.abs(100 - source.score) * source.weight / totalAbsContribution * 100) : 20;
    }
    // Step 7: 등급 및 설명 생성
    const { grade, label } = getGradeInfo(finalScore);
    const explanation = generateRuleBasedExplanation(sources, interactions, finalScore);
    return {
        score: finalScore,
        grade,
        gradeLabel: label,
        sources,
        interactions,
        explanation,
        metadata: {
            version: "1.0.0",
            calculatedAt: new Date().toISOString(),
            confidenceLevel,
            algorithmId: "VESTRA-VSCORE-v1.0.0"
        }
    };
}
}),
"[project]/lib/cross-analysis.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 크로스 기능 교차 분석
 * ─────────────────────────────
 * 특허 핵심: 6가지 교차 분석 규칙을 통한 기능 간 데이터 연계.
 * 단순 병렬 분석이 아닌 상호 참조 피드백 루프.
 */ __turbopack_context__.s([
    "evaluateCrossAnalysis",
    ()=>evaluateCrossAnalysis,
    "getCrossAnalysisLinks",
    ()=>getCrossAnalysisLinks
]);
// ─── 교차 분석 규칙 정의 ───
const CROSS_ANALYSIS_LINKS = [
    {
        id: "registry_to_tax",
        from: "registry",
        to: "tax",
        dataFlow: "소유권 변동 이력, 근저당 설정 정보",
        triggerCondition: "소유권 이전 이력 존재",
        description: "소유권이전 이력 → 양도세 자동 계산"
    },
    {
        id: "price_to_jeonse",
        from: "price",
        to: "jeonse",
        dataFlow: "시세 하락 예측값",
        triggerCondition: "시세 하락 예측 5% 이상",
        description: "시세 하락 예측 시 깡투자 위험도 상향"
    },
    {
        id: "contract_to_registry",
        from: "contract",
        to: "registry",
        dataFlow: "계약서 특약사항",
        triggerCondition: "특약사항 존재",
        description: "특약사항 ↔ 등기부 교차 검증"
    },
    {
        id: "jeonse_to_price",
        from: "jeonse",
        to: "price",
        dataFlow: "전세가율 변동",
        triggerCondition: "전세가율 70% 이상",
        description: "전세가율 변동 → 시세예측 피드백"
    },
    {
        id: "tax_to_assistant",
        from: "tax",
        to: "assistant",
        dataFlow: "절세 전략 결과",
        triggerCondition: "세금 계산 완료",
        description: "절세 전략 → 맞춤형 상담 컨텍스트"
    },
    {
        id: "vscore_to_all",
        from: "vscore",
        to: "all",
        dataFlow: "위험도 변동",
        triggerCondition: "V-Score 5점 이상 변동",
        description: "위험도 변동 시 관련 분석 재계산"
    }
];
// ─── 개별 교차 분석 규칙 실행 ───
/**
 * 규칙 1: 권리분석 → 세무
 * 소유권 이전 이력에서 양도세 관련 정보 추출
 */ function evaluateRegistryToTax(riskScore) {
    if (!riskScore) return {
        triggered: false
    };
    // 빈번한 소유권 이전 패턴 감지
    const transferPattern = riskScore.temporalPatterns?.patterns.find((p)=>p.patternType === "rapid_transfer");
    if (transferPattern) {
        return {
            triggered: true,
            result: `소유권 이전 ${transferPattern.evidence.length}건 감지 → 양도세 다주택 중과 가능성`,
            impact: "양도세 시뮬레이션에서 다주택자 중과세율 적용 필요"
        };
    }
    return {
        triggered: false
    };
}
/**
 * 규칙 2: 시세전망 → 전세보호
 * 시세 하락 예측 시 깡투자 위험 경고
 */ function evaluatePriceToJeonse(prediction, jeonseRatio) {
    if (!prediction || !jeonseRatio) return {
        triggered: false
    };
    const pessimistic1y = prediction.predictions.pessimistic["1y"];
    const dropRate = (prediction.currentPrice - pessimistic1y) / prediction.currentPrice * 100;
    if (dropRate > 5 && jeonseRatio > 70) {
        return {
            triggered: true,
            result: `시세 ${dropRate.toFixed(1)}% 하락 가능 + 전세가율 ${jeonseRatio.toFixed(1)}% → 깡통전세 위험`,
            impact: "전세보증금반환보증 가입 강력 권고, 보증금 하향 협상 필요"
        };
    }
    return {
        triggered: false
    };
}
/**
 * 규칙 3: 계약서 → 권리분석
 * 특약사항과 등기부 교차 검증
 */ function evaluateContractToRegistry(contractResult, riskScore) {
    if (!contractResult || !riskScore) return {
        triggered: false
    };
    const riskClauses = contractResult.clauses.filter((c)=>c.riskLevel === "high");
    const hasRegistryRisk = riskScore.factors.some((f)=>f.severity === "critical" || f.severity === "high");
    if (riskClauses.length > 0 && hasRegistryRisk) {
        return {
            triggered: true,
            result: `계약서 위험조항 ${riskClauses.length}건 + 등기 고위험 요소 동시 존재 → 교차검증 필요`,
            impact: "법률 전문가 검토 필수, 계약 체결 전 위험요소 해소 확인"
        };
    }
    return {
        triggered: false
    };
}
/**
 * 규칙 4: 전세보호 → 시세전망
 * 높은 전세가율이 시세에 미치는 영향
 */ function evaluateJeonseToPrice(jeonseRatio) {
    if (!jeonseRatio || jeonseRatio <= 70) return {
        triggered: false
    };
    return {
        triggered: true,
        result: `전세가율 ${jeonseRatio.toFixed(1)}% → 시세 하방 압력 가능성`,
        impact: jeonseRatio > 85 ? "매매가 대비 전세가 과다 → 역전세 우려, 시세 하락 시 보증금 회수 리스크" : "전세가율 경계 수준 → 시세 전망 시 하방 리스크 반영"
    };
}
/**
 * 규칙 6: V-Score → 전체
 * 유의미한 위험도 변동 감지
 */ function evaluateVScoreToAll(vScoreChange) {
    if (vScoreChange === undefined || Math.abs(vScoreChange) < 5) {
        return {
            triggered: false
        };
    }
    const direction = vScoreChange < 0 ? "하락" : "상승";
    return {
        triggered: true,
        result: `V-Score ${Math.abs(vScoreChange)}점 ${direction} → 연관 분석 재계산 필요`,
        impact: vScoreChange < -10 ? "긴급: 위험도 대폭 상승, 모든 관련 분석 결과 재검토 권고" : `${direction} 추세 반영하여 연관 분석 업데이트`
    };
}
function evaluateCrossAnalysis(input) {
    const results = [];
    // 규칙 1: 권리분석 → 세무
    const r1 = evaluateRegistryToTax(input.riskScore);
    results.push({
        linkId: "registry_to_tax",
        from: "registry",
        to: "tax",
        triggered: r1.triggered,
        result: r1.result,
        impact: r1.impact
    });
    // 규칙 2: 시세전망 → 전세보호
    const r2 = evaluatePriceToJeonse(input.prediction, input.jeonseRatio);
    results.push({
        linkId: "price_to_jeonse",
        from: "price",
        to: "jeonse",
        triggered: r2.triggered,
        result: r2.result,
        impact: r2.impact
    });
    // 규칙 3: 계약서 → 권리분석
    const r3 = evaluateContractToRegistry(input.contractResult, input.riskScore);
    results.push({
        linkId: "contract_to_registry",
        from: "contract",
        to: "registry",
        triggered: r3.triggered,
        result: r3.result,
        impact: r3.impact
    });
    // 규칙 4: 전세보호 → 시세전망
    const r4 = evaluateJeonseToPrice(input.jeonseRatio);
    results.push({
        linkId: "jeonse_to_price",
        from: "jeonse",
        to: "price",
        triggered: r4.triggered,
        result: r4.result,
        impact: r4.impact
    });
    // 규칙 5: 세무 → AI어시스턴트 (컨텍스트 전달만)
    results.push({
        linkId: "tax_to_assistant",
        from: "tax",
        to: "assistant",
        triggered: false
    });
    // 규칙 6: V-Score → 전체
    const r6 = evaluateVScoreToAll(input.vScoreChange);
    results.push({
        linkId: "vscore_to_all",
        from: "vscore",
        to: "all",
        triggered: r6.triggered,
        result: r6.result,
        impact: r6.impact
    });
    const triggeredCount = results.filter((r)=>r.triggered).length;
    return {
        links: results,
        cascadeUpdates: triggeredCount,
        totalLinksEvaluated: results.length
    };
}
function getCrossAnalysisLinks() {
    return CROSS_ANALYSIS_LINKS;
}
}),
"[project]/lib/fraud-risk-model.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 전세사기 예방 위험 평가 모델
 * ──────────────────────────────────────
 * 특허 핵심: AI 기반 전세사기 예방 정량적 위험 평가 시스템.
 * 5대 피처 그룹, Gradient Boosting 시뮬레이션(규칙 기반 앙상블),
 * SHAP 유사 기여도 산출(Leave-One-Out).
 *
 * 순수 TypeScript 구현. 향후 ML 모델 교체 가능 인터페이스 설계.
 */ __turbopack_context__.s([
    "extractFeaturesFromRiskScore",
    ()=>extractFeaturesFromRiskScore,
    "predictFraudRisk",
    ()=>predictFraudRisk
]);
// ─── 피처 데이터베이스 (15개 피처) ───
const FRAUD_FEATURES = [
    // 권리관계 그룹
    {
        id: "mortgage_ratio",
        name: "근저당 비율",
        group: "권리관계",
        weight: 0.12,
        riskThreshold: 70,
        safeThreshold: 30,
        extractor: (input)=>Math.min(100, input.mortgageRatio ?? 0),
        description: (v)=>`근저당 비율 ${v.toFixed(0)}% ${v > 70 ? "(고위험)" : v > 50 ? "(주의)" : "(안전)"}`
    },
    {
        id: "seizure_present",
        name: "압류/가압류 유무",
        group: "권리관계",
        weight: 0.10,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>Math.min(100, ((input.seizureCount ?? 0) + (input.provisionalSeizureCount ?? 0)) * 50),
        description: (v)=>v > 0 ? `압류/가압류 존재 (위험도 ${v.toFixed(0)})` : "압류/가압류 없음"
    },
    {
        id: "priority_claim_ratio",
        name: "선순위 채권 비율",
        group: "권리관계",
        weight: 0.08,
        riskThreshold: 80,
        safeThreshold: 30,
        extractor: (input)=>Math.min(100, input.priorityClaimRatio ?? 0),
        description: (v)=>`선순위 채권 비율 ${v.toFixed(0)}%`
    },
    // 시세/가격 그룹
    {
        id: "jeonse_ratio",
        name: "전세가율",
        group: "시세가격",
        weight: 0.14,
        riskThreshold: 80,
        safeThreshold: 60,
        extractor: (input)=>Math.min(100, input.jeonseRatio ?? 50),
        description: (v)=>`전세가율 ${v.toFixed(1)}% ${v > 80 ? "(깡통전세 위험)" : v > 70 ? "(주의)" : "(양호)"}`
    },
    {
        id: "price_volatility",
        name: "시세 변동률",
        group: "시세가격",
        weight: 0.06,
        riskThreshold: 15,
        safeThreshold: 5,
        extractor: (input)=>Math.min(100, (input.priceVolatility ?? 5) * 5),
        description: (v)=>`시세 변동률 ${(v / 5).toFixed(1)}%`
    },
    {
        id: "vacancy_rate",
        name: "공실률",
        group: "시세가격",
        weight: 0.04,
        riskThreshold: 10,
        safeThreshold: 3,
        extractor: (input)=>Math.min(100, (input.vacancyRate ?? 3) * 8),
        description: (v)=>`공실률 ${(v / 8).toFixed(1)}%`
    },
    // 임대인 그룹
    {
        id: "multi_home_owner",
        name: "다주택 보유",
        group: "임대인",
        weight: 0.06,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>input.isMultiHomeOwner ? 70 : 0,
        description: (v)=>v > 0 ? "다주택 보유자 (사기 위험 상승)" : "단일 주택 보유"
    },
    {
        id: "corporate_landlord",
        name: "법인/개인 구분",
        group: "임대인",
        weight: 0.04,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>input.isCorporate ? 50 : 0,
        description: (v)=>v > 0 ? "법인 임대 (확인 필요)" : "개인 임대"
    },
    {
        id: "tax_delinquency",
        name: "세금 체납",
        group: "임대인",
        weight: 0.08,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>input.hasTaxDelinquency ? 90 : 0,
        description: (v)=>v > 0 ? "세금 체납 이력 있음 (고위험)" : "체납 없음"
    },
    // 건물/지역 그룹
    {
        id: "building_age",
        name: "건축년수",
        group: "건물지역",
        weight: 0.03,
        riskThreshold: 30,
        safeThreshold: 10,
        extractor: (input)=>Math.min(100, (input.buildingAge ?? 15) * 2.5),
        description: (v)=>`건축 ${Math.round(v / 2.5)}년 ${v > 75 ? "(노후)" : "(양호)"}`
    },
    {
        id: "region_fraud_rate",
        name: "지역 사기 발생률",
        group: "건물지역",
        weight: 0.08,
        riskThreshold: 3,
        safeThreshold: 0.5,
        extractor: (input)=>Math.min(100, (input.regionFraudRate ?? 1) * 20),
        description: (v)=>`지역 사기 발생률 ${(v / 20).toFixed(1)}% ${v > 60 ? "(다발 지역)" : "(일반)"}`
    },
    {
        id: "auction_rate",
        name: "경매 발생률",
        group: "건물지역",
        weight: 0.05,
        riskThreshold: 3,
        safeThreshold: 1,
        extractor: (input)=>Math.min(100, (input.auctionRate ?? 1) * 25),
        description: (v)=>`경매 발생률 ${(v / 25).toFixed(1)}%`
    },
    // 계약조건 그룹
    {
        id: "contract_safety",
        name: "계약서 안전점수",
        group: "계약조건",
        weight: 0.06,
        riskThreshold: 40,
        safeThreshold: 70,
        extractor: (input)=>100 - (input.contractResult?.safetyScore ?? 70),
        description: (v)=>`계약서 위험도 ${v.toFixed(0)}점`
    },
    {
        id: "broker_registered",
        name: "중개사 등록 여부",
        group: "계약조건",
        weight: 0.03,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>input.isBrokerRegistered === false ? 80 : 0,
        description: (v)=>v > 0 ? "중개사 미등록 (위험)" : "중개사 등록 확인"
    },
    {
        id: "deposit_insurance",
        name: "보증보험 가입",
        group: "계약조건",
        weight: 0.03,
        riskThreshold: 1,
        safeThreshold: 0,
        extractor: (input)=>input.hasDepositInsurance ? 0 : 60,
        description: (v)=>v > 0 ? "보증보험 미가입 (권고)" : "보증보험 가입 완료"
    }
];
// ─── 위험 등급 매핑 ───
function getFraudRiskLevel(score) {
    if (score >= 80) return {
        level: "critical",
        label: "매우위험"
    };
    if (score >= 60) return {
        level: "danger",
        label: "위험"
    };
    if (score >= 40) return {
        level: "warning",
        label: "주의"
    };
    if (score >= 20) return {
        level: "caution",
        label: "경계"
    };
    return {
        level: "safe",
        label: "안전"
    };
}
// ─── SHAP 유사 기여도 산출 (Leave-One-Out) ───
function calculateContributions(input) {
    // 전체 점수 계산
    const fullScore = calculateRawFraudScore(input);
    return FRAUD_FEATURES.map((feature)=>{
        const value = feature.extractor(input);
        // Leave-One-Out: 이 피처를 제거했을 때 점수 변화
        const withoutThis = calculateRawFraudScoreExcluding(input, feature.id);
        const contribution = fullScore - withoutThis; // 양수 = 이 피처가 위험 증가에 기여
        return {
            featureName: feature.name,
            featureGroup: feature.group,
            featureValue: value,
            contribution: Math.round(contribution * 100) / 100,
            percentageImpact: fullScore > 0 ? Math.round(Math.abs(contribution) / fullScore * 100) : 0,
            explanation: feature.description(value)
        };
    });
}
/**
 * 원시 사기 위험 점수 계산 (가중합)
 */ function calculateRawFraudScore(input) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const feature of FRAUD_FEATURES){
        const value = feature.extractor(input);
        weightedSum += value * feature.weight;
        totalWeight += feature.weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
}
/**
 * 특정 피처를 제외한 점수 계산 (LOO)
 */ function calculateRawFraudScoreExcluding(input, excludeFeatureId) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const feature of FRAUD_FEATURES){
        if (feature.id === excludeFeatureId) continue;
        const value = feature.extractor(input);
        weightedSum += value * feature.weight;
        totalWeight += feature.weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
}
function findSimilarCases(lat, lng, cases, maxDistance = 5) {
    if (!lat || !lng || !cases || cases.length === 0) return [];
    return cases.map((c)=>{
        const distance = haversineDistance(lat, lng, c.latitude, c.longitude);
        // 유사도 = 1 - (거리 / 최대거리), 0-1
        const similarity = Math.max(0, 1 - distance / maxDistance);
        return {
            address: c.address,
            caseType: c.caseType,
            amount: c.amount,
            distance: Math.round(distance * 100) / 100,
            similarity: Math.round(similarity * 100) / 100
        };
    }).filter((c)=>c.distance <= maxDistance).sort((a, b)=>a.distance - b.distance).slice(0, 5);
}
/**
 * Haversine 공식 (두 좌표 간 거리, km)
 */ function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반경 km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function predictFraudRisk(input, nearbyFraudCases) {
    // Step 1: 피처 추출 및 기여도 산출
    const contributions = calculateContributions(input);
    // Step 2: 원시 점수 → 보정
    const rawScore = calculateRawFraudScore(input);
    // 비선형 보정: 복수 고위험 피처 존재 시 증폭
    const highRiskFeatures = contributions.filter((c)=>c.contribution > 3).length;
    const amplifier = highRiskFeatures >= 3 ? 1.2 : highRiskFeatures >= 2 ? 1.1 : 1.0;
    const adjustedScore = Math.min(100, Math.round(rawScore * amplifier));
    // Step 3: 등급 결정
    const { level, label } = getFraudRiskLevel(adjustedScore);
    // Step 4: 상위 기여도 정렬
    const topRiskFactors = [
        ...contributions
    ].sort((a, b)=>b.contribution - a.contribution).slice(0, 5);
    // Step 5: 유사 사례 매칭
    const similarCases = findSimilarCases(input.latitude, input.longitude, nearbyFraudCases);
    // Step 6: 권고사항 생성
    const recommendation = generateFraudRecommendation(adjustedScore, topRiskFactors, similarCases.length);
    return {
        fraudScore: adjustedScore,
        riskLevel: level,
        riskLabel: label,
        contributions,
        topRiskFactors,
        similarCases,
        recommendation,
        metadata: {
            modelVersion: "VESTRA-FRAUD-v1.0.0",
            featureCount: FRAUD_FEATURES.length,
            calculatedAt: new Date().toISOString()
        }
    };
}
/**
 * 위험도 기반 권고사항 생성
 */ function generateFraudRecommendation(score, topFactors, nearbyCaseCount) {
    const parts = [];
    if (score >= 80) {
        parts.push("전세사기 위험이 매우 높습니다. 이 물건의 계약을 재고하시기 바랍니다.");
    } else if (score >= 60) {
        parts.push("전세사기 위험이 높습니다. 반드시 전문가 상담 후 진행하세요.");
    } else if (score >= 40) {
        parts.push("전세사기 주의가 필요합니다. 아래 위험요소를 확인하세요.");
    } else {
        parts.push("전세사기 위험도가 낮은 편이나, 기본적인 확인은 필요합니다.");
    }
    // 주요 위험 요인 언급
    const topRisk = topFactors[0];
    if (topRisk && topRisk.contribution > 2) {
        parts.push(`주요 위험요인: ${topRisk.featureName} — ${topRisk.explanation}`);
    }
    // 인근 사례
    if (nearbyCaseCount > 0) {
        parts.push(`인근 ${nearbyCaseCount}건의 전세사기 피해사례가 보고되었습니다.`);
    }
    // 기본 권고
    parts.push("전세보증금반환보증 가입, 전입신고/확정일자 즉시 처리를 권고합니다.");
    return parts.join(" ");
}
function extractFeaturesFromRiskScore(riskScore) {
    const seizureCount = riskScore.factors.filter((f)=>f.id.includes("seizure") && !f.id.includes("provisional")).length;
    const provisionalSeizureCount = riskScore.factors.filter((f)=>f.id.includes("provisional_seizure")).length;
    return {
        riskScore,
        mortgageRatio: riskScore.mortgageRatio,
        seizureCount,
        provisionalSeizureCount
    };
}
}),
"[project]/lib/event-bus.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA 이벤트 버스
 * ─────────────────
 * 크로스 기능 연계를 위한 인메모리 Pub/Sub 아키텍처.
 * 서버리스 환경(Vercel)에 적합한 요청 범위 이벤트 시스템.
 *
 * 특허 핵심: 각 분석 모듈의 결과가 이벤트로 발행되고,
 * 구독 모듈이 자동으로 반응하는 상호 참조 피드백 루프.
 */ __turbopack_context__.s([
    "AnalysisEventBus",
    ()=>AnalysisEventBus,
    "createEventBus",
    ()=>createEventBus
]);
class AnalysisEventBus {
    subscriptions = [];
    history = [];
    eventIdCounter = 0;
    /**
   * 이벤트 구독
   */ subscribe(eventType, handler, sourceModule) {
        const id = `sub_${++this.eventIdCounter}`;
        this.subscriptions.push({
            id,
            eventType,
            handler,
            sourceModule
        });
        return id;
    }
    /**
   * 구독 해제
   */ unsubscribe(subscriptionId) {
        this.subscriptions = this.subscriptions.filter((s)=>s.id !== subscriptionId);
    }
    /**
   * 이벤트 발행
   */ async emit(event) {
        const handledBy = [];
        const matchingSubs = this.subscriptions.filter((s)=>s.eventType === event.type);
        for (const sub of matchingSubs){
            try {
                await sub.handler(event);
                handledBy.push(sub.sourceModule);
            } catch (error) {
                console.error(`[EventBus] Handler error in ${sub.sourceModule}:`, error);
            }
        }
        this.history.push({
            event,
            handledBy,
            timestamp: new Date().toISOString()
        });
    }
    /**
   * 이벤트 히스토리 조회
   */ getHistory() {
        return [
            ...this.history
        ];
    }
    /**
   * 특정 타입 이벤트 히스토리
   */ getEventsByType(type) {
        return this.history.filter((h)=>h.event.type === type);
    }
    /**
   * 구독 현황
   */ getSubscriptionCount() {
        return this.subscriptions.length;
    }
    /**
   * 버스 초기화
   */ clear() {
        this.subscriptions = [];
        this.history = [];
        this.eventIdCounter = 0;
    }
}
function createEventBus() {
    return new AnalysisEventBus();
}
}),
"[project]/app/api/analyze-unified/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/openai.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prompts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/registry-parser.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$risk$2d$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/risk-scoring.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/validation-engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$molit$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/molit-api.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$price$2d$estimation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/price-estimation.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rate-limit.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/sanitize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redemption$2d$simulator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/redemption-simulator.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$confidence$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/confidence-engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$self$2d$verification$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/self-verification.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$v$2d$score$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/v-score.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cross$2d$analysis$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/cross-analysis.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$fraud$2d$risk$2d$model$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/fraud-risk-model.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$event$2d$bus$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/event-bus.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
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
/** 면적 문자열에서 숫자 추출 */ function parseAreaValue(areaStr) {
    const m = areaStr.match(/([\d.]+)\s*㎡/);
    return m ? parseFloat(m[1]) : 0;
}
async function POST(req) {
    try {
        // 인증 + 역할 기반 제한
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
        const ip = req.headers.get("x-forwarded-for") || "anonymous";
        const userId = session?.user?.id;
        const dailyLimit = session?.user?.dailyLimit || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ROLE_LIMITS"].GUEST;
        // 분당 rate limit
        const rl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimit"])(`analyze-unified:${userId || ip}`, 10);
        if (!rl.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "요청 한도 초과. 잠시 후 다시 시도해주세요."
            }, {
                status: 429,
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimitHeaders"])(rl)
            });
        }
        // 일일 사용량 체크
        const daily = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkDailyUsage"])(userId || `guest:${ip}`, dailyLimit);
        if (!daily.success) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "일일 사용 한도를 초과했습니다. 로그인하여 더 많이 분석하세요."
            }, {
                status: 429,
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rateLimitHeaders"])(daily)
            });
        }
        const { rawText: rawInput, estimatedPrice: userPrice, address: userAddress } = await req.json();
        // Input sanitization
        const rawText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["truncateInput"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$sanitize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripHtml"])(rawInput || ""), 50000);
        if (!rawText || rawText.trim().length < 20) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "등기부등본 텍스트를 입력해주세요."
            }, {
                status: 400
            });
        }
        // 1단계: 자체 파싱 엔진 (AI 미사용)
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseRegistry"])(rawText);
        // 주소 결정: 파싱된 주소 > 사용자 입력 주소
        const address = parsed.title.address || userAddress || "";
        // 2단계: MOLIT 실거래 데이터 조회 (선택적)
        let marketData = null;
        let marketDataFiltered = false;
        if (address) {
            try {
                const comprehensive = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$molit$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchComprehensivePrices"])(address, 12);
                if (comprehensive) {
                    marketData = {
                        sale: comprehensive.sale,
                        rent: comprehensive.rent,
                        jeonseRatio: comprehensive.jeonseRatio
                    };
                }
            } catch (e) {
                console.warn("MOLIT API 조회 실패:", e);
            }
        }
        // 2-1단계: 매매가 추정 엔진으로 비교매물 분석
        const regArea = parseAreaValue(parsed.title.area || "");
        const priceEstimation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$price$2d$estimation$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["estimatePrice"])({
            address,
            aptName: address,
            area: regArea > 0 ? regArea : undefined
        }, marketData?.sale ?? null, marketData?.rent ?? null);
        marketDataFiltered = priceEstimation.method === "building_match" || priceEstimation.method === "area_match";
        // 필터링된 비교매물로 marketData 갱신
        if (marketDataFiltered && priceEstimation.comparables.length > 0 && marketData?.sale) {
            const districtSale = marketData.sale;
            marketData = {
                ...marketData,
                districtSale,
                sale: {
                    avgPrice: priceEstimation.estimatedPrice,
                    minPrice: priceEstimation.priceRange.min,
                    maxPrice: priceEstimation.priceRange.max,
                    transactionCount: priceEstimation.comparableCount,
                    transactions: priceEstimation.comparables.sort((a, b)=>b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay - (a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay)),
                    period: districtSale.period
                }
            };
        }
        // 추정가 결정: 사용자 입력 > 엔진 추정가 > 0
        const estimatedPrice = userPrice || priceEstimation.estimatedPrice;
        // 3단계: 데이터 검증 엔진 (AI 미사용)
        const preValidation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateParsedRegistry"])(parsed, estimatedPrice);
        // 4단계: 자체 리스크 스코어링 (AI 미사용)
        const riskScore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$risk$2d$scoring$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateRiskScore"])(parsed, estimatedPrice);
        // 5단계: 통합 PropertyInfo 생성
        const propertyInfo = {
            address: parsed.title.address || address,
            type: parsed.title.purpose || "아파트",
            area: parsed.title.area || "",
            buildYear: parsed.title.buildingDetail || "",
            estimatedPrice,
            jeonsePrice: marketData?.rent?.avgDeposit || parsed.summary.totalJeonseAmount || 0,
            recentTransaction: marketData?.sale?.transactions?.[0] ? `${marketData.sale.transactions[0].dealYear}.${String(marketData.sale.transactions[0].dealMonth).padStart(2, "0")} / ${(marketData.sale.transactions[0].dealAmount / 100000000).toFixed(1)}억` : ""
        };
        // 6단계: 통합 RiskAnalysis 생성
        const jeonseRatio = marketData?.jeonseRatio ?? (estimatedPrice > 0 && propertyInfo.jeonsePrice > 0 ? Math.round(propertyInfo.jeonsePrice / estimatedPrice * 1000) / 10 : 0);
        const riskAnalysis = {
            jeonseRatio,
            mortgageRatio: riskScore.mortgageRatio,
            safetyScore: riskScore.totalScore,
            riskScore: 100 - riskScore.totalScore,
            risks: riskScore.factors.map((f)=>({
                    level: f.severity === "critical" || f.severity === "high" ? "danger" : f.severity === "medium" ? "warning" : "safe",
                    title: f.description,
                    description: f.detail
                }))
        };
        // 7단계: AI 종합 의견 (OpenAI)
        let aiOpinion = "";
        try {
            const costGuard = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["checkOpenAICostGuard"])(ip);
            if (!costGuard.allowed) {
                aiOpinion = "일일 AI 사용 한도를 초과했습니다. 자체 분석 결과만 제공됩니다.";
            } else {
                const openai = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$openai$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getOpenAIClient"])();
                // 시장 데이터 요약
                let marketContext = "";
                if (marketData?.sale && marketData.sale.transactionCount > 0) {
                    const s = marketData.sale;
                    const scope = marketDataFiltered ? "해당 건물" : "해당 구/군 전체";
                    marketContext += `\n${scope} 매매 실거래: 평균 ${formatKoreanPrice(s.avgPrice)}, ${s.transactionCount}건`;
                    if (marketDataFiltered && marketData.districtSale) {
                        marketContext += `\n(참고: 구/군 전체 평균 ${formatKoreanPrice(marketData.districtSale.avgPrice)}, ${marketData.districtSale.transactionCount}건 — 다른 건물 포함)`;
                    }
                }
                if (marketData?.rent && marketData.rent.jeonseCount > 0) {
                    const r = marketData.rent;
                    marketContext += `\n전세 실거래: 평균 보증금 ${(r.avgDeposit / 100000000).toFixed(1)}억, ${r.jeonseCount}건`;
                }
                if (jeonseRatio > 0) {
                    marketContext += `\n전세가율: ${jeonseRatio}%`;
                }
                const completion = await openai.chat.completions.create({
                    model: "gpt-4.1-mini",
                    messages: [
                        {
                            role: "system",
                            content: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UNIFIED_ANALYSIS_PROMPT"]
                        },
                        {
                            role: "user",
                            content: JSON.stringify({
                                parsedTitle: parsed.title,
                                activeGapgu: parsed.gapgu.filter((e)=>!e.isCancelled),
                                activeEulgu: parsed.eulgu.filter((e)=>!e.isCancelled),
                                summary: parsed.summary,
                                riskScore: {
                                    totalScore: riskScore.totalScore,
                                    grade: riskScore.grade,
                                    gradeLabel: riskScore.gradeLabel,
                                    factors: riskScore.factors,
                                    mortgageRatio: riskScore.mortgageRatio
                                },
                                estimatedPrice,
                                estimatedPriceFormatted: formatKoreanPrice(estimatedPrice),
                                jeonsePriceFormatted: formatKoreanPrice(propertyInfo.jeonsePrice),
                                recentTransaction: propertyInfo.recentTransaction,
                                marketContext: marketContext || "실거래 데이터 없음"
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
                    const aiResult = JSON.parse(content);
                    aiOpinion = aiResult.opinion || aiResult.aiOpinion || "";
                }
            }
        } catch  {
            aiOpinion = "AI 의견을 생성할 수 없습니다. API 키를 확인해주세요.";
        }
        // 최종 검증 (AI의견 포함 크로스체크)
        const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateParsedRegistry"])(parsed, estimatedPrice, riskScore, aiOpinion);
        // 8단계: 경매 배당 시뮬레이션 (특허 B: 권리순위 기반 배당 예측)
        const redemptionSimulation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$redemption$2d$simulator$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["simulateRedemption"])(parsed, estimatedPrice, propertyInfo.jeonsePrice || undefined, address);
        // 9단계: 신뢰도 전파 (특허 C: 가중 기하평균 복합 신뢰도)
        const confidencePropagation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$confidence$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["propagateConfidence"])(parsed, riskScore, estimatedPrice, priceEstimation.confidence, validation);
        // 10단계: 자기검증 루프 (특허 H: AI ↔ 결정론적 교차검증)
        const selfVerification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$self$2d$verification$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["selfVerify"])(aiOpinion, riskScore, estimatedPrice, validation, confidencePropagation.compositeReliability);
        // 11단계: V-Score 통합 위험도 산출 (특허 H-1: 이질적 데이터 통합 점수화)
        const vScore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$v$2d$score$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateVScore"])({
            riskScore,
            jeonseRatio: jeonseRatio || undefined,
            priceConfidence: priceEstimation.confidence,
            compositeReliability: confidencePropagation.compositeReliability
        });
        // 12단계: 크로스 기능 교차 분석 (특허 H-3: 피드백 루프)
        const crossAnalysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cross$2d$analysis$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["evaluateCrossAnalysis"])({
            riskScore,
            jeonseRatio: jeonseRatio || undefined,
            estimatedPrice,
            vScoreChange: undefined
        });
        // 13단계: 전세사기 위험 예측 (특허 H-2: SHAP 기여도 분석)
        const fraudFeatures = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$fraud$2d$risk$2d$model$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractFeaturesFromRiskScore"])(riskScore);
        if (jeonseRatio) fraudFeatures.jeonseRatio = jeonseRatio;
        const fraudRisk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$fraud$2d$risk$2d$model$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["predictFraudRisk"])(fraudFeatures);
        // 이벤트 버스: 분석 완료 이벤트 발행 (서버리스 per-request)
        const eventBus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$event$2d$bus$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createEventBus"])();
        eventBus.emit({
            type: "REGISTRY_ANALYZED",
            timestamp: new Date().toISOString(),
            data: {
                totalScore: riskScore.totalScore,
                factorCount: riskScore.factors.length
            },
            sourceModule: "analyze-unified"
        });
        if (vScore) {
            eventBus.emit({
                type: "VSCORE_UPDATED",
                timestamp: new Date().toISOString(),
                data: {
                    score: vScore.score,
                    grade: vScore.grade
                },
                sourceModule: "analyze-unified"
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            propertyInfo,
            riskAnalysis,
            parsed,
            validation,
            riskScore,
            marketData,
            aiOpinion,
            // 특허 강화 필드 (optional, 하위호환)
            redemptionSimulation,
            confidencePropagation,
            selfVerification,
            vScore,
            crossAnalysis,
            fraudRisk,
            eventLog: eventBus.getHistory(),
            dataSource: {
                registryParsed: true,
                molitAvailable: !!marketData,
                molitFiltered: marketDataFiltered,
                estimatedPriceSource: userPrice ? "user" : marketData?.sale?.avgPrice ? "molit" : "none"
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("Unified analysis error:", message);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `통합 분석 중 오류: ${message}`
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__9da8b173._.js.map