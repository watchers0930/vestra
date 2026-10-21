import { cn } from "@/lib/utils";
import { ScoreExplainer } from "@/components/common/ScoreExplainer";
import { getGrade as getPolicyGrade } from "@/lib/risk/grade-policy";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  grade?: string;
  showLabel?: boolean;
  scoreType?: "safety" | "risk" | "feasibility" | "contract";
  /**
   * 색상 정책. "grade"면 공용 등급 정책(lib/risk/grade-policy)의 색상을 사용한다.
   * 권리분석 안전점수 전용 — 다른 모델(V-Score·사기위험 등) 고유 의미 게이지는 기본값 유지(설계 §5.1).
   */
  colorPolicy?: "default" | "grade";
}

const sizeConfig = {
  sm: { svgSize: 132, radius: 54, stroke: 8, fontSize: "text-2xl", gradeSize: "text-xs" },
  md: { svgSize: 136, radius: 54, stroke: 8, fontSize: "text-2xl", gradeSize: "text-xs" },
  lg: { svgSize: 180, radius: 70, stroke: 10, fontSize: "text-3xl", gradeSize: "text-sm" },
};

/** 공용 등급 정책 색상명 → hex (게이지 stroke/텍스트용) */
const GRADE_HEX: Record<string, string> = {
  emerald: "#10b981",
  blue: "#3b82f6",
  amber: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
};

function getColor(score: number, colorPolicy: "default" | "grade"): string {
  if (colorPolicy === "grade") {
    return GRADE_HEX[getPolicyGrade(score).color] ?? "#6e6e73";
  }
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

export function ScoreGauge({
  score,
  size = "md",
  label = "안전 점수",
  grade,
  showLabel = true,
  scoreType,
  colorPolicy = "default",
}: ScoreGaugeProps) {
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const progress = (score / 100) * circumference;
  const color = getColor(score, colorPolicy);
  const displayGrade = grade || getGrade(score);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={config.svgSize}
        height={config.svgSize}
        viewBox={`0 0 ${config.svgSize} ${config.svgSize}`}
        role="img"
        aria-label={`${label}: ${score}점 (등급 ${displayGrade})`}
      >
        {/* Background circle */}
        <circle
          cx={config.svgSize / 2}
          cy={config.svgSize / 2}
          r={config.radius}
          fill="none"
          stroke="#e5e5e7"
          strokeWidth={config.stroke}
        />
        {/* Progress circle */}
        <circle
          cx={config.svgSize / 2}
          cy={config.svgSize / 2}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${config.svgSize / 2} ${config.svgSize / 2})`}
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x={config.svgSize / 2}
          y={config.svgSize / 2 - 8}
          textAnchor="middle"
          className={cn(config.fontSize, "font-bold")}
          fill={color}
          fontSize={size === "lg" ? 36 : 28}
          fontWeight="bold"
        >
          {score}
        </text>
        {/* Grade text */}
        <text
          x={config.svgSize / 2}
          y={config.svgSize / 2 + 16}
          textAnchor="middle"
          fill="#6e6e73"
          fontSize={size === "lg" ? 14 : 12}
        >
          {displayGrade}
        </text>
      </svg>
      {showLabel && (
        <p className="text-xs text-muted mt-1">{label}</p>
      )}
      {scoreType && (
        <ScoreExplainer score={score} type={scoreType} />
      )}
    </div>
  );
}
