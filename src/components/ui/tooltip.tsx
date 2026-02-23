"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // If too close to top, show below
      setPosition(rect.top < 80 ? "bottom" : "top");
    }
  }, [visible]);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-text-muted/20 text-text-muted hover:bg-primary/20 hover:text-primary transition-colors text-[10px] font-bold leading-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Informação"
        tabIndex={0}
      >
        i
      </button>
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 w-56 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none ${
            position === "top"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 left-1/2 -translate-x-1/2"
          }`}
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 ${
              position === "top" ? "-bottom-1" : "-top-1"
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
}

interface FieldLabelProps {
  label: string;
  tooltip?: string;
  htmlFor?: string;
}

export function FieldLabel({ label, tooltip, htmlFor }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center text-sm font-medium text-text">
      {label}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}
