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
"[project]/lib/pdf-parser.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "detectRegistryConfidence",
    ()=>detectRegistryConfidence,
    "extractTextFromPDF",
    ()=>extractTextFromPDF,
    "normalizeRegistryText",
    ()=>normalizeRegistryText
]);
/**
 * PDF 텍스트 추출 유틸리티
 *
 * 등기부등본/계약서 PDF에서 텍스트를 추출하는 서버사이드 모듈입니다.
 * AI에 의존하지 않는 순수 TypeScript 기반 자체 OCR 파싱 기술입니다.
 *
 * unpdf (서버사이드 전용 PDF.js 래퍼) 를 사용하여
 * Node.js 환경에서 안정적으로 PDF 텍스트를 추출합니다.
 *
 * @module lib/pdf-parser
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$unpdf$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/unpdf/dist/index.mjs [app-route] (ecmascript)");
;
// ---------------------------------------------------------------------------
// 등기부등본 감지 키워드
// ---------------------------------------------------------------------------
const REGISTRY_KEYWORDS = [
    "표제부",
    "갑구",
    "을구",
    "소유권",
    "근저당",
    "등기부등본",
    "건물의 표시",
    "토지의 표시",
    "소유권에 관한 사항",
    "소유권 이외의 권리",
    "대지권",
    "등기목적",
    "접수",
    "순위번호"
];
function normalizeRegistryText(raw) {
    let text = raw;
    // 1. CRLF → LF 통일
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // 2. 페이지 구분자 제거 (--- Page X ---, [Page X] 등)
    text = text.replace(/[-=]{3,}\s*Page\s*\d+\s*[-=]{3,}/gi, "\n");
    text = text.replace(/\[?\s*페이지?\s*\d+\s*\]?/g, "");
    // 3. PDF 추출시 발생하는 다중 공백 정리
    text = text.replace(/[ \t]{3,}/g, "  ");
    // 4. 연속 빈줄 정리 (3줄 이상 → 2줄)
    text = text.replace(/\n{4,}/g, "\n\n\n");
    // 5. 줄 시작/끝 공백 정리
    text = text.split("\n").map((line)=>line.trimEnd()).join("\n");
    // 6. 전체 앞뒤 공백 정리
    text = text.trim();
    return text;
}
function detectRegistryConfidence(text) {
    const lowerText = text.toLowerCase();
    let matchCount = 0;
    for (const keyword of REGISTRY_KEYWORDS){
        if (lowerText.includes(keyword.toLowerCase())) {
            matchCount++;
        }
    }
    // 신뢰도 = (매칭 키워드 수 / 최소 필요 키워드 수) × 100, 최대 100
    const confidence = Math.min(100, Math.round(matchCount / 5 * 100));
    const isRegistry = matchCount >= 3; // 3개 이상 키워드 매칭시 등기부등본으로 판단
    return {
        isRegistry,
        confidence
    };
}
// ---------------------------------------------------------------------------
// 텍스트 품질 평가 (스캔 PDF vs 텍스트 PDF 구분)
// ---------------------------------------------------------------------------
function assessTextQuality(text, pageCount) {
    if (!text || text.length === 0) return 0;
    // 페이지당 평균 글자수
    const charsPerPage = text.length / Math.max(1, pageCount);
    // 한글 비율
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const koreanRatio = koreanChars / text.length;
    // 의미 있는 텍스트 기준:
    // - 페이지당 100자 이상
    // - 한글 비율 10% 이상 (한국 문서)
    if (charsPerPage < 50) return 10; // 거의 비어있음 (스캔 PDF 가능성)
    if (koreanRatio < 0.05) return 30; // 한글이 거의 없음
    let quality = 50;
    if (charsPerPage > 200) quality += 20;
    if (charsPerPage > 500) quality += 10;
    if (koreanRatio > 0.2) quality += 10;
    if (koreanRatio > 0.3) quality += 10;
    return Math.min(100, quality);
}
async function extractTextFromPDF(buffer, fileName = "document.pdf") {
    // unpdf로 텍스트 추출 (서버사이드 전용, DOMMatrix 등 브라우저 API 불필요)
    const { totalPages, text: rawText } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$unpdf$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractText"])(new Uint8Array(buffer), {
        mergePages: true
    });
    const pageCount = totalPages || 0;
    // 텍스트 품질 평가
    const quality = assessTextQuality(rawText, pageCount);
    if (quality < 20) {
        throw new Error("PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다. " + "인터넷등기소(iros.go.kr)에서 다운로드한 텍스트 기반 PDF를 사용해주세요.");
    }
    // 등기부등본 특화 후처리
    const normalizedText = normalizeRegistryText(rawText);
    // 등기부등본 감지
    const { isRegistry, confidence } = detectRegistryConfidence(normalizedText);
    return {
        text: normalizedText,
        pageCount,
        fileName,
        charCount: normalizedText.length,
        isRegistry,
        confidence
    };
}
}),
"[project]/lib/domain-vocabulary.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 도메인 용어 사전 유틸리티
 * KR-BERT 토크나이저 학습용 부동산 법률 특화 어휘 관리
 */ __turbopack_context__.s([
    "SEED_VOCABULARY",
    ()=>SEED_VOCABULARY,
    "VOCAB_CATEGORIES",
    ()=>VOCAB_CATEGORIES,
    "extractVocabularyFromParsed",
    ()=>extractVocabularyFromParsed
]);
const VOCAB_CATEGORIES = {
    registry_right: {
        label: "등기 권리 용어",
        target: 200
    },
    legal_action: {
        label: "법률 행위 용어",
        target: 150
    },
    structure: {
        label: "부동산 구조 용어",
        target: 100
    },
    finance_tax: {
        label: "금융/세무 용어",
        target: 100
    }
};
const SEED_VOCABULARY = [
    // 갑구 등기 권리 용어
    {
        term: "소유권이전",
        category: "legal_action",
        definition: "부동산 소유권을 양도인에서 양수인으로 이전하는 등기"
    },
    {
        term: "소유권보존",
        category: "legal_action",
        definition: "미등기 부동산에 최초로 소유권을 등기"
    },
    {
        term: "가압류",
        category: "registry_right",
        definition: "채권자가 채무자의 재산처분을 금지하는 보전처분"
    },
    {
        term: "압류",
        category: "registry_right",
        definition: "국가 또는 채권자가 채무자의 재산을 강제적으로 확보"
    },
    {
        term: "가처분",
        category: "registry_right",
        definition: "권리관계 변동을 방지하기 위한 보전처분"
    },
    {
        term: "경매개시결정",
        category: "legal_action",
        definition: "법원이 부동산 경매 절차를 개시하는 결정"
    },
    {
        term: "임의경매개시결정",
        category: "legal_action",
        definition: "담보권 실행을 위한 임의경매 개시"
    },
    {
        term: "강제경매개시결정",
        category: "legal_action",
        definition: "판결 등 집행권원에 기한 강제경매 개시"
    },
    {
        term: "신탁",
        category: "registry_right",
        definition: "부동산을 수탁자에게 이전하는 신탁등기"
    },
    {
        term: "신탁등기",
        category: "registry_right",
        definition: "신탁법에 따른 부동산 신탁의 등기"
    },
    {
        term: "가등기",
        category: "registry_right",
        definition: "본등기 순위를 보전하기 위한 예비적 등기"
    },
    {
        term: "소유권이전청구권가등기",
        category: "registry_right",
        definition: "소유권이전을 청구할 수 있는 권리의 가등기"
    },
    {
        term: "환매등기",
        category: "registry_right",
        definition: "매도인이 일정 기간 내 재매수할 수 있는 권리 등기"
    },
    {
        term: "예고등기",
        category: "registry_right",
        definition: "등기의 말소·회복 소송이 제기되었음을 공시하는 등기"
    },
    // 을구 등기 권리 용어
    {
        term: "근저당권설정",
        category: "registry_right",
        definition: "채권 최고액 범위 내 담보권 설정"
    },
    {
        term: "저당권설정",
        category: "registry_right",
        definition: "특정 채권에 대한 담보권 설정"
    },
    {
        term: "전세권설정",
        category: "registry_right",
        definition: "전세금을 지급하고 부동산을 사용·수익하는 권리 설정"
    },
    {
        term: "지상권설정",
        category: "registry_right",
        definition: "타인 토지에 건물 등을 소유하기 위한 권리 설정"
    },
    {
        term: "지역권설정",
        category: "registry_right",
        definition: "타인 토지를 자기 토지의 편익에 이용하는 권리 설정"
    },
    {
        term: "임차권등기",
        category: "registry_right",
        definition: "임차인의 대항력 보전을 위한 임차권 등기"
    },
    {
        term: "임차권설정",
        category: "registry_right",
        definition: "부동산 임대차 계약에 따른 임차권 설정"
    },
    {
        term: "전세권이전",
        category: "legal_action",
        definition: "전세권을 제3자에게 양도하는 등기"
    },
    {
        term: "근저당권이전",
        category: "legal_action",
        definition: "근저당권을 제3자에게 양도하는 등기"
    },
    {
        term: "근저당권변경",
        category: "legal_action",
        definition: "근저당권의 채권최고액·채무자 등 변경"
    },
    // 법률 행위 용어
    {
        term: "말소",
        category: "legal_action",
        definition: "등기를 소멸시키는 행위"
    },
    {
        term: "말소기준등기",
        category: "legal_action",
        definition: "경매시 소멸되는 권리의 기준이 되는 등기"
    },
    {
        term: "촉탁",
        category: "legal_action",
        definition: "관공서가 등기소에 등기를 신청하는 행위"
    },
    {
        term: "등기원인",
        category: "legal_action",
        definition: "등기를 하게 된 법률적 원인 (매매, 상속 등)"
    },
    {
        term: "매매",
        category: "legal_action",
        definition: "부동산 매매계약에 의한 소유권 이전"
    },
    {
        term: "상속",
        category: "legal_action",
        definition: "피상속인 사망으로 인한 부동산 권리 승계"
    },
    {
        term: "증여",
        category: "legal_action",
        definition: "무상으로 부동산 소유권을 이전"
    },
    {
        term: "법원경매",
        category: "legal_action",
        definition: "법원 주도의 부동산 강제 매각 절차"
    },
    // 부동산 구조 용어
    {
        term: "대지권비율",
        category: "structure",
        definition: "구분건물이 차지하는 토지 지분 비율"
    },
    {
        term: "전용면적",
        category: "structure",
        definition: "세대 내부에서 독점적으로 사용하는 면적"
    },
    {
        term: "공용면적",
        category: "structure",
        definition: "복도, 계단실 등 공동으로 사용하는 면적"
    },
    {
        term: "건폐율",
        category: "structure",
        definition: "대지면적 대비 건축면적의 비율"
    },
    {
        term: "용적률",
        category: "structure",
        definition: "대지면적 대비 건축물 연면적의 비율"
    },
    {
        term: "아파트",
        category: "structure",
        definition: "5층 이상 공동주택"
    },
    {
        term: "다세대주택",
        category: "structure",
        definition: "4층 이하 공동주택 (각 세대가 구분소유)"
    },
    {
        term: "다가구주택",
        category: "structure",
        definition: "3층 이하 단독주택 (1인 소유)"
    },
    {
        term: "오피스텔",
        category: "structure",
        definition: "업무 및 주거 겸용 건축물"
    },
    {
        term: "근린생활시설",
        category: "structure",
        definition: "주민 일상생활에 필요한 시설"
    },
    {
        term: "철근콘크리트",
        category: "structure",
        definition: "RC조 건축물 구조"
    },
    {
        term: "철골",
        category: "structure",
        definition: "S조 건축물 구조"
    },
    // 금융/세무 용어
    {
        term: "채권최고액",
        category: "finance_tax",
        definition: "근저당권이 담보하는 채권의 최고한도액"
    },
    {
        term: "취득세",
        category: "finance_tax",
        definition: "부동산 취득 시 부과되는 지방세"
    },
    {
        term: "양도소득세",
        category: "finance_tax",
        definition: "부동산 양도 시 발생하는 소득에 대한 세금"
    },
    {
        term: "재산세",
        category: "finance_tax",
        definition: "부동산 보유에 대해 부과되는 지방세"
    },
    {
        term: "종합부동산세",
        category: "finance_tax",
        definition: "고액 부동산 보유자에게 부과되는 국세"
    },
    {
        term: "증여세",
        category: "finance_tax",
        definition: "무상 이전 시 수증자에게 부과되는 세금"
    },
    {
        term: "상속세",
        category: "finance_tax",
        definition: "사망으로 인한 재산 이전 시 부과되는 세금"
    },
    {
        term: "전세보증금",
        category: "finance_tax",
        definition: "전세 계약 시 임차인이 지급하는 보증금"
    },
    {
        term: "보증금반환채권",
        category: "finance_tax",
        definition: "임대차 종료 시 보증금 반환을 청구할 수 있는 채권"
    },
    {
        term: "배당요구",
        category: "finance_tax",
        definition: "경매 배당절차에서 채권자가 배당을 요구하는 행위"
    }
];
function extractVocabularyFromParsed(parsed, rawText) {
    const terms = [];
    const seen = new Set();
    const add = (term, category)=>{
        const t = term.trim();
        if (t.length >= 2 && !seen.has(t)) {
            seen.add(t);
            terms.push({
                term: t,
                category
            });
        }
    };
    // 갑구/을구 항목의 purpose(권리종류)에서 추출
    for (const entry of parsed.gapgu){
        if (entry.purpose) add(entry.purpose, "registry_right");
    }
    for (const entry of parsed.eulgu){
        if (entry.purpose) add(entry.purpose, "registry_right");
    }
    // 금융/세무 용어 패턴 매칭
    const financeTaxPatterns = [
        "채권최고액",
        "취득세",
        "양도소득세",
        "재산세",
        "종합부동산세",
        "증여세",
        "상속세",
        "전세보증금",
        "보증금반환채권",
        "배당요구",
        "근저당권부채권양도",
        "전세금",
        "임대보증금",
        "월세",
        "관리비",
        "부가가치세",
        "인지세",
        "교육세",
        "농어촌특별세"
    ];
    for (const pattern of financeTaxPatterns){
        if (rawText.includes(pattern)) {
            add(pattern, "finance_tax");
        }
    }
    // 부동산 구조 용어 패턴 매칭
    const structurePatterns = [
        "대지권비율",
        "전용면적",
        "공용면적",
        "건폐율",
        "용적률",
        "연면적",
        "대지면적",
        "건축면적",
        "층수",
        "지하층",
        "주차장",
        "엘리베이터",
        "필로티"
    ];
    for (const pattern of structurePatterns){
        if (rawText.includes(pattern)) {
            add(pattern, "structure");
        }
    }
    // 법률 행위 용어 패턴 매칭
    const legalActionPatterns = [
        "말소",
        "촉탁",
        "매매",
        "상속",
        "증여",
        "교환",
        "수용",
        "법원경매",
        "공매",
        "분할",
        "합병",
        "멸실",
        "신축",
        "대위변제",
        "채권양도",
        "해지",
        "해제",
        "취소"
    ];
    for (const pattern of legalActionPatterns){
        if (rawText.includes(pattern)) {
            add(pattern, "legal_action");
        }
    }
    return terms;
}
}),
"[project]/app/api/admin/training-data/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/prisma.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/registry-parser.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pdf$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/pdf-parser.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$domain$2d$vocabulary$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/domain-vocabulary.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
async function GET(req) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user || session.user.role !== "ADMIN") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "관리자 권한 필요"
        }, {
            status: 403
        });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const where = status && status !== "all" ? {
        status
    } : {};
    const [items, total] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.findMany({
            where,
            select: {
                id: true,
                status: true,
                sourceFileName: true,
                sourceType: true,
                confidence: true,
                charCount: true,
                gapguCount: true,
                eulguCount: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: "desc"
            },
            skip,
            take: limit
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count({
            where
        })
    ]);
    // 상태별 통계
    const [totalCount, pendingCount, reviewedCount, approvedCount, rejectedCount, avgConfidence] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count(),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count({
            where: {
                status: "pending"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count({
            where: {
                status: "reviewed"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count({
            where: {
                status: "approved"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.count({
            where: {
                status: "rejected"
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.aggregate({
            _avg: {
                confidence: true
            }
        })
    ]);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: {
            total: totalCount,
            pending: pendingCount,
            reviewed: reviewedCount,
            approved: approvedCount,
            rejected: rejectedCount,
            avgConfidence: Math.round(avgConfidence._avg.confidence || 0)
        }
    });
}
async function POST(req) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auth"])();
    if (!session?.user || session.user.role !== "ADMIN") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "관리자 권한 필요"
        }, {
            status: 403
        });
    }
    const contentType = req.headers.get("content-type") || "";
    let rawText = "";
    let sourceFileName = "";
    let sourceType = "text";
    if (contentType.includes("multipart/form-data")) {
        // 파일 업로드
        const formData = await req.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof File)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "파일을 업로드해주세요."
            }, {
                status: 400
            });
        }
        if (file.size > 10 * 1024 * 1024) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "파일 크기가 10MB를 초과합니다."
            }, {
                status: 400
            });
        }
        sourceFileName = file.name;
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isPdf = ext === "pdf" || file.type === "application/pdf";
        const isTxt = ext === "txt" || file.type === "text/plain";
        if (isPdf) {
            sourceType = "pdf";
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pdf$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractTextFromPDF"])(buffer, file.name);
            rawText = result.text;
        } else if (isTxt) {
            sourceType = "text";
            rawText = await file.text();
        } else {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "PDF 또는 TXT 파일만 업로드할 수 있습니다."
            }, {
                status: 400
            });
        }
    } else {
        // JSON 텍스트 직접 입력
        const body = await req.json();
        rawText = body.rawText;
        sourceFileName = body.sourceFileName || "직접입력";
        sourceType = "text";
    }
    if (!rawText?.trim()) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "텍스트가 비어있습니다."
        }, {
            status: 400
        });
    }
    // 정규화 + 신뢰도 검사
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pdf$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRegistryText"])(rawText);
    const { confidence } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$pdf$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["detectRegistryConfidence"])(normalized);
    // 중복 검사
    const textHash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hashForSearch"])(normalized);
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.findUnique({
        where: {
            rawTextHash: textHash
        }
    });
    if (existing) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "이미 등록된 문서입니다.",
            existingId: existing.id
        }, {
            status: 409
        });
    }
    // 파싱
    const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$registry$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseRegistry"])(normalized);
    // 암호화하여 저장
    const encrypted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["encryptPII"])(normalized);
    // 도메인 용어 자동 추출 → DomainVocabulary upsert
    const extractedTerms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$domain$2d$vocabulary$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractVocabularyFromParsed"])(parsed, normalized);
    for (const t of extractedTerms){
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].domainVocabulary.upsert({
            where: {
                term: t.term
            },
            update: {
                frequency: {
                    increment: 1
                }
            },
            create: {
                term: t.term,
                category: t.category,
                source: "auto_extracted"
            }
        }).catch(()=>{});
    }
    const record = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].trainingData.create({
        data: {
            rawTextEncrypted: encrypted,
            rawTextHash: textHash,
            parsedData: JSON.parse(JSON.stringify(parsed)),
            sourceFileName,
            sourceType,
            confidence,
            charCount: normalized.length,
            gapguCount: parsed.gapgu.length,
            eulguCount: parsed.eulgu.length
        }
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        id: record.id,
        status: record.status,
        sourceFileName: record.sourceFileName,
        confidence: record.confidence,
        charCount: record.charCount,
        gapguCount: record.gapguCount,
        eulguCount: record.eulguCount,
        parsedData: parsed
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__db62078e._.js.map