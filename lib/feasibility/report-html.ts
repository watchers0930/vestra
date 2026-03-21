import type {
  FeasibilityReport,
  MergedProjectContext,
  VerificationResult,
  ChapterOpinion,
  FeasibilityScore,
} from "./feasibility-types";

function gradeColor(grade: string): string {
  switch (grade) {
    case "APPROPRIATE": return "#38a169";
    case "OPTIMISTIC": return "#d69e2e";
    case "UNREALISTIC": return "#e53e3e";
    case "CONSERVATIVE": return "#3182ce";
    default: return "#718096";
  }
}

function gradeLabel(grade: string): string {
  switch (grade) {
    case "APPROPRIATE": return "적정";
    case "OPTIMISTIC": return "낙관적";
    case "UNREALISTIC": return "비현실적";
    case "CONSERVATIVE": return "보수적";
    default: return grade;
  }
}

export function normalizeFeasibilityReport(input: unknown): FeasibilityReport {
  const report = (input || {}) as Partial<FeasibilityReport> & {
    projectName?: string;
    location?: string;
    verifications?: VerificationResult[];
    investmentOpinion?: string;
  };

  const projectContext = report.projectContext || {
    projectName: report.projectName || "미지정 사업",
    location: {
      address: report.location || "",
      district: "",
      dongCode: "",
    },
    scale: {
      totalLandArea: 0,
      totalFloorArea: 0,
      floorAreaRatio: 0,
      buildingCoverage: 0,
      floors: { above: 0, below: 0 },
      totalUnits: 0,
    },
    purpose: "기타",
    claims: [],
    conflicts: [],
    resolvedConflicts: [],
    sourceFiles: [],
  } satisfies MergedProjectContext;

  const chapters = (report.chapters || []).map((chapter) => ({
    ...chapter,
    dataTable: chapter.dataTable || [],
    verificationDetails: chapter.verificationDetails || [],
    overallReview: chapter.overallReview || "",
    riskHighlight: Boolean(chapter.riskHighlight),
  })) satisfies ChapterOpinion[];

  const vScore = {
    score: report.vScore?.score || 0,
    grade: report.vScore?.grade || "F",
    gradeLabel: report.vScore?.gradeLabel || "미평가",
    breakdown: report.vScore?.breakdown || [],
    investmentOpinion:
      report.vScore?.investmentOpinion ||
      report.investmentOpinion ||
      "",
  } satisfies FeasibilityScore;

  return {
    id: report.id || "preview",
    projectContext,
    verificationResults: report.verificationResults || report.verifications || [],
    rationalityItems: report.rationalityItems || [],
    chapters,
    vScore,
    metadata: {
      version: report.metadata?.version || "1.0",
      generatedAt: report.metadata?.generatedAt || new Date().toISOString(),
      sourceFiles: report.metadata?.sourceFiles || projectContext.sourceFiles.map((file) => file.filename),
      disclaimer:
        report.metadata?.disclaimer ||
        "본 보고서는 AI 기반 자동 분석 결과로, 투자 결정의 유일한 근거로 사용해서는 안 됩니다. 전문 감정평가사 또는 신용평가사의 검토를 권장합니다.",
    },
  };
}

export function generateFeasibilityReportHtml(reportInput: unknown): string {
  const report = normalizeFeasibilityReport(reportInput);
  const { projectContext: ctx, vScore, chapters, verificationResults, metadata } = report;

  const chaptersHtml = (chapters || [])
    .map(
      (ch) => `
    <div class="chapter ${ch.riskHighlight ? "risk" : ""}">
      <h2>Chapter ${ch.chapterId}. ${ch.title}</h2>
      ${ch.summary ? `<p class="summary">${ch.summary}</p>` : ""}

      ${
        (ch.dataTable || []).length > 0
          ? `<table>
              <thead><tr><th>항목</th><th>값</th><th>단위</th></tr></thead>
              <tbody>${(ch.dataTable || [])
                .map((r) => `<tr><td>${r.label}</td><td>${r.value}</td><td>${r.unit}</td></tr>`)
                .join("")}</tbody>
            </table>`
          : ""
      }

      ${
        (ch.verificationDetails || []).length > 0
          ? `<div class="details">
              ${(ch.verificationDetails || [])
                .map(
                  (d) =>
                    `<div class="detail-item">
                      <span class="badge" style="background:${gradeColor(d.grade)}20;color:${gradeColor(d.grade)}">${gradeLabel(d.grade)}</span>
                      <strong>${d.claim}</strong>: ${d.reasoning}
                    </div>`
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        ch.overallReview
          ? `<div class="review-opinion ${ch.riskHighlight ? "risk" : ""}">
              <h4>검토 의견 (Review Opinion)</h4>
              <p>${ch.overallReview}</p>
            </div>`
          : ""
      }
    </div>
  `
    )
    .join("");

  const verificationHtml = (verificationResults || [])
    .map(
      (v) =>
        `<tr>
          <td>${v.claimLabel}</td>
          <td class="right">${v.claimValue.toLocaleString()}${v.claimUnit}</td>
          <td class="right">${v.benchmark.value.toLocaleString()}${v.claimUnit}</td>
          <td class="right ${v.deviationPercent > 0 ? "red" : "blue"}">${v.deviationPercent > 0 ? "+" : ""}${v.deviationPercent.toFixed(1)}%</td>
          <td>${v.benchmark.source}</td>
        </tr>`
    )
    .join("");

  const rationalityHtml = (report.rationalityItems || [])
    .map(
      (r) =>
        `<tr>
          <td>${r.claimLabel}</td>
          <td><span class="badge" style="background:${gradeColor(r.grade)}20;color:${gradeColor(r.grade)}">${gradeLabel(r.grade)}</span></td>
          <td class="right ${r.deviation > 0 ? "red" : "blue"}">${r.deviation > 0 ? "+" : ""}${(r.deviation * 100).toFixed(1)}%</td>
          <td>${r.reasoning}</td>
          <td>${r.verificationSource}</td>
        </tr>`
    )
    .join("");

  const breakdownHtml = (vScore.breakdown || [])
    .map(
      (b) =>
        `<tr>
          <td>${b.category}</td>
          <td class="right">${(b.weight * 100).toFixed(0)}%</td>
          <td class="right">${b.score.toFixed(1)}</td>
          <td><span class="badge" style="background:${gradeColor(b.grade)}20;color:${gradeColor(b.grade)}">${gradeLabel(b.grade)}</span></td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>VESTRA 사업성 분석 보고서 - ${ctx.projectName}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: "Apple SD Gothic Neo","Noto Sans KR",sans-serif; font-size: 10pt; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 22pt; color: #1a365d; border-bottom: 3px solid #2b6cb0; padding-bottom: 10px; }
    h2 { font-size: 16pt; color: #2b6cb0; border-bottom: 1px solid #bee3f8; padding-bottom: 6px; margin-top: 30px; }
    h4 { font-size: 11pt; color: #2d3748; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9pt; }
    th { background: #2b6cb0; color: white; padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .right { text-align: right; }
    .red { color: #e53e3e; }
    .blue { color: #3182ce; }
    .cover { text-align: center; padding-top: 200px; page-break-after: always; }
    .cover h1 { font-size: 32pt; border: none; }
    .cover .subtitle { font-size: 16pt; color: #4a5568; margin-top: 20px; }
    .cover .meta { margin-top: 80px; font-size: 12pt; color: #718096; line-height: 2; }
    .score-box { background: #f7fafc; border: 2px solid #2b6cb0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .score-value { font-size: 48pt; font-weight: bold; color: #2b6cb0; }
    .score-grade { font-size: 18pt; color: #4a5568; margin-top: 5px; }
    .chapter { margin-top: 30px; page-break-inside: avoid; }
    .chapter.risk { border-left: 4px solid #e53e3e; padding-left: 16px; }
    .summary { color: #4a5568; font-style: italic; }
    .review-opinion { border-left: 4px solid #2b6cb0; background: #ebf8ff; padding: 12px 16px; margin: 12px 0; border-radius: 0 6px 6px 0; }
    .review-opinion.risk { border-left-color: #e53e3e; background: #fff5f5; }
    .review-opinion h4 { margin: 0 0 8px 0; font-size: 10pt; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 600; margin-right: 6px; }
    .detail-item { margin: 6px 0; font-size: 9pt; }
    .details { margin: 12px 0; }
    .disclaimer { margin-top: 40px; padding: 16px; background: #f7fafc; border-radius: 6px; font-size: 8pt; color: #718096; }
    .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>사업성 분석 보고서</h1>
    <div class="subtitle">${ctx.projectName}</div>
    <div class="meta">
      <p>위치: ${ctx.location.address || "미확인"}</p>
      <p>용도: ${ctx.purpose} | 연면적: ${ctx.scale.totalFloorArea.toLocaleString()}㎡ | ${ctx.scale.totalUnits.toLocaleString()}세대</p>
      <p>분석일: ${new Date(metadata.generatedAt).toLocaleDateString("ko-KR")}</p>
      <p>VESTRA AI 사업성 분석 시스템</p>
    </div>
  </div>

  <h1>종합 평가</h1>
  <div class="score-box">
    <div class="score-value">${vScore.score}점</div>
    <div class="score-grade">등급: ${vScore.grade} (${vScore.gradeLabel})</div>
  </div>
  ${vScore.investmentOpinion ? `<p>${vScore.investmentOpinion}</p>` : ""}

  <h1>주장-검증 결과</h1>
  <table>
    <thead>
      <tr><th>항목</th><th>업체 주장</th><th>벤치마크</th><th>괴리율</th><th>출처</th></tr>
    </thead>
    <tbody>${verificationHtml}</tbody>
  </table>

  ${rationalityHtml ? `
  <h1>합리성 등급 평가</h1>
  <table>
    <thead>
      <tr><th>항목</th><th>등급</th><th>괴리율</th><th>판정 근거</th><th>검증 출처</th></tr>
    </thead>
    <tbody>${rationalityHtml}</tbody>
  </table>
  ` : ""}

  ${breakdownHtml ? `
  <h1>V-Score 세부 평가</h1>
  <table>
    <thead>
      <tr><th>평가 항목</th><th>가중치</th><th>점수</th><th>등급</th></tr>
    </thead>
    <tbody>${breakdownHtml}</tbody>
  </table>
  ` : ""}

  ${chaptersHtml}

  <div class="disclaimer">
    <strong>면책조항:</strong> ${metadata.disclaimer}
    <br>분석 출처 파일: ${(metadata.sourceFiles || []).join(", ")}
  </div>

  <div class="footer">
    VESTRA v${metadata.version} | Generated at ${new Date(metadata.generatedAt).toLocaleString("ko-KR")}
  </div>
</body>
</html>`;
}
