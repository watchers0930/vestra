"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PdfExportOptions {
  filename?: string;
  title?: string;
  element: HTMLElement;
}

/**
 * HTML 요소를 캡처하여 PDF로 다운로드
 */
export async function exportToPdf({
  filename = "vestra-report.pdf",
  title = "VESTRA 분석 리포트",
  element,
}: PdfExportOptions): Promise<void> {
  // 요소를 캔버스로 캡처
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 너비 (mm)
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");

  // 헤더
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(title, 10, 8);
  pdf.text(new Date().toLocaleDateString("ko-KR"), 200, 8, { align: "right" });

  // 이미지 삽입 (여러 페이지 지원)
  const pageHeight = 287; // A4 높이 (mm) - 마진
  let heightLeft = imgHeight;
  let position = 12;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 12;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // 푸터
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(180);
    pdf.text(
      `VESTRA AI Asset Management Platform | Page ${i}/${totalPages}`,
      105,
      292,
      { align: "center" }
    );
  }

  pdf.save(filename);
}
