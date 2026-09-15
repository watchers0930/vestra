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

export interface KeepzipCdPdfData {
  title: string;
  content: string;
  senderName: string;
  /** 수신인 성명 (상단 표시 테이블용) */
  recipientName?: string;
  /** 부동산의 표시 (상단 표시 테이블용) */
  address?: string;
  /** 발신인 손글씨 서명 PNG data URL */
  signature?: string;
  /** 작성일자 (예: "2026년 8월 22일") */
  date: string;
  /** 대리인 변호사명 (직인 표기용) */
  lawyerName?: string;
  /** 변호사 전자직인 PNG data URL */
  stamp?: string;
}

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Paperlogy", fontSize: 12, color: "#1a1d2e" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 24 },
  // 발신인·수신인·부동산 표시 테이블 (한국 내용증명 표준 형식)
  infoTable: { borderWidth: 1, borderColor: "#333", borderBottomWidth: 0, marginBottom: 26 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#333" },
  infoLabel: { width: 92, paddingVertical: 7, paddingHorizontal: 8, fontSize: 12, fontWeight: 700, borderRightWidth: 1, borderColor: "#333", backgroundColor: "#f2f4f8" },
  infoValue: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, fontSize: 12 },
  para: { fontSize: 12, lineHeight: 1.8, marginBottom: 8, textAlign: "justify" },
  date: { fontSize: 12, textAlign: "center", marginTop: 28, marginBottom: 28 },
  signWrap: { marginTop: 8, alignItems: "flex-end" },
  signRow: { flexDirection: "row", alignItems: "center" },
  signLabel: { fontSize: 12 },
  signImg: { width: 96, height: 48, objectFit: "contain", marginLeft: 8 },
});

/** 본문에서 상단 표로 이동한 헤더 줄(발신인/수신인/부동산 표시 등)을 제거 — 테이블과 중복 방지 */
const HEADER_LINE = /^(발신인|수신인|발신인\s*주소|수신인\s*주소|부동산의?\s*표시|부동산\s*표시|물건의?\s*표시|제목)\s*[:：]/;

/** 내용증명 PDF — 상단 당사자 테이블 + 번호 본문 + 발신인 손글씨 서명 합성 (설계서 §8.1) */
export function KeepzipCdPdf({ data }: { data: KeepzipCdPdfData }) {
  const paras = data.content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !HEADER_LINE.test(l));
  const rows: { label: string; value: string }[] = [
    { label: "발신인", value: data.senderName },
    ...(data.recipientName ? [{ label: "수신인", value: data.recipientName }] : []),
    ...(data.address ? [{ label: "부동산의 표시", value: data.address }] : []),
  ];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.title}</Text>
        <View style={styles.infoTable}>
          {rows.map((r) => (
            <View key={r.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{r.label}</Text>
              <Text style={styles.infoValue}>{r.value}</Text>
            </View>
          ))}
        </View>
        {paras.map((line, i) => (
          <Text key={i} style={styles.para}>{line}</Text>
        ))}
        <Text style={styles.date}>{data.date}</Text>
        <View style={styles.signWrap}>
          <View style={styles.signRow}>
            <Text style={styles.signLabel}>발신인 : {data.senderName} (서명)</Text>
            {data.signature ? <PdfImage src={data.signature} style={styles.signImg} /> : null}
          </View>
          {data.lawyerName && data.stamp ? (
            <View style={[styles.signRow, { marginTop: 10 }]}>
              <Text style={styles.signLabel}>대리인 변호사 : {data.lawyerName} (직인)</Text>
              <PdfImage src={data.stamp} style={styles.signImg} />
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
