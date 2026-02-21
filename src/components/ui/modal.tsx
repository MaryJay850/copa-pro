"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "default" | "danger" | "warning";
}

const variantTitleColors: Record<string, string> = {
  default: "text-text",
  danger: "text-red-600",
  warning: "text-amber-600",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  variant = "default",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 relative">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-3 right-3"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Title */}
        <h2 className={`text-lg font-bold mb-4 pr-8 ${variantTitleColors[variant]}`}>
          {title}
        </h2>

        {/* Body */}
        <div className="text-sm text-text-muted mb-6">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}
