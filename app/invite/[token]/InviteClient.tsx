"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, LogIn } from "lucide-react";

interface InviteInfo {
  valid: boolean;
  expired?: boolean;
  accepted?: boolean;
  clientName?: string;
  agentName?: string;
  reason?: string;
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(160deg,#0f2547,#1a3a5c)", padding: 20,
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 420, background: "#fff", borderRadius: 24,
  padding: "40px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center",
};

export default function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const { status } = useSession();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ d }) => { if (alive) { setInfo(d); setLoading(false); } })
      .catch(() => { if (alive) { setInfo({ valid: false, reason: "error" }); setLoading(false); } });
    return () => { alive = false; };
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setErr("");
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "초대 수락에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setAccepting(false);
    }
  }

  const logo = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0f2547,#2563eb)", color: "#fff", fontWeight: 900, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>V</div>
      <span style={{ fontWeight: 800, fontSize: 20, color: "#0f2547", letterSpacing: "0.02em" }}>VESTRA</span>
    </div>
  );

  let body: React.ReactNode;

  if (loading) {
    body = <div style={{ color: "#64748b", fontSize: 14 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /><p style={{ marginTop: 12 }}>초대 정보를 확인하는 중...</p></div>;
  } else if (done || info?.accepted) {
    body = (
      <>
        <CheckCircle2 size={48} color="#22a75e" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1d1d1f", margin: "0 0 8px" }}>
          {done ? "연결이 완료되었습니다" : "이미 연결된 초대입니다"}
        </h1>
        <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
          {info?.agentName ? `${info.agentName}와(과) 연결되었습니다. ` : ""}이제 내 매물·의향서·등기감시 현황을 함께 관리할 수 있어요.
        </p>
        <button onClick={() => router.push("/home")} style={btnPrimary}>홈으로 이동</button>
      </>
    );
  } else if (!info?.valid) {
    const msg = info?.expired ? "만료된 초대 링크입니다." : "유효하지 않은 초대 링크입니다.";
    body = (
      <>
        <XCircle size={48} color="#c0392b" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1d1d1f", margin: "0 0 8px" }}>초대를 확인할 수 없습니다</h1>
        <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
          {msg} 초대한 중개사에게 링크를 다시 요청해주세요.
        </p>
        <button onClick={() => router.push("/home")} style={btnSecondary}>홈으로 이동</button>
      </>
    );
  } else if (status !== "authenticated") {
    body = (
      <>
        <ShieldCheck size={44} color="#2563eb" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1d1d1f", margin: "0 0 8px" }}>
          {info.agentName}님이 초대했습니다
        </h1>
        <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
          로그인하면 <b>{info.agentName}</b>와(과) 연결되어 매물·거래 현황을 함께 관리할 수 있어요.
        </p>
        <button
          onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`)}
          style={btnPrimary}
        >
          <LogIn size={16} style={{ marginRight: 6 }} /> 로그인하고 계속하기
        </button>
      </>
    );
  } else {
    body = (
      <>
        <ShieldCheck size={44} color="#2563eb" style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1d1d1f", margin: "0 0 8px" }}>
          {info.agentName}님의 초대
        </h1>
        <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" }}>
          아래 버튼을 누르면 <b>{info.agentName}</b>와(과) 연결됩니다. 중개사가 내 매물·의향서·등기감시 현황을 함께 볼 수 있게 됩니다.
        </p>
        {err && <p style={{ fontSize: 12.5, color: "#c0392b", margin: "0 0 12px" }}>{err}</p>}
        <button onClick={handleAccept} disabled={accepting} style={{ ...btnPrimary, opacity: accepting ? 0.6 : 1 }}>
          {accepting && <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />}
          {accepting ? "연결 중..." : "초대 수락하기"}
        </button>
      </>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        {logo}
        {body}
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
  background: "linear-gradient(135deg,#0f2547,#2563eb)", color: "#fff",
  fontSize: 14.5, fontWeight: 700, cursor: "pointer",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const btnSecondary: React.CSSProperties = {
  width: "100%", padding: "13px 0", borderRadius: 14, border: "1px solid #d2d2d7",
  background: "#fff", color: "#1d1d1f", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
};
