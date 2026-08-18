"use client";

// ============================================================
// MentorMesh — CopyField (NEW)
// Displays a labeled field value with a copy button.
// Used throughout student profiles for copy-first UX.
// ============================================================
import React from "react";
import { CopyButton } from "./CopyButton";

interface CopyFieldProps {
  label: string;
  value: string | undefined | null;
  masked?: boolean;      // e.g. Aadhaar masking
  sensitive?: boolean;   // Hidden entirely if no access
  placeholder?: string;
}

function maskAadhaar(value: string): string {
  const digits = value.replace(/\s/g, "");
  if (digits.length <= 4) return value;
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export function CopyField({
  label,
  value,
  masked = false,
  sensitive = false,
  placeholder,
}: CopyFieldProps) {
  if (sensitive) return null;
  if (!value && !placeholder) return null;

  const displayValue = value
    ? (masked ? maskAadhaar(value) : value)
    : (placeholder ?? "");

  const copyValue = value
    ? (masked ? `(masked)` : value)
    : "";

  return (
    <div className="mm-copy-field">
      <span className="mm-copy-field-label">{label}</span>
      <div className="mm-copy-field-row">
        <span className="mm-copy-field-value">
          {displayValue}
        </span>
        {value && (
          <CopyButton
            value={masked ? `Aadhaar: ${copyValue}` : copyValue}
            label={label}
          />
        )}
      </div>
    </div>
  );
}
