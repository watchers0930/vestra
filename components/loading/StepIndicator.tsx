import { cn } from "@/lib/utils";
import { CheckCircle, Loader2 } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div
            key={step}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all text-sm",
              isCompleted && "bg-emerald-50 text-emerald-700",
              isActive && "bg-blue-50 text-blue-700 font-medium",
              isPending && "bg-gray-50 text-gray-400"
            )}
          >
            {isCompleted ? (
              <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
            ) : isActive ? (
              <Loader2 size={18} className="animate-spin text-blue-500 flex-shrink-0" />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" />
            )}
            {step}
          </div>
        );
      })}
    </div>
  );
}
