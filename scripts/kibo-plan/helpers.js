const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, VerticalAlign, AlignmentType, BorderStyle,
  HeadingLevel, PageBreak,
} = require("docx");
const { COLORS, FONT } = require("./styles");

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
const TABLE_BORDERS = {
  top: THIN_BORDER, bottom: THIN_BORDER,
  left: THIN_BORDER, right: THIN_BORDER,
  insideHorizontal: THIN_BORDER, insideVertical: THIN_BORDER,
};

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: FONT, size: 36, color: COLORS.NAVY, bold: true })],
    spacing: { before: 480, after: 240 },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: FONT, size: 28, color: COLORS.BLUE, bold: true })],
    spacing: { before: 360, after: 160 },
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: FONT, size: 24, color: COLORS.DARK, bold: true })],
    spacing: { before: 240, after: 120 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text,
      font: FONT,
      size: opts.size || 22,
      color: opts.color || COLORS.DARK,
      bold: opts.bold || false,
    })],
    spacing: { after: opts.after || 120, before: opts.before || 0 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function richPara(runs, opts = {}) {
  return new Paragraph({
    children: runs.map(r => new TextRun({
      text: r.text,
      font: FONT,
      size: r.size || 22,
      color: r.color || COLORS.DARK,
      bold: r.bold || false,
    })),
    spacing: { after: opts.after || 120, before: opts.before || 0 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, font: FONT, size: 22, color: COLORS.DARK })],
    spacing: { after: 60 },
    indent: { left: 400 },
  });
}

function createTable(headers, rows, opts = {}) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { fill: COLORS.NAVY },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: COLORS.WHITE, font: FONT, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
      })],
      verticalAlign: VerticalAlign.CENTER,
    })),
  });

  const dataRows = rows.map((row, i) =>
    new TableRow({
      children: row.map((cell, ci) => new TableCell({
        shading: { fill: i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_LT },
        children: [new Paragraph({
          children: [new TextRun({
            text: String(cell),
            font: FONT,
            size: 20,
            color: COLORS.DARK,
            bold: ci === 0 && opts.boldFirstCol ? true : false,
          })],
          spacing: { before: 30, after: 30 },
        })],
        verticalAlign: VerticalAlign.CENTER,
      })),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer(lines = 1) {
  return new Paragraph({ text: "", spacing: { after: lines * 200 } });
}

function quote(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 21, color: COLORS.GRAY, italics: true })],
    spacing: { before: 80, after: 120 },
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BLUE } },
  });
}

module.exports = {
  heading1, heading2, heading3, para, richPara, bullet,
  createTable, pageBreak, spacer, quote,
};
