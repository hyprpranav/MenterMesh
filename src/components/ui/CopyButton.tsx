"use client";

// ============================================================
// MentorMesh — CopyButton v2
// ============================================================
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  value?: string;
  text?: string;
  className?: string;
  label?: string;
}

export function CopyButton({ value, text, className, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const targetValue = value ?? text ?? "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!targetValue) return;
    try {
      await navigator.clipboard.writeText(targetValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = targetValue;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn("mm-copy-btn", copied && "copied", className)}
      title={`Copy ${label || "value"}`}
      aria-label={copied ? "Copied!" : `Copy ${label || "value"}`}
    >
      {copied ? (
        <>
          <Check size={12} />
          Copied
        </>
      ) : (
        <>
          <Copy size={12} />
          Copy
        </>
      )}
    </button>
  );
}
