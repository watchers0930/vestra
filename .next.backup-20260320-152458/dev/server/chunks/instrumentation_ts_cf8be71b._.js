module.exports = [
"[project]/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "register",
    ()=>register
]);
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        const { validateEnv } = await __turbopack_context__.A("[project]/lib/env.ts [instrumentation] (ecmascript, async loader)");
        validateEnv();
    }
}
}),
];

//# sourceMappingURL=instrumentation_ts_cf8be71b._.js.map