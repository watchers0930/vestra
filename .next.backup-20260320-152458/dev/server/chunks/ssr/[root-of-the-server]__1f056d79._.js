module.exports = [
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/worker_threads [external] (worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("worker_threads", () => require("worker_threads"));

module.exports = mod;
}),
"[project]/lib/pdf-export.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "exportReportDirectPdf",
    ()=>exportReportDirectPdf,
    "exportToPdf",
    ()=>exportToPdf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$html2canvas$2f$dist$2f$html2canvas$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/html2canvas/dist/html2canvas.esm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jspdf$2f$dist$2f$jspdf$2e$node$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jspdf/dist/jspdf.node.min.js [app-ssr] (ecmascript)");
"use client";
;
;
async function exportToPdf({ filename = "vestra-report.pdf", title = "VESTRA 분석 리포트", element }) {
    // 요소를 캔버스로 캡처
    const canvas = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$html2canvas$2f$dist$2f$html2canvas$2e$esm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false
    });
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 너비 (mm)
    const imgHeight = canvas.height * imgWidth / canvas.width;
    const pdf = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jspdf$2f$dist$2f$jspdf$2e$node$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"]("p", "mm", "a4");
    // 헤더
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(title, 10, 8);
    pdf.text(new Date().toLocaleDateString("ko-KR"), 200, 8, {
        align: "right"
    });
    // 이미지 삽입 (여러 페이지 지원)
    const pageHeight = 287; // A4 높이 (mm) - 마진
    let heightLeft = imgHeight;
    let position = 12;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while(heightLeft > 0){
        position = heightLeft - imgHeight + 12;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }
    // 푸터
    const totalPages = pdf.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++){
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(180);
        pdf.text(`VESTRA AI Asset Management Platform | Page ${i}/${totalPages}`, 105, 292, {
            align: "center"
        });
    }
    pdf.save(filename);
}
const MARGIN = 15;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
async function exportReportDirectPdf({ filename = "vestra-report.pdf", report }) {
    const pdf = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jspdf$2f$dist$2f$jspdf$2e$node$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"]("p", "mm", "a4");
    let y = MARGIN;
    function checkPage(needed) {
        if (y + needed > 280) {
            pdf.addPage();
            y = MARGIN;
        }
    }
    function drawLine() {
        pdf.setDrawColor(220);
        pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 3;
    }
    // ─── 타이틀 ───
    pdf.setFontSize(16);
    pdf.setTextColor(30);
    pdf.text("VESTRA Integrated Risk Report", MARGIN, y);
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(`Report ID: ${report.reportId} | Generated: ${new Date(report.generatedAt).toLocaleString("ko-KR")} | v${report.version}`, MARGIN, y);
    y += 10;
    drawLine();
    // ─── 종합 등급 ───
    pdf.setFontSize(13);
    pdf.setTextColor(30);
    pdf.text(`Grade: ${report.overallGrade} (${report.overallScore}/100)`, MARGIN, y);
    y += 7;
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    const summaryLines = pdf.splitTextToSize(report.summary, CONTENT_W);
    pdf.text(summaryLines, MARGIN, y);
    y += summaryLines.length * 4.5 + 5;
    // ─── 물건 정보 ───
    checkPage(20);
    pdf.setFontSize(11);
    pdf.setTextColor(30);
    pdf.text("Property Information", MARGIN, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setTextColor(60);
    pdf.text(`Address: ${report.propertyInfo.address}`, MARGIN, y);
    y += 4.5;
    pdf.text(`Type: ${report.propertyInfo.type}`, MARGIN, y);
    y += 4.5;
    if (report.propertyInfo.estimatedPrice > 0) {
        pdf.text(`Estimated Price: ${report.propertyInfo.estimatedPrice.toLocaleString()} KRW`, MARGIN, y);
        y += 4.5;
    }
    if (report.propertyInfo.jeonseRatio != null) {
        pdf.text(`Jeonse Ratio: ${report.propertyInfo.jeonseRatio}%`, MARGIN, y);
        y += 4.5;
    }
    y += 3;
    drawLine();
    // ─── 권리분석 ───
    if (report.registryRisk) {
        checkPage(30);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text("Registry Risk Analysis", MARGIN, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        pdf.text(`Score: ${report.registryRisk.score.totalScore} | Factors: ${report.registryRisk.factorCount} | Critical: ${report.registryRisk.criticalCount} | Mortgage Ratio: ${report.registryRisk.score.mortgageRatio}%`, MARGIN, y);
        y += 5;
        for (const f of report.registryRisk.score.factors){
            checkPage(8);
            const severity = f.severity === "critical" ? "[!]" : "[-]";
            const line = `${severity} ${f.description} (${f.detail}) -${f.deduction}pt`;
            const wrapped = pdf.splitTextToSize(line, CONTENT_W);
            pdf.text(wrapped, MARGIN + 3, y);
            y += wrapped.length * 4.5;
        }
        y += 3;
        drawLine();
    }
    // ─── 계약분석 ───
    if (report.contractRisk) {
        checkPage(20);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text("Contract Risk Analysis", MARGIN, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        pdf.text(`Risk Level: ${report.contractRisk.overallRisk.toUpperCase()} | Risk Clauses: ${report.contractRisk.riskClauses} | Missing: ${report.contractRisk.missingClauses}`, MARGIN, y);
        y += 5;
        for (const h of report.contractRisk.highlights){
            checkPage(8);
            const wrapped = pdf.splitTextToSize(`- ${h}`, CONTENT_W);
            pdf.text(wrapped, MARGIN + 3, y);
            y += wrapped.length * 4.5;
        }
        y += 3;
        drawLine();
    }
    // ─── 시세분석 ───
    if (report.priceAnalysis) {
        checkPage(25);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text("Price Analysis", MARGIN, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        pdf.text(`Current Estimate: ${report.priceAnalysis.currentEstimate.toLocaleString()} KRW`, MARGIN, y);
        y += 4.5;
        pdf.text(`Optimistic: ${report.priceAnalysis.scenarioOptimistic.toLocaleString()} | Base: ${report.priceAnalysis.scenarioBase.toLocaleString()} | Pessimistic: ${report.priceAnalysis.scenarioPessimistic.toLocaleString()}`, MARGIN, y);
        y += 4.5;
        pdf.text(`Confidence: ${Math.round(report.priceAnalysis.confidence * 100)}%`, MARGIN, y);
        y += 5;
        drawLine();
    }
    // ─── 체크리스트 ───
    if (report.checklist.length > 0) {
        checkPage(15);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text(`Document Checklist (${report.checklist.length} items)`, MARGIN, y);
        y += 6;
        pdf.setFontSize(8);
        pdf.setTextColor(60);
        for (const item of report.checklist){
            checkPage(8);
            const pLabel = item.priority === "required" ? "[REQ]" : item.priority === "recommended" ? "[REC]" : "[OPT]";
            const line = `${pLabel} ${item.name} — ${item.where}`;
            const wrapped = pdf.splitTextToSize(line, CONTENT_W);
            pdf.text(wrapped, MARGIN + 3, y);
            y += wrapped.length * 3.8;
        }
        y += 3;
        drawLine();
    }
    // ─── 권고사항 ───
    if (report.recommendations.length > 0) {
        checkPage(15);
        pdf.setFontSize(11);
        pdf.setTextColor(30);
        pdf.text("Recommendations", MARGIN, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        for(let i = 0; i < report.recommendations.length; i++){
            checkPage(10);
            const line = `${i + 1}. ${report.recommendations[i]}`;
            const wrapped = pdf.splitTextToSize(line, CONTENT_W);
            pdf.text(wrapped, MARGIN, y);
            y += wrapped.length * 4.5 + 1;
        }
        y += 3;
        drawLine();
    }
    // ─── 면책조항 + 푸터 ───
    const totalPages = pdf.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++){
        pdf.setPage(i);
        pdf.setFontSize(6);
        pdf.setTextColor(180);
        pdf.text("This report is generated by AI analysis and has no legal effect. Consult a professional for accurate judgement.", 105, 289, {
            align: "center"
        });
        pdf.text(`VESTRA v${report.version} | Page ${i}/${totalPages}`, 105, 293, {
            align: "center"
        });
    }
    pdf.save(filename);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1f056d79._.js.map