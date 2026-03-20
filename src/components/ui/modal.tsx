"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const modalContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in"
    >
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative animate-fade-in-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-3 right-3"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </Button>

        <h2 className={`text-lg font-bold mb-4 pr-8 tracking-tight ${variantTitleColors[variant]}`}>
          {title}
        </h2>

        <div className="text-sm text-text-muted mb-6">{children}</div>

        {actions && (
          <div className="flex items-center justify-end gap-3">{actions}</div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
