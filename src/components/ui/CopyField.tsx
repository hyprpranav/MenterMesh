"use client";

// ============================================================
// MentorMesh — CopyField (v2 — No masking, open data)
// Displays a labeled field value with a copy button.
// Used throughout student profiles for copy-first UX.
// ============================================================
import React from "react";
import { CopyButton } from "./CopyButton";

interface CopyFieldProps {
  label: string;
  value: string | undefined | null;
  masked?: boolean;      // kept for API compat but NO masking applied
  sensitive?: boolean;   // kept for API compat but NO hiding applied
  placeholder?: string;
}

export function CopyField({
  label,
  value,
  placeholder,
}: CopyFieldProps) {
  if (!value && !placeholder) return null;

  const displayValue = value || (placeholder ?? "");
  const copyValue = value || "";

  return (
    <div className="mm-copy-field">
      <span className="mm-copy-field-label">{label}</span>
      <div className="mm-copy-field-row">
        <span className="mm-copy-field-value">
          {displayValue}
        </span>
        {value && (
          <CopyButton
            value={copyValue}
            label={label}
          />
        )}
      </div>
    </div>
  );
}
