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
  ...props
}: FormInputProps) {
  return (
    <div className={wrapperClassName}>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
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
  ...props
}: TextAreaInputProps) {
  return (
    <div className={wrapperClassName}>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <textarea
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
