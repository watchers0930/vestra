"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisLoaderProps {
  steps: string[];
  interval?: number;
}

export function AnalysisLoader({ steps, interval = 3000 }: AnalysisLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  useEffect(() => {
    if (steps.length <= 1) return;
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, interval);
    return () => clearInterval(stepTimer);
  }, [steps, interval]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-[#1d1d1f]" />

      <p className="text-sm text-[#6e6e73] min-w-[200px] text-center">
        {steps[currentStep]?.replace(/\.{0,3}$/, "")}{dots}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 w-full rounded-full bg-[#e5e5e7] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1d1d1f] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-[#6e6e73] text-center mt-1.5">
          {currentStep + 1} / {steps.length}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all duration-300",
              i < currentStep
                ? "bg-[#1d1d1f]"
                : i === currentStep
                ? "bg-[#1d1d1f] scale-125"
                : "bg-[#e5e5e7]"
            )}
          />
        ))}
      </div>
    </div>
  );
}
