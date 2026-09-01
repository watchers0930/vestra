"use client";

import Image from "next/image";

interface VestraLogoProps {
  size?: number;
  variant?: "default" | "admin" | "white";
  className?: string;
}

export function VestraLogoMark({ size = 32, className = "" }: VestraLogoProps) {
  return (
    <Image
      src="/vestra-symbol.png"
      alt="VESTRA"
      width={size}
      height={size}
      priority
      className={`block ${className}`}
    />
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
