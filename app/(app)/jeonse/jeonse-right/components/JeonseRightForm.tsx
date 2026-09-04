"use client";

import { useState, useEffect } from "react";
import { Printer, Info } from "lucide-react";
import { findCourtFromAddress } from "@/lib/court-jurisdiction";

interface FormState {
  propertyAddress: string;
  deposit: string;
  startDate: string;
  endDate: string;
  scope: string;
  landlordName: string;
  landlordId: string;
  landlordZip: string;
  landlordAddr: string;
  landlordAddrDetail: string;
  landlordTel: string;
  tenantName: string;
  tenantId: string;
  tenantZip: string;
  tenantAddr: string;
  tenantAddrDetail: string;
  tenantTel: string;
  court: string;
  propUid: string;
  serial: string;
  secret: string;
}

const STORAGE_KEY = "vestra_jeonse_form_data";

const DEFAULT: FormState = {
  propertyAddress: "", deposit: "", startDate: "", endDate: "",
  scope: "건물 전부",
  landlordName: "", landlordId: "", landlordZip: "", landlordAddr: "", landlordAddrDetail: "", landlordTel: "",
  tenantName: "", tenantId: "", tenantZip: "", tenantAddr: "", tenantAddrDetail: "", tenantTel: "",
  court: "",
  propUid: "", serial: "", secret: "",
};

function numFmt(n: number) {
  return n.toLocaleString("ko-KR");
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "16px",
  padding: "18px 20px",
};

const title: React.CSSProperties = {
  fontSize: "14px", fontWeight: 700, color: "#1d1d1f",
  marginBottom: "14px", paddingBottom: "10px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
};

const lbl: React.CSSProperties = {
  fontSize: "12px", fontWeight: 600, color: "#6e6e73",
  marginBottom: "4px", display: "block",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: "8px",
  border: "1px solid rgba(0,0,0,0.15)", fontSize: "13px",
  outline: "none", background: "#fff", color: "#1d1d1f",
};

const grid2: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px",
};

function loadStorage(): { form: FormState; fromAnalysis: boolean } {
  if (typeof window === "undefined") return { form: DEFAULT, fromAnalysis: false };
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      sessionStorage.removeItem(STORAGE_KEY);
      const parsed: FormState = { ...DEFAULT, ...JSON.parse(stored) };
      if (parsed.propertyAddress && !parsed.court) {
        const detected = findCourtFromAddress(parsed.propertyAddress);
        if (detected) parsed.court = detected;
      }
      return { form: parsed, fromAnalysis: true };
    }
  } catch {}
  return { form: DEFAULT, fromAnalysis: false };
}

export function JeonseRightForm() {
  const [initState] = useState<{ form: FormState; fromAnalysis: boolean }>(loadStorage);
  const [form, setForm] = useState<FormState>(initState.form);
  const [fromAnalysis] = useState<boolean>(initState.fromAnalysis);

  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    document.head.appendChild(script);
  }, []);

  const set = (key: keyof FormState, val: string) =>
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (key === "propertyAddress" && val) {
        const detected = findCourtFromAddress(val);
        if (detected) next.court = detected;
      }
      return next;
    });

  function openPostcode(onSelect: (zip: string, addr: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).daum.Postcode({
      oncomplete: (data: { roadAddress: string; jibunAddress: string; zonecode: string }) => {
        onSelect(data.zonecode, data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

  const depositNum = parseInt(form.deposit.replace(/[^0-9]/g, ""), 10) || 0;
  const regTax = Math.floor(depositNum * 0.002);
  const eduTax = Math.floor(regTax * 0.2);
  const taxTotal = regTax + eduTax;

  function handlePrint() {
    const [sy, sm, sd] = (form.startDate || "").split("-");
    const fillData = {
      realEstate: form.propertyAddress,
      causeYear: sy, causeMonth: sm, causeDay: sd,
      amount: numFmt(depositNum),
      scope: form.scope,
      startDate: form.startDate,
      endDate: form.endDate,
      obligorName: form.landlordName,
      obligorId: form.landlordId,
      obligorAddr: form.landlordAddr,
      holderName: form.tenantName,
      holderId: form.tenantId,
      holderAddr: form.tenantAddr,
      regTax: numFmt(regTax),
      eduTax: numFmt(eduTax),
      ruralTax: "비과세",
      taxTotal: numFmt(taxTotal),
      feeCash: "",
      sigYear: sy, sigMonth: sm, sigDay: sd,
      applicant1: form.tenantName,
      tel1: form.tenantTel,
      applicant2: form.landlordName,
      tel2: "",
      court: form.court,
      propUid: form.propUid,
      regName: form.landlordName,
      serial: form.serial,
      secret: form.secret,
      attContract: "1", attId: "1", attSeal: "1",
      attRegTax: "1", attFee: "1",
    };
    localStorage.setItem("vestra_jeonse_filldata", JSON.stringify(fillData));
    window.open("/forms/전세권설정등기신청서.html", "_blank");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
      <div style={{ ...card, background: "#f5f5f7", display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <Info size={15} style={{ color: "var(--brand-primary)", marginTop: "1px", flexShrink: 0 }} />
        <p style={{ fontSize: "13px", color: "#444", lineHeight: 1.6 }}>
          {fromAnalysis
            ? "전세 분석 데이터를 불러왔습니다. 나머지 항목(주민등록번호, 주소 등)을 입력 후 출력하세요."
            : "전세권설정등기 신청서를 직접 작성합니다. 전세 분석을 먼저 완료하면 주요 항목이 자동으로 채워집니다."}
        </p>
      </div>

      {/* 부동산 정보 */}
      <div style={card}>
        <div style={title}>부동산 정보</div>
        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>부동산 표시 (주소)</label>
          <input style={inp} value={form.propertyAddress} onChange={e => set("propertyAddress", e.target.value)} placeholder="서울시 강남구 역삼동 ..." />
        </div>
        <div style={{ ...grid2, marginBottom: "12px" }}>
          <div>
            <label style={lbl}>전세금 (원)</label>
            <input style={inp} value={form.deposit} onChange={e => set("deposit", e.target.value)} placeholder="300000000" />
          </div>
          <div>
            <label style={lbl}>전세권 범위</label>
            <input style={inp} value={form.scope} onChange={e => set("scope", e.target.value)} placeholder="건물 전부" />
          </div>
        </div>
        <div style={grid2}>
          <div>
            <label style={lbl}>존속기간 시작</label>
            <input type="date" style={inp} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>존속기간 종료</label>
            <input type="date" style={inp} value={form.endDate} onChange={e => set("endDate", e.target.value)} />
          </div>
        </div>
      </div>

      {/* 등기의무자 (임대인) */}
      <div style={card}>
        <div style={title}>등기의무자 — 임대인 (집주인)</div>
        <div style={{ ...grid2, marginBottom: "12px" }}>
          <div>
            <label style={lbl}>성명</label>
            <input style={inp} value={form.landlordName} onChange={e => set("landlordName", e.target.value)} placeholder="홍길동" />
          </div>
          <div>
            <label style={lbl}>주민등록번호</label>
            <input style={inp} value={form.landlordId} onChange={e => set("landlordId", e.target.value)} placeholder="000000-0000000" />
          </div>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>주소</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
            <input style={{ ...inp, width: "100px", flexShrink: 0, background: "#f5f5f7", color: "#6e6e73" }} value={form.landlordZip} placeholder="우편번호" readOnly />
            <button type="button" onClick={() => openPostcode((zip, addr) => { set("landlordZip", zip); set("landlordAddr", addr); set("landlordAddrDetail", ""); })}
              style={{ padding: "8px 14px", borderRadius: "8px", background: "var(--brand-primary)", color: "#fff", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              주소 검색
            </button>
          </div>
          <input style={{ ...inp, background: "#f5f5f7", color: "#1d1d1f", marginBottom: "6px" }} value={form.landlordAddr} placeholder="기본주소 (검색 후 자동 입력)" readOnly />
          <input style={inp} value={form.landlordAddrDetail} onChange={e => set("landlordAddrDetail", e.target.value)} placeholder="상세주소 (동·호수 등)" />
        </div>
        <div>
          <label style={lbl}>전화번호</label>
          <input style={inp} value={form.landlordTel} onChange={e => set("landlordTel", e.target.value)} placeholder="010-0000-0000" />
        </div>
      </div>

      {/* 등기권리자 (임차인) */}
      <div style={card}>
        <div style={title}>등기권리자 — 임차인 (세입자)</div>
        <div style={{ ...grid2, marginBottom: "12px" }}>
          <div>
            <label style={lbl}>성명</label>
            <input style={inp} value={form.tenantName} onChange={e => set("tenantName", e.target.value)} placeholder="홍길동" />
          </div>
          <div>
            <label style={lbl}>주민등록번호</label>
            <input style={inp} value={form.tenantId} onChange={e => set("tenantId", e.target.value)} placeholder="000000-0000000" />
          </div>
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>주소</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
            <input style={{ ...inp, width: "100px", flexShrink: 0, background: "#f5f5f7", color: "#6e6e73" }} value={form.tenantZip} placeholder="우편번호" readOnly />
            <button type="button" onClick={() => openPostcode((zip, addr) => { set("tenantZip", zip); set("tenantAddr", addr); set("tenantAddrDetail", ""); })}
              style={{ padding: "8px 14px", borderRadius: "8px", background: "var(--brand-primary)", color: "#fff", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              주소 검색
            </button>
          </div>
          <input style={{ ...inp, background: "#f5f5f7", color: "#1d1d1f", marginBottom: "6px" }} value={form.tenantAddr} placeholder="기본주소 (검색 후 자동 입력)" readOnly />
          <input style={inp} value={form.tenantAddrDetail} onChange={e => set("tenantAddrDetail", e.target.value)} placeholder="상세주소 (동·호수 등)" />
        </div>
        <div>
          <label style={lbl}>전화번호</label>
          <input style={inp} value={form.tenantTel} onChange={e => set("tenantTel", e.target.value)} placeholder="010-0000-0000" />
        </div>
      </div>

      {/* 세액 자동계산 */}
      {depositNum > 0 && (
        <div style={{ ...card, background: "#f9f9fb" }}>
          <div style={title}>세액 자동계산</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6e6e73" }}>등록면허세 (전세금 × 0.2%)</span>
              <span style={{ fontWeight: 600 }}>금 {numFmt(regTax)}원</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6e6e73" }}>지방교육세 (등록면허세 × 20%)</span>
              <span style={{ fontWeight: 600 }}>금 {numFmt(eduTax)}원</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6e6e73" }}>농어촌특별세</span>
              <span style={{ fontWeight: 600 }}>비과세</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              paddingTop: "8px", borderTop: "1px solid rgba(0,0,0,0.08)",
              fontWeight: 700, fontSize: "14px",
            }}>
              <span>세액 합계</span>
              <span>금 {numFmt(taxTotal)}원</span>
            </div>
          </div>
        </div>
      )}

      {/* 등기의무자 등기필정보 */}
      <div style={card}>
        <div style={title}>등기의무자 등기필정보</div>
        <div style={{ marginBottom: "12px", padding: "10px 12px", background: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.22)", borderRadius: "10px", fontSize: "12.5px", color: "#7a4f00", lineHeight: 1.6 }}>
          아래 일련번호·비밀번호는 <strong>임대인이 소유권 등기 시 발급받은 등기필증</strong>에 기재된 정보입니다. 임대인에게 직접 확인 후 입력하세요.
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={lbl}>부동산 고유번호</label>
          <input style={inp} value={form.propUid} onChange={e => set("propUid", e.target.value)} placeholder="0000-0000-000000" />
        </div>
        <div style={grid2}>
          <div>
            <label style={lbl}>일련번호</label>
            <input style={inp} value={form.serial} onChange={e => set("serial", e.target.value)} placeholder="등기필증 일련번호" />
          </div>
          <div>
            <label style={lbl}>비밀번호</label>
            <input style={inp} value={form.secret} onChange={e => set("secret", e.target.value)} placeholder="등기필증 비밀번호" />
          </div>
        </div>
      </div>

      {/* 관할 법원 */}
      <div style={card}>
        <div style={title}>신청 정보</div>
        <div>
          <label style={lbl}>관할 법원명</label>
          <input style={inp} value={form.court} onChange={e => set("court", e.target.value)} placeholder="서울중앙 / 수원 / 인천 ..." />
        </div>
      </div>

      {/* 출력 버튼 */}
      <button
        onClick={handlePrint}
        style={{
          width: "100%", padding: "14px", borderRadius: "14px",
          border: "none", background: "var(--brand-primary)", color: "#fff",
          fontSize: "15px", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          boxShadow: "0 2px 14px rgba(0,113,227,0.3)",
        }}
      >
        <Printer size={16} strokeWidth={2} />
        신청서 출력
      </button>
    </div>
  );
}
