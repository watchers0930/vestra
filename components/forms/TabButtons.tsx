import { cn } from "@/lib/utils";

interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabButtonsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function TabButtons<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabButtonsProps<T>) {
  return (
    <div className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "py-2 rounded-lg text-xs font-medium border transition-all",
            value === option.value
              ? "bg-primary text-white border-primary"
              : "bg-white text-secondary border-border hover:bg-gray-50"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
