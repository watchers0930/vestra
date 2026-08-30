"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, Loader2, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/common/Card";

/**
 * 미가입(B타입) 고객을 VESTRA로 초대하는 링크 생성 UI.
 * 링크 생성 → /invite/[token] 수신 페이지에서 고객이 로그인·수락 → 계정 연결.
 */
export function InviteSection({ clientId, status }: { clientId: string; status: string }) {
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  async function handleInvite() {
    setInviting(true);
    setErr("");
    try {
      const res = await fetch(`/api/agent/clients/${clientId}/invite`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "초대 링크 생성에 실패했습니다.");
        return;
      }
      setInviteUrl(d.inviteUrl);
    } catch {
      setErr("네트워크 오류가 발생했습니다.");
    } finally {
      setInviting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 접근 불가 시 무시 — 사용자가 직접 복사 */
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus size={16} className="text-[#0071e3]" />
          <h2 className="text-sm font-semibold text-[#1d1d1f]">VESTRA 초대</h2>
          {status === "invited" && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-700"
              style={{ background: "rgba(0,113,227,0.07)", color: "#0071e3", border: "1px solid rgba(0,113,227,0.18)" }}>
              초대중
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#6e6e73] leading-relaxed mb-4">
          이 고객은 아직 VESTRA에 가입되어 있지 않습니다. 초대 링크를 보내 고객이 로그인·수락하면
          매물·의향서·등기감시 현황을 함께 관리할 수 있습니다. (링크 유효기간 7일)
        </p>

        {inviteUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#e5e5e7] bg-[#fafafa]">
              <Link2 size={14} className="text-[#86868b] shrink-0" />
              <span className="text-[12px] text-[#424245] truncate flex-1">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 transition-colors"
                style={{ background: copied ? "rgba(52,199,89,0.12)" : "#0071e3", color: copied ? "#1a7f37" : "#fff" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <p className="text-[11px] text-[#86868b]">이 링크를 문자·카카오톡 등으로 고객에게 전달하세요.</p>
          </div>
        ) : (
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-opacity"
            style={{ background: "#0071e3", opacity: inviting ? 0.6 : 1, cursor: inviting ? "not-allowed" : "pointer" }}
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {inviting ? "생성 중..." : status === "invited" ? "초대 링크 다시 생성" : "초대 링크 생성"}
          </button>
        )}

        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      </CardContent>
    </Card>
  );
}
