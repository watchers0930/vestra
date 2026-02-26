"use client";

import { type LucideIcon, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowStepData {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "blue" | "emerald" | "amber" | "red" | "purple";
  subSteps?: string[];
  duration?: string;
  location?: string;
}

const colorMap = {
  blue:    { bg: "bg-blue-100",    text: "text-blue-700",    line: "bg-blue-200" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", line: "bg-emerald-200" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-700",   line: "bg-amber-200" },
  red:     { bg: "bg-red-100",     text: "text-red-700",     line: "bg-red-200" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-700",  line: "bg-purple-200" },
};

export default function FlowChart({ steps, className }: { steps: FlowStepData[]; className?: string }) {
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const colors = colorMap[step.color];
        return (
          <div key={i} className="flex gap-4">
            {/* Left: circle + connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                colors.bg, colors.text
              )}>
                {step.number}
              </div>
              {!isLast && <div className={cn("w-0.5 flex-1 min-h-[2rem]", colors.line)} />}
            </div>

            {/* Right: content */}
            <div className={cn("pt-1.5", isLast ? "pb-2" : "pb-8")}>
              <div className="flex items-center gap-2 mb-1">
                <step.icon size={16} className={colors.text} />
                <h4 className="font-semibold">{step.title}</h4>
              </div>
              <p className="text-sm text-secondary mb-2">{step.description}</p>
              <div className="flex flex-wrap gap-2">
                {step.duration && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-secondary">
                    <Clock size={10} /> {step.duration}
                  </span>
                )}
                {step.location && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-secondary">
                    <MapPin size={10} /> {step.location}
                  </span>
                )}
              </div>
              {step.subSteps && (
                <ul className="mt-2 space-y-1">
                  {step.subSteps.map((sub, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-secondary">
                      <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
