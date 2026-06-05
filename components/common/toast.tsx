"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  link?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, link?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "error", link?: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type, link }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const router = useRouter();

  // 자동 사라짐 없음 — X 버튼으로만 닫기

  const iconMap = { error: AlertCircle, success: CheckCircle2, warning: AlertTriangle, info: Info };
  const Icon = iconMap[toast.type];
  const colors = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const handleClick = () => {
    if (toast.link) {
      onRemove(toast.id);
      router.push(toast.link);
    }
  };

  return (
    <div
      className={`flex items-start gap-2 px-5 py-4 rounded-xl border shadow-lg text-sm animate-in slide-in-from-right ${colors[toast.type]} ${toast.link ? "cursor-pointer hover:brightness-95" : ""}`}
      onClick={handleClick}
    >
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <span>{toast.message}</span>
        {toast.link && (
          <span className="block mt-1 text-xs font-medium opacity-70">상세보기 ›</span>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }} className="flex-shrink-0 opacity-50 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
