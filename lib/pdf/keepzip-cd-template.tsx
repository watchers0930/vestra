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
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Paperlogy", fontSize: 11, color: "#1a1d2e" },
  title: { fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 28 },
  para: { fontSize: 11, lineHeight: 1.8, marginBottom: 8, textAlign: "justify" },
  date: { fontSize: 11, textAlign: "center", marginTop: 28, marginBottom: 28 },
  signWrap: { marginTop: 8, alignItems: "flex-end" },
  signRow: { flexDirection: "row", alignItems: "center" },
  signLabel: { fontSize: 12 },
  signImg: { width: 96, height: 48, objectFit: "contain", marginLeft: 8 },
});

/** 내용증명 PDF — 본문 + 발신인 손글씨 서명 합성 (설계서 §8.1) */
export function KeepzipCdPdf({ data }: { data: KeepzipCdPdfData }) {
  const paras = data.content.split(/\n+/).filter((l) => l.trim().length > 0);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.title}</Text>
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
