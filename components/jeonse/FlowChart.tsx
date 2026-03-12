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
  blue:    { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]", line: "bg-gray-200" },
  emerald: { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]", line: "bg-gray-200" },
  amber:   { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]", line: "bg-gray-200" },
  red:     { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]", line: "bg-gray-200" },
  purple:  { bg: "bg-[#f5f5f7]", text: "text-[#1d1d1f]", line: "bg-gray-200" },
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
                <step.icon size={16} strokeWidth={1.5} className={colors.text} />
                <h4 className="font-semibold">{step.title}</h4>
              </div>
              <p className="text-sm text-secondary mb-2">{step.description}</p>
              <div className="flex flex-wrap gap-2">
                {step.duration && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-secondary">
                    <Clock size={10} strokeWidth={1.5} /> {step.duration}
                  </span>
                )}
                {step.location && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-secondary">
                    <MapPin size={10} strokeWidth={1.5} /> {step.location}
                  </span>
                )}
              </div>
              {step.subSteps && (
                <ul className="mt-2 space-y-1">
                  {step.subSteps.map((sub, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-secondary">
                      <CheckCircle2 size={12} strokeWidth={1.5} className="text-[#1d1d1f] mt-0.5 shrink-0" />
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
