import { InputHTMLAttributes, forwardRef } from "react";
import { Tooltip } from "./tooltip";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  tooltip?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, tooltip, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="flex items-center text-sm font-semibold text-text">
            {label}
            {tooltip && <Tooltip text={tooltip} />}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 ${error ? "border-danger focus:border-danger focus:ring-danger/20" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
