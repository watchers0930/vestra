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
  critical: "심각",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  mortgage_added: "근저당 설정",
  mortgage_removed: "근저당 해제",
  seizure_added: "압류 설정",
  seizure_removed: "압류 해제",
  ownership_changed: "소유권 변동",
  lien_added: "유치권 설정",
  lien_removed: "유치권 해제",
  provisional_registration: "가등기",
  right_change: "권리 변동",
};

const MODE_LABEL: Record<string, string> = {
  standard: "일반 모니터링",
  contract_gap: "계약갭 집중 감시",
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

  // Paperlogy 폰트 로드
  let defaultFont = "helvetica";
  const fontWeights = [
    { file: "Paperlogy-4Regular.ttf", style: "normal" },
    { file: "Paperlogy-7Bold.ttf", style: "bold" },
  ];
  try {
    for (const fw of fontWeights) {
      const fontRes = await fetch(`/fonts/${fw.file}`);
      if (fontRes.ok) {
        const fontBuffer = await fontRes.arrayBuffer();
        const fontBase64 = arrayBufferToBase64(fontBuffer);
        pdf.addFileToVFS(fw.file, fontBase64);
        pdf.addFont(fw.file, "Paperlogy", fw.style);
      }
    }
    pdf.setFont("Paperlogy", "normal");
    defaultFont = "Paperlogy";
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
    y += 5;
    pdf.setDrawColor(220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 10;
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
  if (defaultFont === "Paperlogy") pdf.setFont("Paperlogy", "bold");
  pdf.text("VESTRA", MARGIN, y);
  y += 5;

  pdf.setFontSize(14);
  pdf.setTextColor(30);
  pdf.text("등기 모니터링 증명서", MARGIN, y);
  if (defaultFont === "Paperlogy") pdf.setFont("Paperlogy", "normal");
  y += 8;

  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text(
    `증명서 ID: ${certId} | 발급일: ${now.toLocaleDateString("ko-KR")} ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`,
    MARGIN,
    y
  );
  y += 8;
  drawLine();

  // ══════════════════════════════════════════
  // 2. 물건 정보
  // ══════════════════════════════════════════
  sectionTitle("1. 물건 정보");

  infoRow("주소:", property.address);
  infoRow("감시 모드:", MODE_LABEL[property.monitorMode] || property.monitorMode);
  infoRow("상태:", property.status === "active" ? "감시 중" : "일시정지");

  const startDate = new Date(property.createdAt);
  infoRow("감시 시작일:", startDate.toLocaleDateString("ko-KR"));
  infoRow("최종 확인:", property.lastCheckedAt ? new Date(property.lastCheckedAt).toLocaleDateString("ko-KR") : "없음");

  if (property.deposit) {
    infoRow("보증금:", `${property.deposit.toLocaleString()}만원`);
  }
  if (property.contractDate) {
    infoRow("계약일:", new Date(property.contractDate).toLocaleDateString("ko-KR"));
  }
  if (property.moveInDate) {
    infoRow("입주일:", new Date(property.moveInDate).toLocaleDateString("ko-KR"));
  }

  drawLine();

  // ══════════════════════════════════════════
  // 3. 변동 이력 테이블
  // ══════════════════════════════════════════
  sectionTitle(`2. 변동 이력 (${property.alerts.length}건)`);

  if (property.alerts.length > 0) {
    // 테이블 헤더
    pdf.setFontSize(8);
    pdf.setTextColor(80);
    pdf.text("일자", MARGIN + 2, y);
    pdf.text("유형", MARGIN + 35, y);
    pdf.text("위험도", MARGIN + 75, y);
    pdf.text("내용", MARGIN + 92, y);
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
      pdf.text(`... 외 ${property.alerts.length - 30}건`, MARGIN + 2, y);
      y += 5;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text("감시 기간 중 변동사항이 감지되지 않았습니다.", MARGIN + 2, y);
    y += 5;
  }

  drawLine();

  // ══════════════════════════════════════════
  // 4. 무결성 검증 결과
  // ══════════════════════════════════════════
  sectionTitle("3. 무결성 검증 결과");

  if (integrityResult) {
    const pass = (ok: boolean) => (ok ? "통과" : "실패");

    pdf.setFontSize(10);
    if (integrityResult.isValid) {
      pdf.setTextColor(48, 209, 88);
      pdf.text("검증 완료 — 모든 무결성 검사를 통과했습니다", MARGIN + 2, y);
    } else {
      pdf.setTextColor(255, 59, 48);
      pdf.text("검증 실패 — 위변조 의심 항목이 감지되었습니다", MARGIN + 2, y);
    }
    y += 7;

    pdf.setFontSize(8.5);
    pdf.setTextColor(60);
    infoRow("전체 스냅샷:", `${integrityResult.totalSnapshots}건`);
    infoRow("해시 체인 (SHA-256):", pass(integrityResult.hashChainValid));
    infoRow("전자 서명 (Ed25519):", pass(integrityResult.signaturesValid));
    infoRow("머클 루트 검증:", pass(integrityResult.merkleRootsValid));

    if (integrityResult.brokenAt !== null) {
      infoRow("이상 감지 위치:", `#${integrityResult.brokenAt}번째 기록`);
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text("내보내기 전 무결성 검증이 수행되지 않았습니다.", MARGIN + 2, y);
    y += 5;
  }

  drawLine();

  // ══════════════════════════════════════════
  // 5. 해시 체인 요약
  // ══════════════════════════════════════════
  sectionTitle(`4. 스냅샷 체인 요약 (${snapshots.length}블록)`);

  if (snapshots.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(80);
    pdf.text("순번", MARGIN + 2, y);
    pdf.text("시각", MARGIN + 14, y);
    pdf.text("스냅샷 해시", MARGIN + 50, y);
    pdf.text("서명 (축약)", MARGIN + 120, y);
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
      pdf.text(`... 외 ${snapshots.length - 40}건 생략`, MARGIN + 2, y);
      y += 5;
    }
  }

  drawLine();

  // ══════════════════════════════════════════
  // 6. 공개키 (독립 검증용)
  // ══════════════════════════════════════════
  if (integrityResult?.publicKey) {
    sectionTitle("5. Ed25519 공개키 (독립 검증용)");

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
      "면책: 본 증명서는 VESTRA AI 모니터링 시스템이 자동 생성한 것으로 법적 효력이 없습니다.",
      105,
      286,
      { align: "center" }
    );
    pdf.text(
      "무결성 검증은 VESTRA 시스템 내 저장 데이터에 한하여 적용됩니다. 법률 사안은 전문가에게 문의하시기 바랍니다.",
      105,
      289,
      { align: "center" }
    );

    // 브랜딩 + 페이지
    pdf.setFontSize(6);
    pdf.setTextColor(0, 113, 227);
    pdf.text(
      `VESTRA 등기 모니터링 | 증명서 ${certId} | ${i}/${totalPages} 페이지`,
      105,
      293,
      { align: "center" }
    );
  }

  // 저장
  const filename = `VESTRA-증명서-${property.address.replace(/[^a-zA-Z0-9가-힣]/g, "-").slice(0, 30)}-${certId}.pdf`;
  pdf.save(filename);
}
