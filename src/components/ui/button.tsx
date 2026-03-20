import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "default" | "secondary" | "danger" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-dark hover:to-primary shadow-sm hover:shadow-md",
  default: "bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-dark hover:to-primary shadow-sm hover:shadow-md",
  secondary: "bg-surface text-text border border-border hover:bg-surface-hover hover:border-primary/30 shadow-sm",
  danger: "bg-gradient-to-r from-danger to-danger-light text-white hover:from-red-700 hover:to-danger shadow-sm hover:shadow-md",
  destructive: "bg-gradient-to-r from-danger to-danger-light text-white hover:from-red-700 hover:to-danger shadow-sm hover:shadow-md",
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
        className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
