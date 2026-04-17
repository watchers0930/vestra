"use client";

import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Button } from "@/components/common";

interface Props {
  currentPw: string;
  setCurrentPw: (v: string) => void;
  newPw: string;
  setNewPw: (v: string) => void;
  confirmPw: string;
  setConfirmPw: (v: string) => void;
  pwMsg: { type: "success" | "error"; text: string } | null;
  pwLoading: boolean;
  handlePasswordChange: (e: React.FormEvent) => Promise<void>;
}

export function AccountTab({
  currentPw, setCurrentPw, newPw, setNewPw,
  confirmPw, setConfirmPw, pwMsg, pwLoading, handlePasswordChange,
}: Props) {
  return (
    <div className="max-w-md">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <KeyRound size={20} strokeWidth={1.5} className="text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">비밀번호 변경</h3>
            <p className="text-xs text-gray-500">관리자 계정 비밀번호를 변경합니다</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">현재 비밀번호</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          {pwMsg && (
            <p className={cn(
              "text-xs font-medium",
              pwMsg.type === "success" ? "text-emerald-600" : "text-red-500"
            )}>
              {pwMsg.text}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={pwLoading}>
            {pwLoading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
