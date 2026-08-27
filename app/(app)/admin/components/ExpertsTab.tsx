"use client";

import Image from "next/image";
import { CheckCircle, User, Scale, XCircle } from "lucide-react";
import { Card, Button, Badge } from "@/components/common";
import type { ExpertItem, ConfirmModalState } from "../types";
import { EXPERT_CATEGORY_LABELS } from "../constants";

interface Props {
  pending: ExpertItem[];
  setConfirmModal: (modal: ConfirmModalState | null) => void;
  handleExpertReview: (partnerId: string, action: "approve" | "reject") => Promise<void>;
}

export function ExpertsTab({ pending, setConfirmModal, handleExpertReview }: Props) {
  if (pending.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle size={40} strokeWidth={1.5} className="mx-auto text-[#1d1d1f] mb-3" />
        <p className="text-sm text-gray-500">대기 중인 전문가 가입 신청이 없습니다</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((p) => {
        const displayName = p.name || p.user?.name || "이름 없음";
        return (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {p.user?.image ? (
                  <Image src={p.user.image} alt="" width={40} height={40} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={16} strokeWidth={1.5} className="text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <Badge variant="primary" size="sm">
                      {EXPERT_CATEGORY_LABELS[p.category] ?? p.category}
                    </Badge>
                  </div>
                  {p.user?.email && <p className="text-xs text-gray-500">{p.user.email}</p>}
                  {p.firmName && <p className="text-xs text-gray-500 mt-1">소속: {p.firmName}</p>}
                  {p.licenseNo && <p className="text-xs text-gray-500 mt-0.5">자격번호: {p.licenseNo}</p>}
                  {p.bizNo && <p className="text-xs text-gray-500 mt-0.5">사업자번호: {p.bizNo}</p>}
                  {p.phone && <p className="text-xs text-gray-500 mt-0.5">연락처: {p.phone}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    신청일: {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setConfirmModal({
                    message: `${displayName} 님을 ${EXPERT_CATEGORY_LABELS[p.category] ?? p.category}(으)로 승인하시겠습니까? 승인 시 계정이 변호사 등급으로 전환되어 변호사 대시보드를 이용할 수 있습니다.`,
                    onConfirm: () => { handleExpertReview(p.id, "approve"); setConfirmModal(null); },
                  })}
                >
                  <Scale size={14} strokeWidth={1.5} className="mr-1" />
                  전문가 승인
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmModal({
                    message: `${displayName} 님의 전문가 가입 신청을 거부하시겠습니까?`,
                    onConfirm: () => { handleExpertReview(p.id, "reject"); setConfirmModal(null); },
                  })}
                >
                  <XCircle size={14} strokeWidth={1.5} className="mr-1" />
                  거부
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
