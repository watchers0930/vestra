const {
  Document, Packer, PageNumber, AlignmentType,
  Header, Footer, Paragraph, TextRun,
} = require("docx");
const fs = require("fs");
const path = require("path");

const { documentStyles, FONT, COLORS } = require("./styles");
const { createCoverPage, createTocPage } = require("./cover");
const { createCompanySection } = require("./sections/01-company");
const { createBusinessSection } = require("./sections/02-business");
const { createMarketSection } = require("./sections/03-market");
const { createMarketingSection } = require("./sections/04-marketing");
const { createTechnologySection } = require("./sections/05-technology");
const { createFinanceSection } = require("./sections/06-finance");
const { createRiskSection } = require("./sections/07-risk");
const { createAppendixSection } = require("./sections/08-appendix");

function createHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: "VESTRA — 기술사업계획서", font: FONT, size: 16, color: "94A3B8" }),
        ],
      }),
    ],
  });
}

function createFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: "64748B" }),
          new TextRun({ text: " / ", font: FONT, size: 18, color: "64748B" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: "64748B" }),
        ],
      }),
    ],
  });
}

async function main() {
  const doc = new Document({
    styles: documentStyles,
    features: { updateFields: true },
    sections: [
      // 표지 (헤더/푸터 없음)
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: createCoverPage(),
      },
      // 목차
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: { default: createHeader() },
        footers: { default: createFooter() },
        children: createTocPage(),
      },
      // 본문
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: { default: createHeader() },
        footers: { default: createFooter() },
        children: [
          ...createCompanySection(),
          ...createBusinessSection(),
          ...createMarketSection(),
          ...createMarketingSection(),
          ...createTechnologySection(),
          ...createFinanceSection(),
          ...createRiskSection(),
          ...createAppendixSection(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join("/Users/watchers/Desktop", "VESTRA_기보자금_기술사업계획서_2026.docx");
  fs.writeFileSync(outPath, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`✅ 생성 완료: ${outPath}`);
  console.log(`   파일 크기: ${sizeMB} MB`);
}

main().catch(err => {
  console.error("❌ 생성 실패:", err.message);
  process.exit(1);
});
