"use client";

import { useId, useState } from "react";

/**
 * A labelled number input with an optional slider. Out-of-range or non-numeric input is flagged and
 * not applied, so calculations never see invalid values.
 */
export function NumberField({
  label, value, min, max, step = 1, unit, onChange, slider = true,
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; slider?: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const n = draft === null ? value : Number(draft);
  const invalid = draft !== null && (draft.trim() === "" || !Number.isFinite(n) || n < min || n > max);
  return (
    <div className="grid content-start gap-1">
      <label htmlFor={id} className="label">{label}{unit && <span className="font-normal muted"> ({unit})</span>}</label>
      <div className="flex items-center gap-3">
        {slider && (
          <input type="range" aria-label={`${label} slider`} min={min} max={max} step={step} value={value} className="min-w-0 flex-1"
            onChange={(e) => { setDraft(null); onChange(Number(e.target.value)); }} />
        )}
        <input
          id={id}
          className="input num !w-28 text-right"
          inputMode="decimal"
          value={draft ?? String(value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-err` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      {invalid && <p id={`${id}-err`} className="tiny text-fail">Enter a number from {min.toLocaleString()} to {max.toLocaleString()}.</p>}
    </div>
  );
}
