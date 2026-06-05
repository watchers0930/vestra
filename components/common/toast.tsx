"use client";

import { useState, useCallback, createContext, useContext, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle, ChevronRight } from "lucide-react";

type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: number;
  title?: string;
  message: string;
  type: ToastType;
  link?: string;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, link?: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "error", link?: string, title?: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, title, message, type, link }]);
  }, []);

  const remove = useCallback((id: number) => {
    // 먼저 exit 애니메이션 시작
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // 애니메이션 후 실제 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-0 w-[380px] max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const router = useRouter();

  const iconMap = { error: AlertCircle, success: CheckCircle2, warning: AlertTriangle, info: Info };
  const Icon = iconMap[toast.type];

  const styles: Record<ToastType, { bg: string; border: string; iconColor: string; titleColor: string }> = {
    error: { bg: "#fff5f5", border: "rgba(255,59,48,0.2)", iconColor: "#ff3b30", titleColor: "#c0392b" },
    success: { bg: "#f0fdf4", border: "rgba(48,209,88,0.2)", iconColor: "#30d158", titleColor: "#1a9e45" },
    warning: { bg: "#fffbeb", border: "rgba(255,159,10,0.25)", iconColor: "#ff9f0a", titleColor: "#b86f00" },
    info: { bg: "#eff6ff", border: "rgba(0,113,227,0.15)", iconColor: "#0071e3", titleColor: "#0058b0" },
  };
  const s = styles[toast.type];

  const handleClick = () => {
    if (toast.link) {
      onRemove(toast.id);
      router.push(toast.link);
    }
  };

  return (
    <div
      className={`${toast.exiting ? "toast-exit" : "toast-enter"} ${toast.link ? "cursor-pointer" : ""}`}
      style={{ marginBottom: 8 }}
      onClick={handleClick}
    >
      <div
        className="rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-xl"
        style={{
          background: s.bg,
          border: `1.5px solid ${s.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* 상단 아이콘 바 */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: `${s.iconColor}15` }}
            >
              <Icon size={15} strokeWidth={2} style={{ color: s.iconColor }} />
            </div>
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: s.iconColor }}>
              {toast.type === "warning" ? "모니터링 알림" : toast.type === "error" ? "오류" : toast.type === "success" ? "완료" : "알림"}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <X size={13} strokeWidth={2} className="text-[#86868b]" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-4 pt-2 pb-3.5">
          {toast.title && (
            <div className="text-[13px] font-bold leading-snug mb-1" style={{ color: s.titleColor }}>
              {toast.title}
            </div>
          )}
          <div className="text-[12.5px] leading-relaxed text-[#1d1d1f]">
            {toast.message}
          </div>
          {toast.link && (
            <div
              className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold"
              style={{ color: s.iconColor }}
            >
              <span>상세보기</span>
              <ChevronRight size={12} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
