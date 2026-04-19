import { ExternalLink } from "lucide-react";

export default function GovernmentLink({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "12px",
        background: "#f5f5f7",
        border: "1px solid rgba(0,0,0,0.06)",
        textDecoration: "none",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,113,227,0.05)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,113,227,0.20)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "#f5f5f7";
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,0,0,0.06)";
      }}
    >
      <div
        style={{
          width: "34px", height: "34px", borderRadius: "10px",
          background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <ExternalLink size={15} strokeWidth={1.5} style={{ color: "#0071e3" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>{name}</div>
        <div style={{ fontSize: "11.5px", color: "#6e6e73", marginTop: "1px" }}>{description}</div>
      </div>
      <ExternalLink size={12} strokeWidth={1.5} style={{ color: "#aeaeb2", flexShrink: 0 }} />
    </a>
  );
}
