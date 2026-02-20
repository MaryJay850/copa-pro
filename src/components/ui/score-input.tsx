"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ScoreInputProps {
  label: string;
  valueA: number | null;
  valueB: number | null;
  onChangeA: (v: number | null) => void;
  onChangeB: (v: number | null) => void;
  disabled?: boolean;
}

export function ScoreInput({ label, valueA, valueB, onChangeA, onChangeB, disabled }: ScoreInputProps) {
  const refB = useRef<HTMLInputElement>(null);

  const handleChange = (setter: (v: number | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setter(null);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 7) {
      setter(num);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "Tab") {
      if (e.key === "-") {
        e.preventDefault();
        refB.current?.focus();
        refB.current?.select();
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-muted w-8 shrink-0">{label}</span>
      <input
        type="number"
        min={0}
        max={7}
        value={valueA ?? ""}
        onChange={handleChange(onChangeA)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-10 h-8 text-center text-sm border border-border rounded-md bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:bg-gray-50"
        placeholder="-"
      />
      <span className="text-text-muted text-xs">-</span>
      <input
        ref={refB}
        type="number"
        min={0}
        max={7}
        value={valueB ?? ""}
        onChange={handleChange(onChangeB)}
        disabled={disabled}
        className="w-10 h-8 text-center text-sm border border-border rounded-md bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:bg-gray-50"
        placeholder="-"
      />
    </div>
  );
}
