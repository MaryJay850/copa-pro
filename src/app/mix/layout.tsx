import { Toaster } from "sonner";

export default function MixLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-alt text-text">
      {children}
      <Toaster position="top-center" richColors />
    </div>
  );
}
