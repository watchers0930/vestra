import { Lightbulb, AlertTriangle, AlertOctagon, type LucideIcon } from "lucide-react";

const variants: Record<string, {
  border: string; bg: string; icon: LucideIcon;
  iconColor: string; titleColor: string; textColor: string;
}> = {
  tip: {
    border: "rgba(48,209,88,0.22)",
    bg: "rgba(48,209,88,0.04)",
    icon: Lightbulb,
    iconColor: "#30d158",
    titleColor: "#1a9e45",
    textColor: "#3c3c43",
  },
  warning: {
    border: "rgba(255,159,10,0.22)",
    bg: "rgba(255,159,10,0.05)",
    icon: AlertTriangle,
    iconColor: "#ff9f0a",
    titleColor: "#b86f00",
    textColor: "#3c3c43",
  },
  important: {
    border: "rgba(255,59,48,0.22)",
    bg: "rgba(255,59,48,0.04)",
    icon: AlertOctagon,
    iconColor: "#ff3b30",
    titleColor: "#c0392b",
    textColor: "#3c3c43",
  },
};

export default function TipBox({
  variant,
  title,
  children,
}: {
  variant: "tip" | "warning" | "important";
  title: string;
  children: React.ReactNode;
}) {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1px solid ${v.border}`,
        background: v.bg,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
        <Icon size={14} strokeWidth={1.5} style={{ color: v.iconColor, flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: v.titleColor }}>{title}</span>
      </div>
      <div style={{ fontSize: "12.5px", lineHeight: 1.65, color: v.textColor }}>{children}</div>
    </div>
  );
}
