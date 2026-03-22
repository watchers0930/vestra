module.exports = [
"[project]/lib/pdf-export.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_html2canvas_dist_html2canvas_esm_cd3010df.js",
  "server/chunks/ssr/node_modules_core-js_32675ca5._.js",
  "server/chunks/ssr/node_modules_canvg_lib_index_cjs_5860bc3b._.js",
  "server/chunks/ssr/node_modules_pako_dist_pako_esm_mjs_9e9258e5._.js",
  "server/chunks/ssr/node_modules_jspdf_dist_jspdf_node_min_ce6eb4cc.js",
  "server/chunks/ssr/node_modules_fa8d7cfc._.js",
  "server/chunks/ssr/[root-of-the-server]__1f056d79._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/lib/pdf-export.ts [app-ssr] (ecmascript)");
    });
});
}),
];