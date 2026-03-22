import { useId } from "react";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  className?: string;
  wrapperClassName?: string;
}

export function FormInput({
  label,
  className,
  wrapperClassName,
  id,
  ...props
}: FormInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        id={inputId}
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
          className
        )}
        {...props}
      />
    </div>
  );
}

interface TextAreaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  className?: string;
  wrapperClassName?: string;
}

export function TextAreaInput({
  label,
  className,
  wrapperClassName,
  id,
  ...props
}: TextAreaInputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className="block text-sm font-medium mb-1.5">{label}</label>
      <textarea
        id={inputId}
        className={cn(
          "w-full px-3 py-2 rounded-lg border border-border text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
          "resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
}
