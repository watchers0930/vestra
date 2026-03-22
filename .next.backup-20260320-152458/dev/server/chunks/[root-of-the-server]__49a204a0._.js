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
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

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
"[project]/lib/training-data-export.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * VESTRA ML 학습 데이터 내보내기 유틸리티
 * ─────────────────────────────────────────
 * 승인된 TrainingData에서 KR-BERT 파인튜닝용 JSONL 생성.
 * 3가지 형식: 분류(Classification), NER, 구조 추출(Structure).
 */ __turbopack_context__.s([
    "generateAllLabels",
    ()=>generateAllLabels,
    "generateClassificationLabels",
    ()=>generateClassificationLabels,
    "generateNERLabels",
    ()=>generateNERLabels,
    "generateStructureLabels",
    ()=>generateStructureLabels,
    "toJSONL",
    ()=>toJSONL
]);
function generateClassificationLabels(parsed) {
    const labels = [];
    for (const entry of parsed.gapgu){
        if (entry.detail.trim()) {
            labels.push({
                text: entry.detail,
                riskType: entry.riskType,
                rightType: entry.purpose,
                section: "갑구"
            });
        }
    }
    for (const entry of parsed.eulgu){
        if (entry.detail.trim()) {
            labels.push({
                text: entry.detail,
                riskType: entry.riskType,
                rightType: entry.purpose,
                section: "을구"
            });
        }
    }
    return labels;
}
// ─── NER 라벨 생성 ───
function findEntityOffset(rawText, value, entityType, searchFrom = 0) {
    if (!value || !value.trim()) return null;
    const idx = rawText.indexOf(value, searchFrom);
    if (idx === -1) return null;
    return {
        text: value,
        type: entityType,
        startOffset: idx,
        endOffset: idx + value.length,
        confidence: 1.0
    };
}
function extractEntitiesFromEntry(rawText, entry, section) {
    const entities = [];
    // 권리자
    const holderType = entry.purpose.includes("근저당") ? "근저당권자" : entry.purpose.includes("임차") ? "임차인" : entry.purpose.includes("압류") || entry.purpose.includes("가압류") ? "압류권자" : "소유자";
    const holder = findEntityOffset(rawText, entry.holder, holderType);
    if (holder) entities.push(holder);
    // 날짜
    const date = findEntityOffset(rawText, entry.date, "설정일");
    if (date) entities.push(date);
    // 권리종류
    const rightType = findEntityOffset(rawText, entry.purpose, "권리종류");
    if (rightType) entities.push(rightType);
    // 금액 (을구만)
    if ("amount" in entry && entry.amount > 0) {
        const amountStr = entry.amount.toLocaleString();
        const amount = findEntityOffset(rawText, amountStr, "채권최고액");
        if (amount) entities.push(amount);
    }
    return entities;
}
function generateNERLabels(parsed, rawText) {
    const allEntities = [];
    // 표제부 엔티티
    const titleEntities = [
        {
            value: parsed.title.address,
            type: "주소"
        },
        {
            value: parsed.title.area,
            type: "면적"
        },
        {
            value: parsed.title.purpose,
            type: "용도"
        }
    ];
    for (const { value, type } of titleEntities){
        const entity = findEntityOffset(rawText, value, type);
        if (entity) allEntities.push(entity);
    }
    // 갑구 엔티티
    for (const entry of parsed.gapgu){
        allEntities.push(...extractEntitiesFromEntry(rawText, entry, "갑구"));
    }
    // 을구 엔티티
    for (const entry of parsed.eulgu){
        allEntities.push(...extractEntitiesFromEntry(rawText, entry, "을구"));
    }
    if (allEntities.length === 0) return [];
    // offset 정렬
    allEntities.sort((a, b)=>a.startOffset - b.startOffset);
    return [
        {
            text: rawText,
            entities: allEntities
        }
    ];
}
function generateStructureLabels(parsed, rawText) {
    return [
        {
            input: rawText,
            output: {
                title: parsed.title,
                gapgu: parsed.gapgu,
                eulgu: parsed.eulgu,
                summary: parsed.summary
            }
        }
    ];
}
function generateAllLabels(parsed, rawText) {
    return {
        classification: generateClassificationLabels(parsed),
        ner: generateNERLabels(parsed, rawText),
        structure: generateStructureLabels(parsed, rawText)
    };
}
function toJSONL(items) {
    return items.map((item)=>JSON.stringify(item)).join("\n");
}
}),
"[project]/app/api/admin/training-data/export/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$training$2d$data$2d$export$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/training-data-export.ts [app-route] (ecmascript)");
;
;
;
;
;
async function GET() {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user || session.user.role !== "ADMIN") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "관리자 권한 필요"
        }, {
            status: 403
        });
    }
    const approved = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.findMany({
        where: {
            status: "approved"
        },
        orderBy: {
            createdAt: "asc"
        }
    });
    if (approved.length === 0) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "승인된 학습 데이터가 없습니다."
        }, {
            status: 404
        });
    }
    const allLabels = [];
    for (const item of approved){
        const rawText = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["decryptPII"])(item.rawTextEncrypted);
        const parsed = item.parsedData;
        if (!parsed || !rawText) continue;
        const labels = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$training$2d$data$2d$export$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateAllLabels"])(parsed, rawText);
        // 분류 라벨
        for (const cl of labels.classification){
            allLabels.push({
                type: "classification",
                ...cl
            });
        }
        // NER 라벨
        for (const ner of labels.ner){
            allLabels.push({
                type: "ner",
                ...ner
            });
        }
        // 구조 추출 라벨
        for (const st of labels.structure){
            allLabels.push({
                type: "structure",
                ...st
            });
        }
    }
    const jsonl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$training$2d$data$2d$export$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toJSONL"])(allLabels);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](jsonl, {
        headers: {
            "Content-Type": "application/jsonl",
            "Content-Disposition": `attachment; filename=vestra-training-${date}.jsonl`
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__49a204a0._.js.map