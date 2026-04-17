"use client";

import { CheckCircle, User, Building2, Crown, XCircle } from "lucide-react";
import { Card, Button } from "@/components/common";
import type { UserItem, ConfirmModalState } from "../types";

interface Props {
  pending: UserItem[];
  setConfirmModal: (modal: ConfirmModalState | null) => void;
  handleVerify: (userId: string, action: "approve" | "reject", role?: string) => Promise<void>;
}

export function VerificationsTab({ pending, setConfirmModal, handleVerify }: Props) {
  if (pending.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle size={40} strokeWidth={1.5} className="mx-auto text-[#1d1d1f] mb-3" />
        <p className="text-sm text-gray-500">대기 중인 인증 신청이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((user) => (
        <Card key={user.id} className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={16} strokeWidth={1.5} className="text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{user.name || "이름 없음"}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                {user.businessNumber && (
                  <p className="text-xs text-gray-500 mt-1">사업자번호: {user.businessNumber}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  신청일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmModal({
                  message: `${user.name || user.email} 회원을 기업으로 승인하시겠습니까?`,
                  onConfirm: () => { handleVerify(user.id, "approve", "BUSINESS"); setConfirmModal(null); },
                })}
              >
                <Building2 size={14} strokeWidth={1.5} className="mr-1" />
                기업 승인
              </Button>
              <Button
                variant="amber"
                size="sm"
                onClick={() => setConfirmModal({
                  message: `${user.name || user.email} 회원을 부동산으로 승인하시겠습니까?`,
                  onConfirm: () => { handleVerify(user.id, "approve", "REALESTATE"); setConfirmModal(null); },
                })}
              >
                <Crown size={14} strokeWidth={1.5} className="mr-1" />
                부동산 승인
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmModal({
                  message: `${user.name || user.email} 회원의 인증 요청을 거부하시겠습니까?`,
                  onConfirm: () => { handleVerify(user.id, "reject"); setConfirmModal(null); },
                })}
              >
                <XCircle size={14} strokeWidth={1.5} className="mr-1" />
                거부
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
