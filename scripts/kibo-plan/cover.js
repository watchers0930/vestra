const {
  Paragraph, TextRun, AlignmentType, TableOfContents,
  Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign,
} = require("docx");
const { COLORS, FONT } = require("./styles");
const data = require("./data");
const { pageBreak, spacer } = require("./helpers");

const NO_BORDER = { style: BorderStyle.NONE, size: 0 };
const NO_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER,
  right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

function infoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: label, font: FONT, size: 24, color: COLORS.GRAY, bold: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 40, after: 40 },
        })],
        verticalAlign: VerticalAlign.CENTER,
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: value, font: FONT, size: 24, color: COLORS.DARK })],
          spacing: { before: 40, after: 40 },
          indent: { left: 200 },
        })],
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

function createCoverPage() {
  return [
    spacer(4),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "기술사업계획서", font: FONT, size: 52, color: COLORS.NAVY, bold: true })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "기술보증기금 보증 신청용", font: FONT, size: 24, color: COLORS.GRAY })],
      spacing: { after: 400 },
    }),
    // 구분선
    new Table({
      rows: [new TableRow({
        children: [new TableCell({
          shading: { fill: COLORS.BLUE },
          children: [new Paragraph({ text: "", spacing: { before: 0, after: 0 } })],
        })],
      })],
      width: { size: 60, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
    }),
    spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: data.product.fullName,
        font: FONT, size: 32, color: COLORS.BLUE, bold: true,
      })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: `( ${data.product.name} )`,
        font: FONT, size: 28, color: COLORS.NAVY, bold: true,
      })],
      spacing: { after: 400 },
    }),
    // 정보 테이블
    new Table({
      rows: [
        infoRow("기 업 명", data.company.name),
        infoRow("대 표 자", data.company.ceo),
        infoRow("소 재 지", data.company.address),
        infoRow("업    종", data.company.industry),
        infoRow("작 성 일", data.documentDate),
      ],
      width: { size: 70, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
    }),
    spacer(3),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.documentDate, font: FONT, size: 28, color: COLORS.DARK, bold: true })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.company.name, font: FONT, size: 32, color: COLORS.NAVY, bold: true })],
    }),
  ];
}

function createTocPage() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "목   차", font: FONT, size: 36, color: COLORS.NAVY, bold: true })],
      spacing: { after: 400 },
    }),
    new TableOfContents("목차", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
  ];
}

module.exports = { createCoverPage, createTocPage };
