import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500",
                  isCompleted && "bg-emerald-500 text-white shadow-md shadow-emerald-200",
                  isActive && "bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/10",
                  !isCompleted && !isActive && "bg-gray-100 text-gray-400 border border-gray-200"
                )}
              >
                {isCompleted ? <Check size={16} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors whitespace-nowrap",
                  isCompleted && "text-emerald-600",
                  isActive && "text-primary",
                  !isCompleted && !isActive && "text-gray-400"
                )}
              >
                {step}
              </span>
            </div>

            {/* Connecting line */}
            {i < steps.length - 1 && (
              <div className="flex-1 mx-3 mt-[-20px]">
                <div className="h-[2px] rounded-full bg-gray-200 relative overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out",
                      isCompleted ? "w-full bg-emerald-400" : "w-0 bg-primary"
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
