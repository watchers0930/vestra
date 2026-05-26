const { AlignmentType } = require("docx");

const COLORS = {
  NAVY: "1B2A4A",
  BLUE: "3B82F6",
  DARK: "1E293B",
  GRAY: "64748B",
  GRAY_LT: "F1F5F9",
  WHITE: "FFFFFF",
};

const FONT = "페이퍼로지";

const documentStyles = {
  default: {
    document: {
      run: { font: FONT, size: 22, color: COLORS.DARK },
      paragraph: { spacing: { after: 120, line: 360 } },
    },
  },
  paragraphStyles: [
    {
      id: "Title",
      name: "Title",
      basedOn: "Normal",
      next: "Normal",
      run: { font: FONT, size: 52, color: COLORS.NAVY, bold: true },
      paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER },
    },
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      run: { font: FONT, size: 36, color: COLORS.NAVY, bold: true },
      paragraph: { spacing: { before: 480, after: 240 } },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      run: { font: FONT, size: 28, color: COLORS.BLUE, bold: true },
      paragraph: { spacing: { before: 360, after: 160 } },
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Normal",
      next: "Normal",
      run: { font: FONT, size: 24, color: COLORS.DARK, bold: true },
      paragraph: { spacing: { before: 240, after: 120 } },
    },
  ],
};

module.exports = { COLORS, FONT, documentStyles };
