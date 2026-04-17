"use client";

import { Button } from "@/components/common";

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-sm text-[#1d1d1f] font-medium mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>취소</Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>확인</Button>
        </div>
      </div>
    </div>
  );
}
