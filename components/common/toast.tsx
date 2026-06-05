"use client";

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  const popup = toasts.length > 0 ? (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.3s", opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      {/* 배경 딤 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} onClick={closeAll} />

      {/* 알림 패널 */}
      <div
        style={{
          position: "relative",
          width: 600,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: 400,
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
          transform: visible ? "scale(1)" : "scale(0.95)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s, opacity 0.3s",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e5e5e7" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,159,10,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={16} strokeWidth={2} color="#ff9f0a" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>새 알림</div>
              <div style={{ fontSize: 11, color: "#86868b" }}>{toasts.length}건의 알림</div>
            </div>
          </div>
          <button
            onClick={closeAll}
            style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} strokeWidth={2} color="#86868b" />
          </button>
        </div>

        {/* 알림 목록 */}
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {toasts.map((toast) => (
            <NotificationRow key={toast.id} toast={toast} onRemove={removeOne} />
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <ToastContext value={{ showToast }}>
      {children}
      {mounted && popup && createPortal(popup, document.body)}
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
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid #e5e5e7",
        cursor: toast.link ? "pointer" : "default",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9f9fb"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* 아이콘 */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        <Icon size={16} strokeWidth={2} style={{ color }} />
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d1f", lineHeight: 1.4, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "#6e6e73", lineHeight: 1.5 }}>
          {toast.message}
        </div>
        {toast.link && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 2, fontSize: 11.5, fontWeight: 600, color }}>
            <span>상세보기</span>
            <ChevronRight size={12} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* X 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        style={{ width: 24, height: 24, borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}
      >
        <X size={12} strokeWidth={2} color="#c7c7cc" />
      </button>
    </div>
  );
}
