"use client";

import { FileSignature, ShieldCheck, PenLine, Printer } from "lucide-react";
import type { Step } from "../hooks/useContractForm";

const GUIDE: { step: Step; title: string; desc: string }[] = [
  { step: "type", title: "계약 유형 선택", desc: "전세·월세·매매 중 체결할 계약 형태를 고릅니다." },
  { step: "info", title: "계약 정보 입력", desc: "목적물 주소·보증금·계약기간·특약 등 핵심 조건을 담습니다." },
  { step: "parties", title: "당사자·서명", desc: "임대인·임차인 정보를 입력하고 서명합니다. 임차인 직접 서명 링크도 발송할 수 있습니다." },
  { step: "confirm", title: "확인·출력", desc: "내용을 최종 확인하고 가계약서를 생성·출력합니다." },
];

const POINTS = [
  { icon: ShieldCheck, text: "표준 특약 조항으로 권리관계·사용 조건을 안전하게 명시" },
  { icon: PenLine, text: "임차인에게 서명 링크를 보내 비대면으로 서명받기 가능" },
  { icon: Printer, text: "생성한 가계약서를 출력해 오프라인 본계약으로 확정" },
];

export function ContractGuidePanel({ step }: { step: Step }) {
  const activeIdx = GUIDE.findIndex((g) => g.step === step);

  return (
    <aside style={{ position: "sticky", top: 96 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "#eef1fd", display: "grid", placeItems: "center", color: "#2e4bd8" }}>
          <FileSignature size={20} strokeWidth={1.8} />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1d2e", letterSpacing: "-0.01em" }}>가계약서 작성</h2>
          <p style={{ fontSize: 12.5, color: "#6e6e73" }}>주요 조건을 담아 출력, 오프라인 본계약으로 확정</p>
        </div>
      </div>

      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#3a3f55", marginBottom: 22 }}>
        중개하시는 거래의 핵심 조건을 단계별로 입력하면 가계약서가 만들어집니다.
        우측에서 각 단계를 진행하세요.
      </p>

      {/* 진행 단계 설명 (현재 단계 강조) */}
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {GUIDE.map((g, i) => {
          const active = i === activeIdx;
          const done = activeIdx >= 0 && i < activeIdx;
          return (
            <li key={g.step} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 700,
                background: active ? "#2e4bd8" : done ? "#e8f7ee" : "#eef1fd",
                color: active ? "#fff" : done ? "#1a9d4b" : "#8b93b8",
              }}>{done ? "✓" : i + 1}</span>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: active ? 700 : 600, color: active ? "#1a1d2e" : "#3a3f55" }}>{g.title}</p>
                {active && <p style={{ fontSize: 12.5, color: "#6e6e73", marginTop: 3, lineHeight: 1.5 }}>{g.desc}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 핵심 포인트 */}
      <div style={{ borderTop: "1px solid #e8eaf2", paddingTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {POINTS.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <p.icon size={16} strokeWidth={1.8} style={{ color: "#2e4bd8", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12.5, color: "#3a3f55", lineHeight: 1.5 }}>{p.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
