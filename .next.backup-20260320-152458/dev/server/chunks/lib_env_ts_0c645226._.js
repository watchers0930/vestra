module.exports = [
"[project]/lib/env.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * 환경변수 검증
 *
 * 서버 사이드에서만 실행되며, 필수 환경변수 누락 시 경고를 출력합니다.
 * 앱이 멈추지는 않지만, 해당 기능이 비활성화됩니다.
 */ __turbopack_context__.s([
    "validateEnv",
    ()=>validateEnv
]);
const ENV_VARS = [
    {
        key: "OPENAI_API_KEY",
        required: true,
        description: "OpenAI API (AI 분석)"
    },
    {
        key: "DATABASE_URL",
        required: true,
        description: "PostgreSQL 연결"
    },
    {
        key: "AUTH_SECRET",
        required: true,
        description: "NextAuth 인증"
    },
    {
        key: "MOLIT_API_KEY",
        required: false,
        description: "국토교통부 실거래가/건축물대장 API"
    },
    {
        key: "BOK_API_KEY",
        required: false,
        description: "한국은행 기준금리 API"
    },
    {
        key: "REB_API_KEY",
        required: false,
        description: "한국부동산원 R-ONE API"
    },
    {
        key: "SEOUL_DATA_API_KEY",
        required: false,
        description: "서울 열린데이터광장 API"
    },
    {
        key: "NEXT_PUBLIC_KAKAO_MAP_KEY",
        required: false,
        description: "카카오 지도"
    }
];
let validated = false;
function validateEnv() {
    if (validated || ("TURBOPACK compile-time value", "undefined") !== "undefined") return;
    validated = true;
    const missing = [];
    const warnings = [];
    for (const { key, required, description } of ENV_VARS){
        if (!process.env[key]) {
            if (required) {
                missing.push(`  - ${key}: ${description}`);
            } else {
                warnings.push(`  - ${key}: ${description} (선택, 해당 기능 비활성화)`);
            }
        }
    }
    if (missing.length > 0) {
        console.error(`\n[VESTRA] 필수 환경변수가 누락되었습니다:\n${missing.join("\n")}\n`);
    }
    if (warnings.length > 0) {
        console.warn(`[VESTRA] 선택 환경변수 미설정:\n${warnings.join("\n")}`);
    }
}
}),
];

//# sourceMappingURL=lib_env_ts_0c645226._.js.map