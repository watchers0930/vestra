import path from "path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image as PdfImage,
} from "@react-pdf/renderer";

// ─── 폰트 등록 (Paperlogy TTF — public/fonts/) ────────────────────────────────
const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Paperlogy",
  fonts: [
    { src: path.join(fontDir, "Paperlogy-4Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Paperlogy-7Bold.ttf"), fontWeight: 700 },
  ],
});

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface EContractPdfData {
  id: string;
  contractType: "JEONSE" | "MONTHLY" | "SALE";
  address: string;
  deposit: bigint;
  monthlyRent?: bigint | null;
  duration?: number | null;   // 개월
  startDate?: Date | null;
  endDate?: Date | null;
  specialTerms?: string | null;
  landlord: { name: string | null; email: string; signatureUrl?: string | null };
  tenant: { name?: string | null; email: string; signatureUrl?: string | null };
  broker?: { name?: string | null; email: string; signatureUrl?: string | null } | null;
  createdAt: Date;
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function fmtD(d: Date | null | undefined): string {
  if (!d) return "　　　　년　　월　　일";
  const dt = new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

function fmtAmt(v: bigint | null | undefined): string {
  if (v == null) return "-";
  return `금 ${Number(v).toLocaleString("ko-KR")}원정`;
}

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  JEONSE: "전세",
  MONTHLY: "월세",
  SALE: "매매",
};

// ─── 조항 (국토부 표준 주택임대차계약서 기준) ────────────────────────────────
const ARTICLES: [string, string][] = [
  [
    "제1조 (목적)",
    "임대인은 위 주택을 임차인에게 임대하고, 임차인은 이를 주거 목적으로 사용한다.",
  ],
  [
    "제2조 (존속기간)",
    "임대인은 위 주택을 임대차 목적대로 사용·수익할 수 있는 상태로 계약기간 개시일까지 임차인에게 인도하며, 임대차계약기간은 위에 기재된 기간으로 한다.",
  ],
  [
    "제3조 (용도변경 및 전대 등)",
    "임차인은 임대인의 동의 없이 위 주택의 용도나 구조를 변경하거나 전대·임차권 양도 또는 담보제공을 하지 못하며 임대차 목적 이외의 용도로 사용하지 않는다.",
  ],
  [
    "제4조 (임차주택의 유지·관리 의무)",
    "임차인은 임대차계약 존속 중 계약 목적물을 선량한 관리자의 주의로 사용·관리하여야 한다.",
  ],
  [
    "제5조 (계약의 해제)",
    "임차인이 임대인에게 중도금(중도금이 없을 때는 잔금)을 지불하기 전까지 임대인은 계약금의 배액을 상환하고, 임차인은 계약금을 포기하고 본 계약을 해제할 수 있다.",
  ],
  [
    "제6조 (채무불이행과 손해배상)",
    "당사자 일방이 본 계약상의 내용에 대하여 불이행이 있을 경우 그 상대방은 불이행한 자에 대하여 서면으로 최고하고 계약을 해제할 수 있다. 그리고 계약당사자는 계약해제에 따른 손해배상을 각각 상대방에게 청구할 수 있다.",
  ],
  [
    "제7조 (계약의 해지)",
    "임차인이 2기의 차임액에 달하도록 차임을 연체하거나, 제3조를 위반한 경우 임대인은 즉시 본 계약을 해지할 수 있다.",
  ],
  [
    "제8조 (갱신요구 및 거절)",
    "임차인은 임대차기간이 끝나기 6개월 전부터 2개월 전까지의 기간에 계약갱신을 요구할 수 있다. 다만 임대인이 주택임대차보호법 제6조의3에 해당하는 사유가 있는 경우 갱신을 거절할 수 있다.",
  ],
  [
    "제9조 (확정일자 및 전입신고)",
    "임차인은 임대차 개시일 이후 지체 없이 전입신고를 마치고 임대차계약서에 확정일자를 받아야 한다. 임대인은 이에 협조하여야 한다.",
  ],
  [
    "제10조 (중개보수 등)",
    "중개보수는 거래가격의 일정 비율로 임대인과 임차인이 각각 개업공인중개사에게 지급하며, 개업공인중개사는 본 계약을 위하여 임대인과 임차인에게 중개대상물 확인·설명서를 작성·교부한다.",
  ],
];

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: "Paperlogy", fontSize: 8.5, padding: "14mm 16mm", color: "#111" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 9, textAlign: "center", color: "#555", marginBottom: 14 },
  sectionHeader: {
    fontSize: 9, fontWeight: 700, backgroundColor: "#1a3a6b", color: "#fff",
    paddingVertical: 4, paddingHorizontal: 8, marginTop: 10, marginBottom: 0,
  },
  table: { borderWidth: 1, borderColor: "#bbb", borderStyle: "solid" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#bbb", borderBottomStyle: "solid" },
  rowLast: { flexDirection: "row" },
  cellLabel: {
    width: "22%", backgroundColor: "#f5f7fb", paddingVertical: 5, paddingHorizontal: 6,
    fontWeight: 700, borderRightWidth: 1, borderRightColor: "#bbb", borderRightStyle: "solid", fontSize: 8,
  },
  cellValue: { flex: 1, paddingVertical: 5, paddingHorizontal: 6, fontSize: 8 },
  cellLabelNarrow: {
    width: "15%", backgroundColor: "#f5f7fb", paddingVertical: 5, paddingHorizontal: 6,
    fontWeight: 700, borderRightWidth: 1, borderRightColor: "#bbb", borderRightStyle: "solid", fontSize: 8,
  },
  articleBox: { marginTop: 12 },
  articleRow: { flexDirection: "row", marginBottom: 5 },
  articleTitle: { fontWeight: 700, width: "28%", fontSize: 8 },
  articleBody: { flex: 1, fontSize: 8, lineHeight: 1.5, color: "#333" },
  specialTermsBox: {
    marginTop: 12, borderWidth: 1, borderColor: "#bbb", borderStyle: "solid",
    padding: 10, minHeight: 70,
  },
  specialTermsTitle: { fontWeight: 700, marginBottom: 6, fontSize: 9 },
  specialTermsText: { fontSize: 8, lineHeight: 1.6, color: "#333" },
  signSection: { marginTop: 16, flexDirection: "row", gap: 12 },
  signBox: {
    flex: 1, borderWidth: 1, borderColor: "#bbb", borderStyle: "solid",
    padding: 10, minHeight: 90,
  },
  signRole: { fontWeight: 700, fontSize: 8.5, marginBottom: 8, color: "#1a3a6b" },
  signLine: { flexDirection: "row", marginBottom: 5 },
  signLabel: { fontSize: 7.5, color: "#666", width: "30%" },
  signValue: { fontSize: 7.5, flex: 1 },
  signImgBox: {
    marginTop: 8, borderTopWidth: 1, borderTopColor: "#eee", borderTopStyle: "solid",
    paddingTop: 6, alignItems: "flex-end",
  },
  signImg: { width: 80, height: 36, objectFit: "contain" },
  signEmpty: { fontSize: 7.5, color: "#aaa", marginTop: 4, textAlign: "right" },
  footer: { marginTop: 14, fontSize: 7, color: "#999", textAlign: "center" },
  stamp: {
    position: "absolute", right: 16, bottom: 20,
    fontSize: 7, color: "#bbb", borderWidth: 1, borderColor: "#ddd",
    borderStyle: "solid", padding: 4, textAlign: "center",
  },
  notice: {
    marginTop: 12, padding: 8, backgroundColor: "#fef9f0",
    borderWidth: 1, borderColor: "#f5c518", borderStyle: "solid",
    fontSize: 7.5, color: "#7a5e00", lineHeight: 1.6,
  },
});

// ─── 서명 박스 ────────────────────────────────────────────────────────────────
function SignBox({
  label,
  name,
  email,
  signatureUrl,
}: {
  label: string;
  name?: string | null;
  email: string;
  signatureUrl?: string | null;
}) {
  return (
    <View style={S.signBox}>
      <Text style={S.signRole}>{label}</Text>
      <View style={S.signLine}>
        <Text style={S.signLabel}>성명</Text>
        <Text style={S.signValue}>{name ?? "(미기재)"}</Text>
      </View>
      <View style={S.signLine}>
        <Text style={S.signLabel}>이메일</Text>
        <Text style={S.signValue}>{email}</Text>
      </View>
      <View style={S.signImgBox}>
        {signatureUrl ? (
          <PdfImage src={signatureUrl} style={S.signImg} />
        ) : (
          <Text style={S.signEmpty}>(서명 대기)</Text>
        )}
      </View>
    </View>
  );
}

// ─── 메인 문서 ────────────────────────────────────────────────────────────────
export function ContractPdf({ data }: { data: EContractPdfData }) {
  const typeLabel = CONTRACT_TYPE_LABEL[data.contractType] ?? data.contractType;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* 제목 */}
        <Text style={S.title}>주택 {typeLabel}계약서</Text>
        <Text style={S.subtitle}>
          (본 계약서는 전자서명법 및 주택임대차보호법에 따라 법적 효력이 인정됩니다)
        </Text>

        {/* 부동산 표시 */}
        <Text style={S.sectionHeader}>■ 부동산의 표시</Text>
        <View style={S.table}>
          <View style={S.row}>
            <Text style={S.cellLabel}>소재지</Text>
            <Text style={S.cellValue}>{data.address}</Text>
          </View>
          <View style={S.rowLast}>
            <Text style={S.cellLabel}>계약유형</Text>
            <Text style={S.cellValue}>{typeLabel}계약</Text>
          </View>
        </View>

        {/* 계약 내용 */}
        <Text style={S.sectionHeader}>■ 계약 내용</Text>
        <View style={S.table}>
          <View style={S.row}>
            <Text style={S.cellLabel}>보증금</Text>
            <Text style={S.cellValue}>{fmtAmt(data.deposit)}</Text>
          </View>
          {data.contractType === "MONTHLY" && (
            <View style={S.row}>
              <Text style={S.cellLabel}>월 차임</Text>
              <Text style={S.cellValue}>{fmtAmt(data.monthlyRent)}</Text>
            </View>
          )}
          <View style={S.row}>
            <Text style={S.cellLabel}>계약기간</Text>
            <Text style={S.cellValue}>
              {fmtD(data.startDate)} ~ {fmtD(data.endDate)}
              {data.duration ? ` (${data.duration}개월)` : ""}
            </Text>
          </View>
          <View style={S.rowLast}>
            <Text style={S.cellLabel}>계약일</Text>
            <Text style={S.cellValue}>{fmtD(data.createdAt)}</Text>
          </View>
        </View>

        {/* 계약 조항 */}
        <Text style={S.sectionHeader}>■ 계약 조항</Text>
        <View style={S.articleBox}>
          {ARTICLES.map(([title, body]) => (
            <View key={title} style={S.articleRow}>
              <Text style={S.articleTitle}>{title}</Text>
              <Text style={S.articleBody}>{body}</Text>
            </View>
          ))}
        </View>

        {/* 특약사항 */}
        <View style={S.specialTermsBox}>
          <Text style={S.specialTermsTitle}>■ 특약사항</Text>
          <Text style={S.specialTermsText}>
            {data.specialTerms?.trim() || "(특약사항 없음)"}
          </Text>
        </View>

        {/* 확인 사항 */}
        <View style={S.notice}>
          <Text>
            ※ 임차인은 잔금 지급 전 임대인 소유 여부, 선순위 권리관계 등을 확인하시기 바랍니다.{"\n"}
            ※ 전입신고 및 확정일자를 받으면 주택임대차보호법상 대항력과 우선변제권을 취득합니다.{"\n"}
            ※ 전세보증보험 가입을 통해 보증금을 보호받으실 수 있습니다 (HUG/SGI/HF).
          </Text>
        </View>
      </Page>

      {/* 서명 페이지 */}
      <Page size="A4" style={S.page}>
        <Text style={S.title}>서명 확인</Text>
        <Text style={S.subtitle}>
          아래 서명은 당사자가 본 계약 내용에 동의함을 전자적으로 표시한 것입니다.
        </Text>

        <View style={S.signSection}>
          <SignBox
            label="임대인"
            name={data.landlord.name}
            email={data.landlord.email}
            signatureUrl={data.landlord.signatureUrl}
          />
          <SignBox
            label="임차인"
            name={data.tenant.name}
            email={data.tenant.email}
            signatureUrl={data.tenant.signatureUrl}
          />
          {data.broker && (
            <SignBox
              label="공인중개사"
              name={data.broker.name}
              email={data.broker.email}
              signatureUrl={data.broker.signatureUrl}
            />
          )}
        </View>

        <Text style={[S.footer, { marginTop: 24 }]}>
          계약번호: {data.id} | Vestra 전자계약 시스템 | vestra-plum.vercel.app
        </Text>
      </Page>
    </Document>
  );
}
