type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  success: "bg-[rgba(30,202,184,0.15)] text-[#1ecab8] dark:bg-[rgba(30,202,184,0.2)] dark:text-[#3dd6c7]",
  warning: "bg-[rgba(251,182,36,0.15)] text-[#d9a020] dark:bg-[rgba(251,182,36,0.2)] dark:text-[#fbb624]",
  danger: "bg-[rgba(249,59,122,0.15)] text-[#f93b7a] dark:bg-[rgba(249,59,122,0.2)] dark:text-[#fb6b9d]",
  info: "bg-[rgba(87,102,218,0.15)] text-[#5766da] dark:bg-[rgba(87,102,218,0.2)] dark:text-[#7b87e2]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-[#1ecab8]",
  warning: "bg-[#fbb624]",
  danger: "bg-[#f93b7a]",
  info: "bg-[#5766da]",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  pulse = false,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${pulse ? "animate-pulse" : ""}`} />
      {children}
    </span>
  );
}
