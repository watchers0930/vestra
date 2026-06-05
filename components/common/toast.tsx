"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronRight, Bell } from "lucide-react";

type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: number;
  title?: string;
  message: string;
  type: ToastType;
  link?: string;
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
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((message: string, type: ToastType = "error", link?: string, title?: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, title, message, type, link }]);
    setVisible(true);
  }, []);

  const removeOne = useCallback((id: number) => {
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setVisible(false);
    setTimeout(() => setToasts([]), 300);
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}

      {/* 팝업 오버레이 */}
      {toasts.length > 0 && (
        <div
          className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {/* 배경 딤 */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={closeAll} />

          {/* 알림 패널 */}
          <div
            className={`relative w-[600px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl transition-all duration-300 ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            style={{ maxHeight: 400 }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e7]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff9f0a]/10">
                  <Bell size={16} strokeWidth={2} className="text-[#ff9f0a]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#1d1d1f]">새 알림</h2>
                  <p className="text-[11px] text-[#86868b]">{toasts.length}건의 알림</p>
                </div>
              </div>
              <button
                onClick={closeAll}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#f5f5f7]"
              >
                <X size={16} strokeWidth={2} className="text-[#86868b]" />
              </button>
            </div>

            {/* 알림 목록 (스크롤) */}
            <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
              {toasts.map((toast) => (
                <NotificationRow key={toast.id} toast={toast} onRemove={removeOne} />
              ))}
            </div>
          </div>
        </div>
      )}
    </ToastContext>
  );
}

const iconMap = { error: AlertCircle, success: CheckCircle2, warning: AlertTriangle, info: Info };
const dotColor: Record<ToastType, string> = {
  error: "#ff3b30",
  success: "#30d158",
  warning: "#ff9f0a",
  info: "#0071e3",
};

function NotificationRow({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const router = useRouter();
  const Icon = iconMap[toast.type];
  const color = dotColor[toast.type];

  const handleClick = () => {
    if (toast.link) {
      onRemove(toast.id);
      router.push(toast.link);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 px-6 py-4 border-b border-[#f0f0f2] last:border-0 transition-colors hover:bg-[#f9f9fb] ${toast.link ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      {/* 아이콘 */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl mt-0.5"
        style={{ background: `${color}12` }}
      >
        <Icon size={16} strokeWidth={2} style={{ color }} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-[13px] font-bold text-[#1d1d1f] leading-snug mb-0.5 truncate">
            {toast.title}
          </div>
        )}
        <div className="text-[12.5px] text-[#6e6e73] leading-relaxed">
          {toast.message}
        </div>
        {toast.link && (
          <div className="mt-1.5 flex items-center gap-0.5 text-[11.5px] font-semibold" style={{ color }}>
            <span>상세보기</span>
            <ChevronRight size={12} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* X 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 mt-0.5"
      >
        <X size={12} strokeWidth={2} className="text-[#c7c7cc]" />
      </button>
    </div>
  );
}
