interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-surface rounded-lg border border-border p-5 shadow-[0_0_24px_0_rgba(0,0,0,0.06),0_1px_0_0_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-text tracking-tight ${className}`}>
      {children}
    </h3>
  );
}
