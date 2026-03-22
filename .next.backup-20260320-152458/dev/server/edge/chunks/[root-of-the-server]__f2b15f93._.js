(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>middleware
]);
/**
 * Next.js Middleware (경량 버전)
 *
 * NextAuth v5 JWE 토큰을 직접 복호화하여 경로 보호
 * - auth() 전체를 import하지 않아 Edge Function 크기 최소화
 * - HKDF 키 파생 + jwtDecrypt로 암호화된 JWT 복호화
 *
 * @module middleware
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$decrypt$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/decrypt.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$web$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@panva/hkdf/dist/web/index.js [middleware-edge] (ecmascript)");
;
;
;
async function getDerivedEncryptionKey(secret, salt) {
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$web$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["hkdf"])("sha256", secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64 // A256CBC-HS512
    );
}
async function getToken(req) {
    const cookieName = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : "authjs.session-token";
    const token = req.cookies.get(cookieName)?.value;
    if (!token) return null;
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    try {
        const encryptionKey = await getDerivedEncryptionKey(secret, cookieName);
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$decrypt$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["jwtDecrypt"])(token, encryptionKey, {
            clockTolerance: 15
        });
        return payload;
    } catch (err) {
        // Edge Runtime에서는 Prisma 사용 불가 → console.warn으로 기록
        console.warn("[Middleware] JWT 복호화 실패:", err instanceof Error ? err.message : "unknown", "| IP:", req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
        return null;
    }
}
async function middleware(req) {
    const { pathname } = req.nextUrl;
    // 루트("/") 접근 시: 로그인 사용자 → /dashboard 리다이렉트
    if (pathname === "/") {
        const token = await getToken(req);
        if (token) {
            if (token.role === "ADMIN") {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/admin", req.url));
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/dashboard", req.url));
        }
    // 비로그인 → 랜딩 페이지 (그대로 진행)
    }
    // 관리자 경로 보호
    if (pathname.startsWith("/admin")) {
        const token = await getToken(req);
        if (!token || token.role !== "ADMIN") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", req.url));
        }
    }
    // 프로필, 대시보드 보호 (로그인 필수)
    if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) {
        const token = await getToken(req);
        if (!token) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", req.url));
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map