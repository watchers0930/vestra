"use client";

interface VestraLogoProps {
  size?: number;
  variant?: "default" | "admin" | "white";
  className?: string;
}

export function VestraLogoMark({ size = 32, variant = "default", className = "" }: VestraLogoProps) {
  const gradients = {
    default: { from: "#001466", to: "#000F4D" },
    admin: { from: "#EF4444", to: "#DC2626" },
    white: { from: "#FFFFFF", to: "#E2E8F0" },
  };
  const { from, to } = gradients[variant];
  const vColor = variant === "white" ? "#001466" : "#FFFFFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block ${className}`}
    >
      <defs>
        <linearGradient id={`shield-grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`v-grad-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={vColor} stopOpacity="1" />
          <stop offset="100%" stopColor={vColor} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* 방패 형태 - 라운드 + 하단 포인트 */}
      <path
        d="M20 2C12 2 4 4 4 4v18c0 8 7.5 13.5 16 16 8.5-2.5 16-8 16-16V4S28 2 20 2z"
        fill={`url(#shield-grad-${variant})`}
        stroke={from}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />

      {/* V 마크 - 직각 */}
      <path
        d="M12.5 13L18.5 26L20 29L21.5 26L27.5 13"
        stroke={`url(#v-grad-${variant})`}
        strokeWidth="3.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* V 안쪽 광택 라인 */}
      <path
        d="M14 14.5L20 27L26 14.5"
        stroke={vColor}
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

interface VestraLogoFullProps extends VestraLogoProps {
  showSubtitle?: boolean;
  subtitle?: string;
  version?: string;
  textClassName?: string;
}

export function VestraLogoFull({
  size = 32,
  variant = "default",
  showSubtitle = false,
  subtitle = "AI 자산관리 플랫폼",
  version,
  className = "",
  textClassName = "",
}: VestraLogoFullProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <VestraLogoMark size={size} variant={variant} />
      <div>
        <h1
          className={`font-bold tracking-widest ${textClassName}`}
          style={{ fontFamily: "var(--font-sora)" }}
        >
          VESTRA
          {version && (
            <span className="ml-1.5 text-[9px] font-normal opacity-40 align-middle">
              v{version}
            </span>
          )}
        </h1>
        {showSubtitle && (
          <p className="text-[10px] opacity-60 -mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
