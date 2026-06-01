"use client";

/**
 * 등기감시 증명서 PDF 생성 모듈
 * ──────────────────────────────
 * jsPDF 직접 렌더링 방식 (lib/pdf-export.ts exportReportDirectPdf 패턴)
 */

interface PropertyInfo {
  id: string;
  address: string;
  status: string;
  monitorMode: string;
  deposit: number | null;
  contractDate: string | null;
  moveInDate: string | null;
  createdAt: string;
  lastCheckedAt: string | null;
  snapshotCount: number;
  alerts: AlertInfo[];
}

interface AlertInfo {
  id: string;
  changeType: string;
  summary: string;
  riskLevel: string;
  isRead: boolean;
  createdAt: string;
}

interface SnapshotInfo {
  sequenceNo: number;
  snapshotHash: string;
  signature: string;
  merkleRoot: string;
  timestamp: string;
  sectionHashes: { section: string; hash: string }[];
}

interface IntegrityInfo {
  isValid: boolean;
  totalSnapshots: number;
  hashChainValid: boolean;
  signaturesValid: boolean;
  merkleRootsValid: boolean;
  brokenAt: number | null;
  publicKey?: string;
}

interface CertificateOptions {
  property: PropertyInfo;
  snapshots: SnapshotInfo[];
  integrityResult?: IntegrityInfo | null;
}

const MARGIN = 15;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

const RISK_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  mortgage_added: "Mortgage Added",
  mortgage_removed: "Mortgage Removed",
  seizure_added: "Seizure Added",
  seizure_removed: "Seizure Removed",
  ownership_changed: "Ownership Changed",
  lien_added: "Lien Added",
  lien_removed: "Lien Removed",
  provisional_registration: "Provisional Reg.",
  right_change: "Right Change",
};

const MODE_LABEL: Record<string, string> = {
  standard: "Standard",
  contract_gap: "Contract-Gap Intensive",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  }
  return btoa(chunks.join(""));
}

export async function exportMonitoringCertificatePdf({
  property,
  snapshots,
  integrityResult,
}: CertificateOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF("p", "mm", "a4");

  // 한글 폰트 로드
  let defaultFont = "helvetica";
  try {
    const fontRes = await fetch("/fonts/NanumGothic-Regular.ttf");
    if (fontRes.ok) {
      const fontBuffer = await fontRes.arrayBuffer();
      const fontBase64 = arrayBufferToBase64(fontBuffer);
      pdf.addFileToVFS("NanumGothic-Regular.ttf", fontBase64);
      pdf.addFont("NanumGothic-Regular.ttf", "NanumGothic", "normal");
      pdf.setFont("NanumGothic");
      defaultFont = "NanumGothic";
    }
  } catch {
    // 폰트 로드 실패 시 기본 Helvetica 사용
  }

  let y = MARGIN;

  const certId = `CERT-${property.id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();

  function checkPage(needed: number) {
    if (y + needed > 278) {
      pdf.addPage();
      y = MARGIN;
    }
  }

  function drawLine() {
    pdf.setDrawColor(220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
  }

  function sectionTitle(title: string) {
    checkPage(18);
    pdf.setFontSize(11);
    pdf.setTextColor(30);
    pdf.text(title, MARGIN, y);
    y += 7;
  }

  function infoRow(label: string, value: string) {
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(label, MARGIN + 2, y);
    pdf.setTextColor(40);
    pdf.text(value, MARGIN + 50, y);
    y += 5;
  }

  // ══════════════════════════════════════════
  // 1. 헤더
  // ══════════════════════════════════════════
  pdf.setFontSize(18);
  pdf.setTextColor(0, 113, 227);
  pdf.text("VESTRA", MARGIN, y);
  y += 5;

  pdf.setFontSize(14);
  pdf.setTextColor(30);
  pdf.text("Registry Monitoring Certificate", MARGIN, y);
  y += 8;

  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text(
    `Certificate ID: ${certId} | Issued: ${now.toISOString().slice(0, 19).replace("T", " ")} KST`,
    MARGIN,
    y
  );
  y += 8;
  drawLine();

  // ══════════════════════════════════════════
  // 2. 물건 정보
  // ══════════════════════════════════════════
  sectionTitle("1. Property Information");

  infoRow("Address:", property.address);
  infoRow("Monitor Mode:", MODE_LABEL[property.monitorMode] || property.monitorMode);
  infoRow("Status:", property.status === "active" ? "Active Monitoring" : "Paused");

  const startDate = new Date(property.createdAt);
  infoRow("Monitoring Since:", startDate.toLocaleDateString("ko-KR"));
  infoRow("Last Checked:", property.lastCheckedAt ? new Date(property.lastCheckedAt).toLocaleDateString("ko-KR") : "N/A");

  if (property.deposit) {
    infoRow("Deposit:", `${property.deposit.toLocaleString()} (x10,000 KRW)`);
  }
  if (property.contractDate) {
    infoRow("Contract Date:", new Date(property.contractDate).toLocaleDateString("ko-KR"));
  }
  if (property.moveInDate) {
    infoRow("Move-in Date:", new Date(property.moveInDate).toLocaleDateString("ko-KR"));
  }

  y += 2;
  drawLine();

  // ══════════════════════════════════════════
  // 3. 변동 이력 테이블
  // ══════════════════════════════════════════
  sectionTitle(`2. Change History (${property.alerts.length} alerts)`);

  if (property.alerts.length > 0) {
    // 테이블 헤더
    pdf.setFontSize(8);
    pdf.setTextColor(80);
    pdf.text("Date", MARGIN + 2, y);
    pdf.text("Type", MARGIN + 35, y);
    pdf.text("Risk", MARGIN + 75, y);
    pdf.text("Summary", MARGIN + 92, y);
    y += 2;
    pdf.setDrawColor(200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;

    pdf.setFontSize(7.5);
    for (const alert of property.alerts.slice(0, 30)) {
      checkPage(6);
      pdf.setTextColor(60);
      pdf.text(
        new Date(alert.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        MARGIN + 2,
        y
      );
      pdf.text(CHANGE_TYPE_LABEL[alert.changeType] || alert.changeType, MARGIN + 35, y);

      // 위험도 색상
      const riskColor: Record<string, [number, number, number]> = {
        critical: [255, 59, 48],
        high: [255, 149, 0],
        medium: [180, 160, 0],
        low: [48, 209, 88],
      };
      const rc = riskColor[alert.riskLevel] || [100, 100, 100];
      pdf.setTextColor(rc[0], rc[1], rc[2]);
      pdf.text(RISK_LABEL[alert.riskLevel] || alert.riskLevel, MARGIN + 75, y);

      pdf.setTextColor(60);
      const summaryLines = pdf.splitTextToSize(alert.summary, CONTENT_W - 92);
      pdf.text(summaryLines[0] || "", MARGIN + 92, y);
      y += 4.5;
    }

    if (property.alerts.length > 30) {
      pdf.setTextColor(120);
      pdf.text(`... and ${property.alerts.length - 30} more alerts`, MARGIN + 2, y);
      y += 5;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text("No changes detected during monitoring period.", MARGIN + 2, y);
    y += 5;
  }

  y += 2;
  drawLine();

  // ══════════════════════════════════════════
  // 4. 무결성 검증 결과
  // ══════════════════════════════════════════
  sectionTitle("3. Integrity Verification");

  if (integrityResult) {
    const pass = (ok: boolean) => (ok ? "PASS" : "FAIL");

    pdf.setFontSize(10);
    if (integrityResult.isValid) {
      pdf.setTextColor(48, 209, 88);
      pdf.text("VERIFIED - All integrity checks passed", MARGIN + 2, y);
    } else {
      pdf.setTextColor(255, 59, 48);
      pdf.text("FAILED - Integrity violation detected", MARGIN + 2, y);
    }
    y += 7;

    pdf.setFontSize(8.5);
    pdf.setTextColor(60);
    infoRow("Total Snapshots:", String(integrityResult.totalSnapshots));
    infoRow("Hash Chain (SHA-256):", pass(integrityResult.hashChainValid));
    infoRow("Digital Signatures (Ed25519):", pass(integrityResult.signaturesValid));
    infoRow("Merkle Root Validation:", pass(integrityResult.merkleRootsValid));

    if (integrityResult.brokenAt !== null) {
      infoRow("Anomaly at Sequence:", `#${integrityResult.brokenAt}`);
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text("Integrity verification was not performed before export.", MARGIN + 2, y);
    y += 5;
  }

  y += 2;
  drawLine();

  // ══════════════════════════════════════════
  // 5. 해시 체인 요약
  // ══════════════════════════════════════════
  sectionTitle(`4. Snapshot Chain Summary (${snapshots.length} blocks)`);

  if (snapshots.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(80);
    pdf.text("Seq", MARGIN + 2, y);
    pdf.text("Timestamp", MARGIN + 14, y);
    pdf.text("Snapshot Hash", MARGIN + 50, y);
    pdf.text("Signature (trunc)", MARGIN + 120, y);
    y += 2;
    pdf.setDrawColor(200);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;

    pdf.setFontSize(6.5);
    for (const snap of snapshots.slice(0, 40)) {
      checkPage(5);
      pdf.setTextColor(60);
      pdf.text(`#${snap.sequenceNo}`, MARGIN + 2, y);
      pdf.text(
        new Date(snap.timestamp).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        MARGIN + 14,
        y
      );
      pdf.setFont("courier", "normal");
      pdf.text(snap.snapshotHash.slice(0, 32) + "...", MARGIN + 50, y);
      pdf.text(snap.signature.slice(0, 24) + "...", MARGIN + 120, y);
      pdf.setFont(defaultFont, "normal");
      y += 4;
    }

    if (snapshots.length > 40) {
      pdf.setTextColor(120);
      pdf.text(`... ${snapshots.length - 40} more snapshots omitted`, MARGIN + 2, y);
      y += 5;
    }
  }

  y += 2;
  drawLine();

  // ══════════════════════════════════════════
  // 6. 공개키 (독립 검증용)
  // ══════════════════════════════════════════
  if (integrityResult?.publicKey) {
    sectionTitle("5. Ed25519 Public Key (for independent verification)");

    pdf.setFont("courier", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(60);
    const keyLines = integrityResult.publicKey.trim().split("\n");
    for (const line of keyLines) {
      checkPage(4);
      pdf.text(line, MARGIN + 2, y);
      y += 3.5;
    }
    pdf.setFont(defaultFont, "normal");

    y += 3;
    drawLine();
  }

  // ══════════════════════════════════════════
  // 7. 푸터 (모든 페이지)
  // ══════════════════════════════════════════
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // 면책 조항
    pdf.setFontSize(5.5);
    pdf.setTextColor(160);
    pdf.text(
      "DISCLAIMER: This certificate is auto-generated by VESTRA AI monitoring system and has no legal effect.",
      105,
      286,
      { align: "center" }
    );
    pdf.text(
      "The integrity verification applies only to data stored within the VESTRA system. Consult a licensed professional for legal matters.",
      105,
      289,
      { align: "center" }
    );

    // 브랜딩 + 페이지
    pdf.setFontSize(6);
    pdf.setTextColor(0, 113, 227);
    pdf.text(
      `VESTRA Registry Monitoring | Certificate ${certId} | Page ${i}/${totalPages}`,
      105,
      293,
      { align: "center" }
    );
  }

  // 저장
  const filename = `vestra-certificate-${property.address.replace(/[^a-zA-Z0-9가-힣]/g, "-").slice(0, 30)}-${certId}.pdf`;
  pdf.save(filename);
}
