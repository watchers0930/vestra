import type { ContractImageIntegrity, PresenceState } from "@/lib/contract-image";

/**
 * 계약서 이미지 기반 무결성 점검 카드.
 * 업로드한 계약서 이미지에서만 확인 가능한 신호(서명·날인 유무, 수기 정정,
 * 미기재 공란, 판독 불가 영역)를 표시한다. 앱·renewal 계약서 결과 양쪽에서 공용.
 */

const PRESENCE_META: Record<PresenceState, { label: string; color: string; bg: string; icon: string }> = {
  present: { label: "확인됨", color: "#15803d", bg: "#e9f7ef", icon: "✓" },
  absent: { label: "없음", color: "#b91c1c", bg: "#fdecec", icon: "⚠" },
  unclear: { label: "불확실", color: "#6b7280", bg: "#f2f2f4", icon: "?" },
};

function PresenceBadge({ state }: { state: PresenceState }) {
  const m = PRESENCE_META[state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 9px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
        color: m.color,
        background: m.bg,
        whiteSpace: "nowrap",
      }}
    >
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

function SignRow({
  label,
  signature,
  seal,
}: {
  label: string;
  signature: PresenceState;
  seal: PresenceState;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr 1fr",
        alignItems: "center",
        gap: "8px",
        padding: "8px 0",
        borderTop: "1px solid #f0f0f2",
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#3c3c43" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "11.5px", color: "#8e8e93", minWidth: "30px" }}>서명</span>
        <PresenceBadge state={signature} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "11.5px", color: "#8e8e93", minWidth: "30px" }}>날인</span>
        <PresenceBadge state={seal} />
      </span>
    </div>
  );
}

export default function ContractImageIntegrityCard({
  integrity,
}: {
  integrity: ContractImageIntegrity | null | undefined;
}) {
  if (!integrity || !integrity.available) return null;

  const { signaturePresent, sealPresent, handwrittenEdits, handwrittenEditNote, blankFields, illegibleAreas, illegibleNote, warnings } = integrity;
  // 모델 노트 끝의 마침표를 제거해 뒤 문장과 자연스럽게 이어붙인다
  const trimTail = (v?: string) => (v ? v.replace(/[.\s]+$/, "") : "");
  const editNote = trimTail(handwrittenEditNote);
  const illegNote = trimTail(illegibleNote);

  return (
    <div
      style={{
        border: "1px solid #e5e5ea",
        borderRadius: "14px",
        background: "#fff",
        padding: "18px 18px 16px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "18px" }}>📷</span>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1c1c1e", margin: 0 }}>
          이미지 기반 추가 점검
        </h3>
      </div>
      <p style={{ fontSize: "12px", color: "#8e8e93", margin: "0 0 12px" }}>
        업로드한 계약서 이미지에서 확인한 신호입니다. 원본 계약서로 반드시 재확인하세요.
      </p>

      {/* 종합 주의 문구 */}
      {warnings.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 14px",
            padding: "10px 12px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {warnings.map((w, i) => (
            <li key={i} style={{ fontSize: "12.5px", color: "#9a3412", display: "flex", gap: "6px" }}>
              <span aria-hidden>•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 서명·날인 */}
      <div style={{ marginBottom: "12px" }}>
        <SignRow label="임대인" signature={signaturePresent.landlord} seal={sealPresent.landlord} />
        <SignRow label="임차인" signature={signaturePresent.tenant} seal={sealPresent.tenant} />
      </div>

      {/* 기타 신호 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {handwrittenEdits && (
          <div style={{ fontSize: "12.5px", color: "#9a3412", display: "flex", gap: "6px" }}>
            <span aria-hidden>✏️</span>
            <span>
              손글씨 정정·가필 흔적이 있습니다{editNote ? ` — ${editNote}` : ""}. 정정 부분에 양측 날인이 있는지 확인하세요.
            </span>
          </div>
        )}
        {blankFields.length > 0 && (
          <div style={{ fontSize: "12.5px", color: "#b91c1c", display: "flex", gap: "6px" }}>
            <span aria-hidden>⬜</span>
            <span>미기재(공란) 항목: {blankFields.join(", ")}. 계약 전 반드시 채워야 합니다.</span>
          </div>
        )}
        {illegibleAreas && (
          <div style={{ fontSize: "12.5px", color: "#6b7280", display: "flex", gap: "6px" }}>
            <span aria-hidden>🔍</span>
            <span>
              판독이 어려운 영역이 있습니다{illegNote ? ` — ${illegNote}` : ""}. 더 선명한 이미지로 재확인을 권장합니다.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
