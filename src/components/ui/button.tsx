import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "default" | "secondary" | "danger" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-[0_2px_6px_0_rgba(87,102,218,0.4)] hover:shadow-[0_4px_12px_0_rgba(87,102,218,0.5)]",
  default: "bg-primary text-white hover:bg-primary-dark shadow-[0_2px_6px_0_rgba(87,102,218,0.4)] hover:shadow-[0_4px_12px_0_rgba(87,102,218,0.5)]",
  secondary: "bg-surface text-text border border-border hover:bg-surface-hover hover:border-primary/30 shadow-sm",
  danger: "bg-danger text-white hover:bg-danger-light shadow-[0_2px_6px_0_rgba(249,59,122,0.4)]",
  destructive: "bg-danger text-white hover:bg-danger-light shadow-[0_2px_6px_0_rgba(249,59,122,0.4)]",
  ghost: "text-text-muted hover:text-text hover:bg-surface-hover",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
