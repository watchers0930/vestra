"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <AlertCircle size={48} className="mx-auto text-red-400" />
      <h2 className="text-lg font-semibold">관리자 페이지 오류</h2>
      <p className="text-sm text-muted">
        {error.message || "데이터를 불러오는 중 문제가 발생했습니다."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition-colors"
      >
        <RefreshCw size={14} />
        다시 시도
      </button>
    </div>
  );
}
