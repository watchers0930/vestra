"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

interface ErrorRetryProps {
  message: string;
  detail?: string;
  onRetry: () => void;
}

export function ErrorRetry({ message, detail, onRetry }: ErrorRetryProps) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} strokeWidth={1.5} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700">{message}</p>
          {detail && (
            <p className="text-xs text-red-600 mt-1">{detail}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={onRetry}
            >
              다시 시도
            </Button>
            <button
              onClick={onRetry}
              className="text-xs text-red-600 hover:text-red-700 underline underline-offset-2 transition-colors"
            >
              다른 방법 시도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
