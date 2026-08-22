"use client";

interface Props {
  lawyerName?: string;
  onClose: () => void;
  onPaid: () => void;
}

/**
 * 모의 결제 모달 — 변호사 서비스료 9,900원 + 발송 실비(추후 확정).
 * 실제 PG 연동 전 흐름 확인용. "결제하기" 시 결제 완료로 처리한다.
 */
export function MockPaymentModal({ lawyerName, onClose, onPaid }: Props) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1d2e", marginBottom: 6 }}>결제하기</div>
        <p style={{ fontSize: 13, color: "#6b7180", marginBottom: 18, lineHeight: 1.5 }}>
          {lawyerName ? <><strong>{lawyerName}</strong> 변호사</> : "담당 변호사"}에게 내용증명 검토·직인·발송을 의뢰합니다.
        </p>

        <div style={{ border: "1px solid #e8eaf0", borderRadius: 10, padding: 14, fontSize: 13.5, color: "#3a3f55" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>변호사 서비스료</span><span style={{ fontWeight: 600 }}>9,900원</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#8b90a5" }}>
            <span>발송 실비(우체국 등기)</span><span>확정 후 청구</span>
          </div>
          <div style={{ borderTop: "1px solid #eef0f5", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1a1d2e" }}>
            <span>지금 결제</span><span style={{ color: "#2e4bd8" }}>9,900원</span>
          </div>
        </div>

        <p style={{ fontSize: 11.5, color: "#aeb2bf", marginTop: 10, lineHeight: 1.5 }}>
          ※ 모의 결제입니다(실제 결제 없음). 결제금은 등기 도달 전까지 보관되며, 발송 전 변호사 반려·취소 시 전액 환불됩니다.
        </p>

        <button
          type="button"
          onClick={onPaid}
          style={{ width: "100%", marginTop: 16, background: "#2e4bd8", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
        >
          9,900원 결제하고 보내기
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ width: "100%", marginTop: 8, background: "none", color: "#8b90a5", border: "none", padding: 6, fontSize: 13, cursor: "pointer" }}
        >
          취소
        </button>
      </div>
    </div>
  );
}
