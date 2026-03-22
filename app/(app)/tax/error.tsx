"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function TaxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <AlertCircle size={48} className="mx-auto text-red-400" />
      <h2 className="text-lg font-semibold">오류가 발생했습니다</h2>
      <p className="text-sm text-muted">
        {error.message || "세무 시뮬레이션을 불러오는 중 문제가 발생했습니다."}
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
