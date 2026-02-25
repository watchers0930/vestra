import { formatKRW } from "@/lib/utils";

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue = formatKRW,
}: SliderInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="text-right text-sm font-semibold text-primary mt-1">
        {formatValue(value)}
      </div>
    </div>
  );
}
