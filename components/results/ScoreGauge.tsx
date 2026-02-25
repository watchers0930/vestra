import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  grade?: string;
  showLabel?: boolean;
}

const sizeConfig = {
  sm: { svgSize: 132, radius: 54, stroke: 8, fontSize: "text-2xl", gradeSize: "text-xs" },
  md: { svgSize: 136, radius: 54, stroke: 8, fontSize: "text-2xl", gradeSize: "text-xs" },
  lg: { svgSize: 180, radius: 70, stroke: 10, fontSize: "text-3xl", gradeSize: "text-sm" },
};

function getColor(score: number): string {
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
}: ScoreGaugeProps) {
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const progress = (score / 100) * circumference;
  const color = getColor(score);
  const displayGrade = grade || getGrade(score);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={config.svgSize}
        height={config.svgSize}
        viewBox={`0 0 ${config.svgSize} ${config.svgSize}`}
      >
        {/* Background circle */}
        <circle
          cx={config.svgSize / 2}
          cy={config.svgSize / 2}
          r={config.radius}
          fill="none"
          stroke="#f1f5f9"
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
          fill="#64748b"
          fontSize={size === "lg" ? 14 : 12}
        >
          {displayGrade}
        </text>
      </svg>
      {showLabel && (
        <p className="text-xs text-muted mt-1">{label}</p>
      )}
    </div>
  );
}
